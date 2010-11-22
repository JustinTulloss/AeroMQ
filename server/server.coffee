util = require "util"
zeromq = require "zeromq"
assert = require "assert"
redis = require "redis-node"
uuid = require "uuid"
http = require "http"
_ = (require "underscore")._


CONTROLLER_ADDRESS = "tcp://0.0.0.0:5555"
Q_PREFIX = '__q'

class Server extends process.EventEmitter
    # an object storing queue -> list of available workers
    workers = {}

    constructor: (config) ->
        @redis = redis.createClient()

        pusher = zeromq.createSocket 'push'
        controller = zeromq.createSocket 'pub'
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
                queue = Q_PREFIX + match[1]
                @redis.lrange queue, 0, -1, (err, messages) ->
                    respond response, {
                        success: true,
                        message: messages
                    }

            POST: (match, response, bag) =>
                queue = Q_PREFIX + match[1]
                id = uuid.generate()
                job = JSON.stringify {
                    uuid: id,
                    message: bag
                }

                @redis.transaction =>
                    @redis.set id, job
                    @redis.lpush queue, id, (err, status) ->
                        respond response, { success: status, uuid: id }

            DELETE: (match, response) =>
                queue = Q_PREFIX + match[1]
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
            message = ""
            request.on 'data', (data) ->
                message += data
            request.on 'end', ->
                _.each routes, (methods, route) ->
                    match = request.url.match(new RegExp(route))
                    if match and methods[request.method]
                        found = true
                        methods[request.method](match, response, message)
                        _.breakLoop()

                if not found
                    return404(response)

        port = config.port or 7000
        host = config.host or "localhost"

        listener.listen port, host, (err) =>
            if err
                throw err
            @emit('started', host, port)

        @redis.on 'close', (in_error) =>
            if in_error
                util.puts "Connection to redis failed, please make sure the server is running."
                process.exit -1

exports.Server = Server
exports.createServer = (config) ->
    return new Server(config)
