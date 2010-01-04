var tcp = require('tcp');

var tcp = require("tcp"),
    sys = require("sys");

var connection = tcp.createConnection(7000, host="localhost");
connection.addListener('receive', function(data) {
    sys.puts(data);
});

connection.addListener('close', function(had_error) {
    if (had_error) {
        sys.puts("Could not connect to AeroMQ server");
    }
    else {
        sys.puts("Connection to server closed.");
    }
});

connection.addListener('eof', function(had_error) {
    connection.close();
});

function format_message(obj) {
    return JSON.stringify(obj) + "\r\n"
}

connection.addListener('connect', function() {
    //connection.send(format_message({command: "publish", queue: "trial", message: "hi"}));
    //connection.send(format_message({command: "purge", queue: "trial"}));
    connection.send(format_message({command: "subscribe", queue: "trial"}));
    connection.send(format_message({command: "monitor", queue: "trial"}));
});
