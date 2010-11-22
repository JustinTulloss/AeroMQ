zeromq = require "zeromq"
util = require "util"
assert = require "assert"

ZSERVER_ADDRESS = "tcp://0.0.0.0:5556"

class Client extends process.EventEmitter
    constructor: (@queues, address=ZSERVER_ADDRESS) ->
        @socket = zeromq.createSocket 'req'
        @socket.connect address

        @socket.on 'message', (message) =>
            try
                job = JSON.parse message
            catch e
                @emit 'badJob', message, e
                return

            @emit job.queue, job.uuid, job.message

    ready: ->
        # tell the server what tasks we're interested in
        @socket.send JSON.stringify {
            command: 'ready'
            queues: queues
        }

    done: (uuid) ->
        @socket.send JSON.stringify {
            command: 'done'
            job: job
        }

exports.Client = Client
exports.createClient = (args...) ->
    return new Client args...
