/*global require process exports */

var util = require("util"),
    zeromq = require("zeromq"),
    assert = require("assert"),
    redis = require("redis-node"),
    uuid = require("uuid"),
    http = require("http"),
    _ = require("underscore")._;

var id = {
    name: 'AeroMQ',
    version: 0.1
};

var CONTROLLER_ADDRESS = "tcp://0.0.0.0:5555";

var subscriber_queues = {};
var redisC; // the connection to redis

function c(config) {
    var self = this;
    redisC= new redis.createClient();

    var pusher = zeromq.createSocket('push');
    var controller = zeromq.createSocket('pub');
    var routes = {};

    function addRoute(regEx, actions) {
        routes[regEx] = actions;
    }

    function return404(response) {
        var message = 
        response.writeHead(404, "Resource not found.");
        response.end();
    }

    controller.bind(CONTROLLER_ADDRESS, function(err) {
        if (err) {
            throw err;
        }
    });

    function respond(response, obj) {
        var body = JSON.stringify(obj);
        response.writeHead(200, {
            'Content-Length': body.length,
            'Content-Type': 'application/json'
        });
        response.end(body);
    }

    var commands = {
        /* purge - delete's all tasks waiting to be worked on from
         * a particular queue.
         */
        purge: function(response, bag) {
            redisC.del(bag.queue, function(err, status) {
                respond(response, {
                    success: status,
                    id: bag.id
                });
            });
        },
        /* publish - put a new job into a particular queue
         */
        publish: function(response, bag) {
            var id = uuid.generate();
            var job = JSON.stringify({
                uuid: id,
                started: Date.now(),
                message: bag.message
            });
            redisC.lpush(bag.queue, job, function(err, status) {
                respond(response, {success: status, uuid: id});
                // Actually send this task out to be worked on
                pusher.send(job);
            });
        },
        /* monitor - get a list of jobs for a particular queue
         */
        monitor: function(response, bag) {
            redisC.lrange(bag.queue, 0, -1, function(err, messages) {
                respond(response, {
                    success: true,
                    message: messages
                });
            });
        }
    };

    addRoute("\/queue\/(.+?)\/?$", {
        GET: function(match, request, response) {
            var queue = match[1];
            respond(response, {});
        },
        POST: function(match, request, response) {
            var queue = match[1];
            var message = "";
            request.on('data', function(chunk) {
                message += chunk;
            });
            request.on('end', function() {
                var bag;
                try {
                    bag = JSON.parse(message);
                    bag.queue = queue;
                }
                catch(e) {
                    respond(response, {
                        success: false,
                        error: {
                            message: e.message,
                            type: e.type
                        }
                    });
                    return;
                }

                if (!bag.command) {
                    respond(response, {
                        success: false,
                        error: {
                            message: "Malformed request"
                        }
                    });
                }

                var handler = commands[bag.command];
                if (handler) {
                    handler(response, bag);
                }
                else {
                    respond(response, {
                        success: false,
                        error: {
                            message: "Unknown command"
                        }
                    });
                    return;
                }
            });
        }
    });

    var listener = http.createServer(function(request, response) {
        var found = false;
        _.each(routes, function(methods, route) {
            var match = request.url.match(new RegExp(route));
            if (match && methods[request.method]) {
                found = true;
                methods[request.method](match, request, response);
                _.breakLoop();
            }
        });
        if (!found) {
            return404(response);
        }
    });

    var port = config.port || 7000;
    var host = config.host || "localhost";

    listener.listen(port, host, function(err) {
        if (err) {
            throw err;
        }
        self.emit('started', host, port);
    });

    redisC.on('close', function(in_error) {
        if (in_error) {
            util.puts("Connection to redis failed, please make sure the server is running.");
            process.exit(-1);
        }
    });
}

c.prototype = new process.EventEmitter();
c.prototype.stop = function() {
    var queue, subscriber;
    for (queue in subscriber_queues) {
        if (subscriber_queues.hasOwnProperty(queue)) {
            for (subscriber in subscriber_queues[queue]) {
                if (subscriber_queues[queue].hasOwnProperty(subscriber)) {
                    subscriber_queues[queue][subscriber].close();
                    delete subscriber_queues[queue][subscriber];
                }
            }
        }
    }
    redisC.close();
};

exports.Server = c;
exports.createServer = function(config) {
    return new c(config);
};
