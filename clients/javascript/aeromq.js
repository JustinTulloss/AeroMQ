/*globals require exports process */
var zeromq = require('zeromq'),
    util = require("util");

var get_message_id = (function(){
    var message_id = 0;
    return function() {
        return message_id++;
    };
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
    connection.send(JSON.stringify(bag));
    return promise;
}

function c(address) {
    var self = this;

    self.socket = zeromq.createSocket('pull');
    self.socket.connect(address);

    self.socket.on('message', function(message) {
        var bag, promise;
        try {
            bag = JSON.parse(message);
        }
        catch(e) {
            self.emit('badBag', data, e);
            return;
        }

        promise = pending[bag.id];
        if (!promise) {
            self.emit('orphanBag', bag);
            return;
        }

        if (bag.success) {
            // bag.message is often undefined, but that's ok.
            promise.emitSuccess(bag.message);
        }
        else {
            promise.emitError(bag.error);
        }
    });

    self.connection.addListener('close', function(had_error) {
        if (had_error) {
            self.emit('couldNotConnect');
        }
        else {
            self.emit('disconnected');
        }
    });

    self.connection.addListener('eof', function(had_error) {
        self.connection.close();
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
