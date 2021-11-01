#!/usr/bin/env bash

#cd "$(dirname "$0")/.."
. $HOME/.bashrc
. .env.defaults
. .env

deno install -qAf --unstable https://deno.land/x/denon/denon.ts
denon run --allow-all --unstable --no-check ./index.ts 
