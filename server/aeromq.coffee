#!/usr/bin/env coffee 

server = require './server'
util = require 'util'
optparse = require 'optparse'

options = [
    ['-p', '--port PORT_NUMBER', 'Start AeroMQ on the specified port'],
    ['', '--host HOST_ADDRESS', 'Start AermoMQ on the specified address'],
    ['-h', '--help', 'Print this help section']
]

parser = new optparse.OptionParser options
config = {}

parser.banner = "Usage: aeromq [options]"

parser.on 'port', (port) ->
    config.port = port

parser.on 'host', (host) ->
    config.host = host

parser.on 'help', () ->
    util.puts parser
    process.exit 0

parser.parse process.ARGV

process.on 'uncaughtException', (e) ->
    util.puts("EXCEPTION: " + e.message)
    util.puts(e.stack)

s = new server.Server config
s.on 'started', (host, port) ->
    util.puts "AeroMQ started on " + host + ":" + port
s.on 'error', (err) ->
    util.puts "An error occurred: " + err
    if err.stack
        util.puts err.stack

