#!/bin/zsh

cd "$(dirname "$0")/.."
. ~/.zshrc
pwd

deno run -A --unstable --no-check ./bin/email.ts >> /tmp/grazily.cron.log 2>&1
