#!/bin/zsh

cd "$(dirname "$0")/.."
. ~/.zshrc
pwd

deno run -Ar --unstable ./bin/email.ts >> /tmp/grazily.cron.log 2>&1
