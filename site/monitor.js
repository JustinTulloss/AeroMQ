var sys = require('sys');
require('./env');
var mq = require('../clients/javascript/aeromq');

get ('/', function() {
    return {
        template: 'index',
        print_date: function () {
            return (new Date()).toDateString();
        },
    };
});

get('/queues/:queue', function(params) {
    var client = new mq.AeroMqClient();
    client.addListener('connect', function() {
        client.monitor(params.queue).addCallback(function(messages) {
            params.on_screen({
                template: 'index',
                print_date: function () {
                    return (new Date()).toDateString();
                },
                queue: sys.inspect(messages)
            });
        });
    });
    client.addListener('couldNotConnect', function() {
        params.on_screen({ text: "Could not connect to AeroMQ server" });
    });
});

