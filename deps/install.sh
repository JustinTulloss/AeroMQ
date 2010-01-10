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
cd $base
