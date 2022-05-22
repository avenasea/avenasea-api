#!/usr/bin/env bash

cd "$(dirname "$0")/.."
. $HOME/.bashrc
. .env.defaults
. .env

echo "PORT: ${PORT}"
deno run -Ar --unstable --no-check ./index.ts 
