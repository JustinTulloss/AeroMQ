var sys = require("sys"),
    aeromq = require("../clients/javascript/aeromq");

sys.puts("Welcome to the AeroMQ Testing Mobile!");

client = new aeromq.AeroMqClient();

client.addListener('connected', function() {
    sys.puts("+ Successfully connected to the server!");
});

client.addListener('couldNotConnect', function() {
    sys.puts("- Could not connect to the server.");
    process.exit(-1);
});
