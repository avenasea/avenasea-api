// import { Model, DataTypes } from "https://deno.land/x/denodb/mod.ts";
import {
  DataTypes,
  Model,
} from "https://raw.githubusercontent.com/stillalivx/denodb/master/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import {
  Jose,
  makeJwt,
  Payload,
  setExpiration,
} from "https://deno.land/x/djwt@2.2/create.ts";
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
    const payload: Payload = {
      id,
      exp: setExpiration(new Date().getTime() + JwtConfig.expirationTime),
    };
    const header: Jose = {
      alg: JwtConfig.alg as Jose["alg"],
      typ: JwtConfig.type,
    };

    // return the generated token
    return makeJwt({ header, payload, key: JwtConfig.secretKey });
  }
}

db.link([Users]);
//await db.sync();

export default Users;
