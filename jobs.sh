#!/bin/zsh

cd "$(dirname "$0")"
. ~/.zshrc
. ./.env

deno run --allow-all jobs.ts >> /tmp/startworkingremotely.cron.log 2>&1
