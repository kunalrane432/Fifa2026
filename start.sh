#!/bin/bash
MONGOD=/Users/kunalrane/dev/web/mongodb-macos-aarch64-7.0.11/bin/mongod
DBPATH="$(dirname "$0")/data"
mkdir -p "$DBPATH"

if ! pgrep -x mongod > /dev/null; then
  echo "Starting MongoDB..."
  $MONGOD --dbpath "$DBPATH" --fork --logpath /tmp/mongod-fifa.log --port 27017
  sleep 2
fi

echo "Starting FIFA Cousins 2026..."
node server.js
