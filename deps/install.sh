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
ln -s $base/express/lib/express express
ln -s $base/express/lib/support support
ln -s $base/express/lib/express.js express.js
cd $base
