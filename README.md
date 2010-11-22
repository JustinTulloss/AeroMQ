AeroMQ
======

A very simple message queue implemented in node.js.

Installation
------------

First you need to install some dependencies:
 * node.js - https://github.com/ry/node
 * redis - http://code.google.com/p/redis/wiki/QuickStart

Installation of AeroMQ itself is easy, with `npm` (https://github.com/isaacs/npm)

    $ npm install aeromq

Running the server
------------------
Start redis

    $ redis-server

Start AeroMQ

    $ aeromq

At this point, AeroMQ should announce that it is running.

Protocol
--------

The message queue protocol is dead simple. All communication is done in JSON
formatted messages. All you do is send a message, and whenever somebody is
ready to do something with that message, they will get the message.

Every message is sent in a bag (obviously, it's a messenger bag). The bag's 
format is:

    {
        command: <one of the supported commands (below)>,
        queue: <the queue to operate on>,
        id: [an identifier for the request, not required],
        message: [a string that is the message. publish only.]
    }

Upon receiving the above bag, the server will respond at some point in the
future with the result of the query. The format is:

    {
        success: <true|false>,
        id: [the client id, only returned if it was provided],
        message: [the message requested, if the command returns one],
        error: [if success is false, details will be provided here]
    }

There are 4 supported commands (verbs).

 * push
 * pop
 * monitor
 * purge
