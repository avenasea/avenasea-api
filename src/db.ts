import { DB, MongoClient } from "./deps.ts";

const db = new DB("database.sqlite");

export { DB, MongoClient, db };
