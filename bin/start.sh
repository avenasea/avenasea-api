#!/usr/bin/env bash

#cd "$(dirname "$0")/.."
. $HOME/.bashrc
. .env.defaults
. .env

deno install -qAf --unstable --no-check https://deno.land/x/denon/denon.ts
deno run --allow-all --unstable --no-check ./index.ts 
