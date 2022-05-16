import { DB } from "./deps.ts";

export default DB;
export const db = new DB("database.sqlite");
