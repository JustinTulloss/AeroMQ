zeromq = require "zeromq"
util = require "util"
assert = require "assert"

class Client extends EventEmitter
    constructor: (address, queues) ->
        @socket = zeromq.createSocket 'req'
        @socket.connect address

        # tell the server what tasks we're interested in
        @socket.send JSON.stringify {
            command: 'ready'
            queues: queues
        }

        @socket.on 'message', (message) =>
            try
                job = JSON.parse message
            catch e
                @emit 'badJob', message, e
                return

            @emit job.queue, job.uuid, job.message

    done: (uuid) ->
        @socket.send JSON.stringify {
            command: 'done'
            job: job
        }

exports.Client = Client
exports.createClient = (args...) ->
    return new Client args...
