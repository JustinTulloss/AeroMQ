var tcp = require("tcp"),
    sys = require("sys"),
    redisclient = require("redisclient");

var id = {
    name: 'AeroMQ',
    version: 0.1
};

function format_message(obj) {
    return JSON.stringify(obj) + "\r\n"
}

var subscribers = new process.EventEmitter();

var redis = new redisclient.Client();

redis.connect(function() {
    var server = tcp.createServer(function(socket) {
        function respond(obj) {
            socket.send(format_message(obj));
        }

        socket.setEncoding("utf8");
        socket.addListener("connect", function() {
            respond(id);
        });
        socket.addListener("eof", function() {
            respond({success: true, message: "goodbye"});
            socket.close();
        });
    });

    server.addListener('connection', function(client) {
        function respond(obj) {
            client.send(format_message(obj));
        }

        client.addListener('receive', function(raw_data) {
            raw_data.split('\r\n').forEach(function(data) {
                var subscriber_list;
                if (!data) return;
                try {
                    action = JSON.parse(data);
                }
                catch(e) {
                    respond({
                        success: false,
                        error: {
                            message: e.message,
                            type: e.type
                        }
                    });
                    return;
                }
                // TODO assert message.command and message.queue
                switch (action.command.toLowerCase()) {
                    case 'purge':
                        redis.del(action.queue);
                        break;
                    case 'subscribe':
                        // Subscription status is maintained through your connection.
                        // So, we set up a handler in case you disappear and put you
                        // in the queue for the message you want. We don't respond
                        // until there is a 'publish' message for your subscription.
                        subscriber_list = subscribers[action.queue];
                        if (subscriber_list) {
                            subscriber_list.unshift(client);
                        }
                        else {
                            subscribers[action.queue] = [client];
                            subscriber_list = subscribers[action.queue];
                        }
                        client.addListener('eof', function() { client.close() });
                        client.addListener('close', function() {
                            var i;
                            var len = subscriber_list.length;
                            for (i = 0; i < len; i++) {
                                if (subscriber_list[i] === client) {
                                    delete subscriber_list[i];
                                    break;
                                }
                            }
                            sys.puts("subscriber " + client.remoteAddress + " removed");
                        });
                        subscribers.emit('bringPeopleTogether', action.queue);
                        break;
                    case 'publish':
                        redis.lpush(action.queue, action.message).addCallback(function(reply) {
                            respond({success: reply});
                            subscribers.emit('bringPeopleTogether', action.queue);
                        });
                        break;
                    case 'monitor':
                        redis.lrange(action.queue, 0, -1).addCallback(function(messages) {
                            respond({success: true, messages: messages});
                        });
                        break;
                }
            });
        });
    })

    var port = 7000;
    var host = "localhost";
    server.listen(port, host);
    sys.puts("AeroMQ started on " + host + ":" + port);
});

redis.addListener('close', function(in_error) {
    if (in_error) {
        sys.puts("Connection to Redis failed, please make sure the server is running.");
        process.exit(1);
    }
});

subscribers.addListener('bringPeopleTogether', function(queue) {
    // We got new data! How exciting! If we have a subscriber, pull
    // the data out of the database. If the subscriber hasn't been serviced
    // by the time we get the data, send it off and remove the subscriber
    // from the subscriber list. Otherwise, put the data back on the queue.
    if (subscribers[queue]) {
        redis.rpop(queue).addCallback(function(message) {
            var subscriber, response;
            if (message) {
                if (subscribers[queue].length) {
                    response = {success: true, message: message}
                    subscriber = subscribers[queue].pop();
                    subscriber.send(JSON.stringify(response)+'\r\n'); 
                    subscriber.close();
                }
                else {
                    redis.rpush(queue, message);
                }
            }
        });
    }
});
