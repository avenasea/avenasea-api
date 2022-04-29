#!/usr/bin/env bash

#cd "$(dirname "$0")/.."
. $HOME/.bashrc
. .env.defaults
. .env

deno run -Ar --unstable --no-check ./index.ts 
