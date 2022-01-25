#!/usr/bin/env bash

cd "$(dirname "$0")/.."
. $HOME/.bashrc
#cp ./.env.local ./.env
. ./.env.defaults
. ./.env

host=$HOST_DOMAIN
name=$HOST_PATH
project=$HOST_PROJECT

echo "current name: $name"

cd $HOME/www/${name}/${project}

#v up
#v upgrade
#v app.v

#go build ./src/main.go
#deno compile --allow-all --unstable --no-check -r --output ./api ./index.ts 
deno upgrade --canary
deno run -A --unstable https://deno.land/x/nessie/cli.ts migrate

echo $HOST_PASS | sudo -S systemctl restart ${META_SERVICE}
