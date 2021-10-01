import {
  ClientSQLite,
  NessieConfig,
} from "https://deno.land/x/nessie@2.0.1/mod.ts";

const client = new ClientSQLite("./database.sqlite");

/** This is the final config object */
const config: NessieConfig = {
  client,
  migrationFolders: ["./src/db/migrations"],
  seedFolders: ["./src/db/seeds"],
};

export default config;
