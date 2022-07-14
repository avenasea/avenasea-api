#!/usr/bin/env bash

cd "$(dirname "$0")/.."
. $HOME/.bashrc
. ./.env.defaults
. ./.env

host=$HOST_DOMAIN
name=$HOST_PATH
project=$HOST_PROJECT

echo "current name: $name"

cd $HOME/www/${name}/${project}

#deno compile -Ar --unstable --output ./api ./index.ts 
deno upgrade
deno run -Ar --unstable https://deno.land/x/nessie/cli.ts migrate

sudo /etc/init.d/nginx reload
sudo systemctl daemon-reload
sudo systemctl restart ${META_SERVICE}
