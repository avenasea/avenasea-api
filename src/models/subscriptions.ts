// import { Model, DataTypes } from "https://deno.land/x/denodb/mod.ts";
import {
  DataTypes,
  Model,
} from "https://raw.githubusercontent.com/stillalivx/denodb/master/mod.ts";
import { db } from "../db.ts";

class Subscriptions extends Model {
  static table = "subscriptions";
  static timestamps = true;

  static fields = {
    id: {
      primaryKey: true,
      type: DataTypes.STRING,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
    },
  };
  static defaults = {
    id: crypto.randomUUID(),
  };
}

db.link([Subscriptions]);
// await db.sync();

export default Subscriptions;
