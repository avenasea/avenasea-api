#!/usr/bin/env bash

#cd "$(dirname "$0")/.."
. $HOME/.bashrc
. .env.defaults
. .env

deno run --allow-all --unstable --no-check ./index.ts 
