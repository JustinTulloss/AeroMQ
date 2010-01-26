/*globals process require */
var sys = require("sys"),
    assert = require("assert"),
    aeromq = require("../clients/javascript/aeromq");

sys.puts("Welcome to the AeroMQ Testing Mobile!");

var client = new aeromq.AeroMqClient();

client.addListener('connect', function() {
    var queue = 'test';
    sys.puts("+ Successfully connected to the server!");
    var tests = [
        function testPublish(done) {
            client.publish(queue, 'An important message!').addCallback(function() {
                sys.puts("+ Successfully published a message!");
                done();
            });
        },
        function testMonitor(done) {
            client.monitor(queue).addCallback(function(messages) {
                sys.puts("+ Snapshot of trial: " + sys.inspect(messages));

                assert.equal(messages.length, 1,
                    "After 1 publish, not 1 message on the queue");
                done();
            });
        },
        function testSubscribe(done) {
            client.subscribe(queue).addCallback(function(message) {
                sys.puts("+ Got a message from the server: " + message);
                done();
            })
        },
        function publishUnimportant(done) {
            client.publish(queue, 'unimporant').addCallback(function() {
                sys.puts("+ Successfully published a message!");
                client.publish(queue, 'slightly relevant').addCallback(function() {
                    sys.puts("+ Successfully published a message!");
                    done();
                });
            });
        },
        function testMonitor2(done) {
            client.monitor(queue).addCallback(function(messages) {
                assert.ok(messages, "Messages should be a list");
                assert.equal(messages.length, 2,
                    "Queue should have 2 messages");
                done();
            });
        },
        function testPurge(done) {
            client.purge(queue).addCallback(function() {
                sys.puts("+ Successfully purged the queue");
                client.monitor(queue).addCallback(function(messages) {
                    assert.equal(messages, null,
                        "Queue should be empty");
                    done();
                });
            });
        }
    ];
    // Ok, we've written all the tests, now let's call them
    var testIndex = 0;
    function callNextTest() {
        if (tests.length > testIndex) {
            tests[testIndex](callNextTest);
            testIndex++;
        }
    }
    client.purge(queue).addCallback(function() {;
        callNextTest();
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
