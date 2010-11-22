util = require "util"
zeromq = require "zeromq"
assert = require "assert"
redis = require "redis-node"
uuidFactory = require "uuid"
http = require "http"
_ = (require "underscore")._


CONTROLLER_ADDRESS = "tcp://0.0.0.0:5555"
ZSERVER_ADDRESS = "tcp://0.0.0.0:5556"

DEFAULT_PORT = 7000
DEFAULT_HOST = "localhost"

class Server extends process.EventEmitter

    constructor: (config) ->

        @redis = redis.createClient() # redis client

        pusher = zeromq.createSocket 'xrep'
        controller = zeromq.createSocket 'pub'

        # an object storing queue -> list of available workers
        workers = {}

        workerCommands = {
            ready: (address, message) =>
                queues = message.queues
                for q in queues
                    if not workers[q]
                        workers[q] = []
                    workers[q].push address
                distributeJobs(queues)

            done: (address, message, cb) =>
                # after we're done, save the time that it finished and the
                # result and get on with life
                uuid = message.uuid
                @getJob uuid, (job) =>
                    job.done = Date.now()
                    job.result = message.result
                    @setJob uuid, job
                    #XXX: anything else?
        }

        distributeJobs = (queues...) =>
            _.each queues, (q) =>
                @redis.lpop q, (err, jobId) =>
                    if jobId
                        if workers[q] and workers[q].length
                            worker = workers[q].pop()
                            @redis.get jobId, (err, jsonJob) ->
                                pusher.send worker, "", q, jsonJob
                        else
                            # nobody's ready, back in the front of the line
                            @redis.lpush q, jobId

        routes = {}
        route = (regEx, actions) ->
            routes[regEx] = actions

        return404 = (response) ->
            response.writeHead 404, "Resource not found."
            response.end()

        controller.bind CONTROLLER_ADDRESS, (err) ->
            if err
                throw err

        respond = (response, obj) ->
            body = JSON.stringify obj
            response.writeHead 200, {
                'Content-Length': body.length,
                'Content-Type': 'application/json'
            }
            response.end body

        route "\/queue\/(.+?)\/?$", {
            GET: (match, response) =>
                queue = match[1]
                @redis.lrange queue, 0, -1, (err, messages) ->
                    respond response, {
                        success: true,
                        message: messages
                    }

            POST: (match, response, bag) =>
                queue = match[1]
                id = uuidFactory.generate()
                job = JSON.stringify {
                    uuid: id,
                    message: bag
                }

                @redis.transaction =>
                    @redis.set id, job
                    @redis.rpush queue, id, (err, status) ->
                        respond response, { success: status, uuid: id }
                        distributeJobs(queue)

            DELETE: (match, response) =>
                queue = match[1]
                @redis.del queue, (err, status) ->
                    respond response, {
                        success: status,
                    }
        }

        route "\/job\/(.+?)\/?$", {
            GET: (match, response) =>
                @redis.get match[1], (err, job) ->
                    respond response, job
        }

        listener = http.createServer (request, response) =>
            found = false
            body = ""
            request.on 'data', (data) ->
                body += data
            request.on 'end', ->
                _.each routes, (methods, route) ->
                    match = request.url.match(new RegExp(route))
                    if match and methods[request.method]
                        found = true
                        methods[request.method](match, response, body)
                        _.breakLoop()

                if not found
                    return404(response)

        port = config.port or DEFAULT_PORT
        host = config.host or DEFAULT_HOST

        listener.listen port, host, (err) =>
            if err
                throw err
            @emit('started', host, port)

        pusher.bind config.zserverAddress or ZSERVER_ADDRESS, (err) ->
            if err
                throw err
            pusher.on 'message', (envelope, blank, data) ->
                message = JSON.parse data
                handler = workerCommands[message.command]
                if handler
                    handler envelope, message

        @redis.on 'close', (in_error) =>
            if in_error
                util.puts "Connection to redis failed,
                    please make sure the server is running."
                process.exit -1

    getJob: (uuid, cb) ->
        @redis.get uuid, (err, jsonJob) ->
            if cb
                cb JSON.parse(jsonJob)

    setJob: (uuid, job, cb) ->
        @redis.set uuid, JSON.stringify(job), (args...) ->
            if cb
                cb args...

exports.Server = Server
exports.createServer = (config) ->
    return new Server(config)
