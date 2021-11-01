import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import {
  create,
  getNumericDate,
} from "https://deno.land/x/djwt/mod.ts";
import { JwtConfig } from "../middleware/jwt.ts";

class Users  {
  static getRandomId() {
    return crypto.randomUUID();
  };

  static getCurrentTime() {
    return new Date().toISOString();
  }

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

export default Users;
