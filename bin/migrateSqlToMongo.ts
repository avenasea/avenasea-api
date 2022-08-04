import { Mongo, config } from "../src/deps.ts";
import { Database as DB } from "https://deno.land/x/sqlite3@0.4.3/mod.ts";
const ENV = config();
const db = new DB("database.sqlite");
const client = new Mongo.MongoClient();
const mongo = await client.connect(ENV.MONGO_CONNECTION_STRING);

const tables = db.queryArray`SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;`;
const ignoreTables = ["nessie_migrations", "sqlite_sequence"];

for (const table of tables) {
  if (ignoreTables.includes(table[0])) continue;
  let all = db.queryObject(`SELECT * FROM ${table[0]}`);
  if (!all.length) continue;
  all = all.map((a) => {
    if (a.id) {
      a.id = a.id.toString();
    }
    a._id = a.id || a.user_id;
    return a;
  });
  mongo.collection(table[0]).insertMany(all);
}
