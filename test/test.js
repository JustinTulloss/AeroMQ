/*globals process require */
var sys = require("sys"),
    aeromq = require("../clients/javascript/aeromq");

sys.puts("Welcome to the AeroMQ Testing Mobile!");

var client = new aeromq.AeroMqClient();

client.addListener('connected', function() {
    sys.puts("+ Successfully connected to the server!");
    client.publish('trial', 'hi').addCallback(function() {
        sys.puts("+ Successfully published a message!");
    });
    client.subscribe('trial').addCallback(function(message) {
        sys.puts("+ Got a message from the server: " + message);
    });
});

client.addListener('couldNotConnect', function() {
    sys.puts("- Could not connect to the server.");
    process.exit(-1);
});

client.addListener('badBag', function(data, e) {
    sys.puts("- Received a bad bag from the server: " + e);
    sys.puts(sys.inspect(data));
});

client.addListener('orphanBag', function(bag) {
    sys.puts("* Received a response for an orphaned bag");
    sys.puts(sys.inspect(bag));
});
