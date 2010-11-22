zeromq = require "zeromq"
util = require "util"

class Client extends EventEmitter
    constructor: (address, queues) ->
        @socket = zeromq.createSocket 'req'
        @socket.connect address

        # tell the server what tasks we're interested in
        @socket.send JSON.stringify queues

        @socket.on 'message', (message) =>
            try
                job = JSON.parse message
            catch e
                @emit 'badJob', message, e
                return

            @emit job.queue, job.message

exports.Client = Client
exports.createClient = (args...) ->
    return new Client args...
