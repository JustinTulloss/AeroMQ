#!/usr/bin/env node
/*
 * Copyright (c) 2010 Justin Tulloss <justin@harmonize.fm>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/*globals require process */

var server = require('./server'),
    sys = require('sys'),
    optparse = require('optparse');

var options = [
    ['-p', '--port PORT_NUMBER', 'Start AeroMQ on the specified port'],
    ['', '--host HOST_ADDRESS', 'Start AermoMQ on the specified address'],
    ['-h', '--help', 'Print this help section']
];

var parser = new optparse.OptionParser(options);
var config = {};

parser.banner = "Usage: " + process.ARGV[1] + " [options]";

parser.on('port', function(port) {
    config.port = port;
});

parser.on('host', function(host) {
    config.host = host;
});

parser.on('help', function() {
    sys.puts(parser);
    process.exit(0);
});

parser.parse(process.ARGV);

process.addListener('uncaughtException', function(e) {
    sys.puts("EXCEPTION: " + e.message);
    sys.puts(e.stack);
});

s = new server.Server(config);
s.addListener('started', function(host, port) {
    sys.puts("AeroMQ started on " + host + ":" + port);
});
