# grazily-api

## install service

## dev

    # make migration:

    deno run -A --unstable https://deno.land/x/nessie/cli.ts make:migration create_users

    # run migrations

    deno run -A --unstable https://deno.land/x/nessie/cli.ts migrate

    # start server

    deno run -Ar --unstable index.ts

## compile

    deno compile --allow-all --unstable --output ./api index.ts

## competitors

- https://www.alliancereservations.com/hotel-sourcing-rfp-process.html
