#!/bin/zsh

cd "$(dirname "$0")"
. ~/.zshrc
. ./.env
. ./.env.defaults

deno run -A --unstable --no-check ./bin/emails.ts >> /tmp/grazily.cron.log 2>&1
