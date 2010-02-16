#!/bin/sh

base=`pwd`

# Make redis
cd $base/redis
make
cd $base

mkdir -p ~/.node_libraries

# Link node js libraries to their sources
cd ~/.node_libraries
ln -s $base/optparse/src/optparse.js optparse.js
ln -s $base/redis-client/redisclient.js redisclient.js
ln -s $base/picard/picard/lib/picard picard
ln -s $base/picard/picard/lib/picard.js picard.js
ln -s $base/haml-js/lib/haml.js haml.js
cd $base
