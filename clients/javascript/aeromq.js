var tcp = require('tcp');

var tcp = require("tcp"),
    sys = require("sys");


function format_message(obj) {
    return JSON.stringify(obj) + "\r\n";
}

var get_message_id = (function(){
    var message_id = 0;
    return function() {
        return message_id++;
    }
})();

var pending = {};

function get_new_promise() {
    var promise = new process.Promise();
    var id = get_message_id();
    pending[id] = promise;
    promise.id = id;
    return promise;
}

function send_bag(connection, bag) {
    var promise = get_new_promise();
    bag.id = promise.id;
    connection.send(format_message(bag));
    return promise;
}

function c(host, port) {
    var my = this;

    my.connection = tcp.createConnection(port || 7000, host || "localhost");

    my.connection.addListener('connect', function() {
        my.emit('connected');
    });

    my.connection.addListener('receive', function(data) {
        var bag, promise;
        try {
            bag = JSON.parse(data);
        }
        catch(e) {
            my.emit('badBag', data, e);
            return;
        }

        promise = pending[bag.id];
        if (!promise) {
            my.emit('noPendingRequestForBag', bag);
            return;
        }

        // Remove the promise. All commands are one-shot, even
        // subscribe. If you want to get another message, you'll
        // need to subscribe again.
        delete pending[bag.id];

        if (bag.success) {
            // bag.message is often undefined, but that's ok.
            promise.emitSuccess(bag.message);
        }
        else {
            promise.emitError(bag.error);
        }
    });

    my.connection.addListener('close', function(had_error) {
        if (had_error) {
            my.emit('couldNotConnect');
        }
        else {
            my.emit('disconnected');
        }
    });

    my.connection.addListener('eof', function(had_error) {
        my.connection.close();
    });

}

function p () {
    this.subscribe = function(queue) {
        return send_bag(this.connection, {
            command: "subscribe",
            queue: queue
        });
    };

    this.publish = function(queue, message) {
        return send_bag(this.connection, {
            command: "publish",
            queue: queue,
            message: message
        });
    };

    this.monitor = function(queue) {
        return send_bag(this.connection, {
            command: "monitor",
            queue: queue
        });
    };

    this.purge = function(queue) {
        return send_bag(this.connection, {
            command: "purge",
            queue: queue
        });
    };
}

p.prototype = new process.EventEmitter();
c.prototype = new p();

exports.AeroMqClient = c;
