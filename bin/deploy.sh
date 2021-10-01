#!/usr/bin/env bash

#cp ./.env.local ./.env
. .env
. $HOME/.bashrc

args=(-azvP --delete --exclude=node_modules --exclude=redis-data --exclude=.idea --exclude=.git --exclude=mongo_data --exclude=data01 --exclude=uploads --exclude=emails.txt --exclude=db --exclude=main --exclude=deno --exclude=app --exclude=database.sqlite)
hosts=($HOST_DOMAIN) # tornado lightning thunder tundra jefferson
dry=() #add --dry-run to enable testing
user=$HOST_USER
name=$HOST_PATH
project=$HOST_PROJECT

for host in "${hosts[@]}"
do
  echo ""
  date
  echo "---------------------"
  echo "syncing ${host}"
  echo "---------------------"
  rsync ${dry[@]} ${args[@]} ./ ${user}@${host}:www/${name}/${project}
  ssh -t ${user}@${host} \$HOME/www/${name}/${project}/bin/post-deploy.sh
done

say "$HOST_PROJECT is live!"
exit
