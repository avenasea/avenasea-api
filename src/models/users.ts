import { bcrypt, create, getNumericDate } from "../deps.ts";
import { JwtConfig } from "../middleware/jwt.ts";
import { db } from "../db.ts";

class Users {
  static getRandomId() {
    return crypto.randomUUID();
  }

  static getCurrentTime() {
    return new Date().toISOString();
  }

  static async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
  }

  static async find(id: string) {
    const query = db.prepareQuery<any[]>(
      "SELECT id, email, username, created_at, contactme, phone FROM users WHERE id = :id"
    );

    return await query.oneEntry({ id });
  }

  static async findByUsername(username: string) {
    const query = db.prepareQuery<any[]>(
      "SELECT username, created_at, contactme, phone FROM users WHERE username = :username"
    );

    try {
      return await query.oneEntry({ username });
    } catch (err) {
      console.error(err);
      return null;
    }
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
