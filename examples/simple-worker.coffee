#!/usr/bin/env coffee 

aeromq = require "../clients/coffeescript/aeromq"
util = require "util"

client = aeromq.createClient(['test'])

client.on('test', (id, data) ->
    util.puts 'doing some work!!'
    client.done id
    client.ready()

client.ready()
