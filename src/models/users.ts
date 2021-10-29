import { DataTypes, Model } from "https://deno.land/x/denodb/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt/mod.ts";
import { JwtConfig } from "../middleware/jwt.ts";
import { db } from "../db.ts";

class Users extends Model {
  static table = "users";
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
    hashedPassword: {
      type: DataTypes.STRING,
    },
  };

  static defaults = {
    id: crypto.randomUUID(),
  };

  // ...
  static async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
  }

  static generateJwt(id: string) {
    // Create the payload with the expiration date (token have an expiry date) and the id of current user (you can add that you want)
    const payload = {
      id,
      iat: getNumericDate(new Date()),
    };
    // return the generated token
    return create({ alg: "HS512", typ: "JWT" }, payload, JwtConfig.secretKey);
  }
}

db.link([Users]);
//await db.sync();

export default Users;
