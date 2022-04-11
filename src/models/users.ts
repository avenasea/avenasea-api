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
      "SELECT id, email, username, created_at, contactme, phone, location FROM users WHERE id = :id"
    );

    return await query.oneEntry({ id });
  }

  static async findByUsername(username: string) {
    const query = db.prepareQuery<any[]>(
      "SELECT username, email, created_at, contactme, phone, location FROM users WHERE username = :username"
    );

    try {
      const user = await query.oneEntry({ username });

      if (!user.contactme) {
        delete user.email;
        delete user.phone;
      }

      return user;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  static async findAll() {
    const users = db.queryEntries(
      `
      SELECT u.username, u.created_at, u.email, u.phone ,s.total
        FROM users u
        INNER JOIN (
            SELECT count(*) as total, user_id
            FROM searches 
            GROUP BY user_id
        ) s ON s.user_id = u.id
        WHERE u.contactme = 1 
        ORDER BY u.created_at DESC
`
    );

    return users;
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
