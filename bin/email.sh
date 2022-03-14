#!/bin/zsh

cd "$(dirname "$0")/.."
. ~/.zshrc
pwd

deno run -A --unstable ./bin/email.ts >> /tmp/grazily.cron.log 2>&1
