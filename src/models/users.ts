import { bcrypt, create, getNumericDate } from "../deps.ts";
import { JwtConfig } from "../middleware/jwt.ts";
import { DB, MongoDatabase } from "../deps.ts";

class Users {
  db: DB;
  mongo: MongoDatabase;

  constructor(db: any, mongo?: any) {
    this.db = db;
    this.mongo = mongo;
  }

  getRandomId() {
    return crypto.randomUUID();
  }

  getCurrentTime() {
    return new Date().toISOString();
  }

  async hashPassword(password: string) {
    const salt = await bcrypt.genSalt(8);
    return bcrypt.hash(password, salt);
  }

  find(id: string) {
    const query = this.db.queryObject<any>(
      `SELECT
      users.id AS id,
      email,
      username,
      created_at,
      contactme,
      phone,
      location,
      stripe_customer_id,
      cancel_at_period_end,
      billing.status,
      billing.renewal_date,
      billing.payment_type,
      plans.name AS plan_name,
      plans.billing_frequency,
      plans.job_search_profiles,
      plans.candidate_search_profiles,
      plans.id as plan_id
      FROM users
      LEFT JOIN billing ON billing.user_id = users.id
      LEFT JOIN plans ON billing.plan_id = plans.id
      WHERE users.id = :id`,
      { id }
    )[0];

    return query;
  }

  findByUsername(username: string, id: string) {
    console.log("username: ", username, "id: ", id);

    try {
      const user = this.db.queryObject<any>(
        "SELECT username, email, created_at, contactme, phone, location, stripe_customer_id FROM users WHERE username = :username",
        { username }
      )[0];

      if (!user.contactme || !id) {
        delete user.email;
        delete user.phone;
      }

      return user;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  findAll() {
    const users = this.db.queryObject(
      `
      SELECT u.username, u.created_at, u.email, u.phone, s.total
        FROM users u
        LEFT JOIN (
            SELECT count(*) as total, user_id
            FROM searches 
            GROUP BY user_id
        ) s ON s.user_id = u.id
        ORDER BY u.created_at DESC
`
    )[0];

    return users;
  }

  findByStripeID(stripeCustomerID: string) {
    try {
      return this.db.queryObject<any>(
        "SELECT id, username, created_at, contactme, phone, stripe_customer_id FROM users WHERE stripe_customer_id = :stripeCustomerID",
        { stripeCustomerID }
      )[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  findByEmail(email: string) {
    try {
      return this.db.queryObject<{
        id: string;
        username: string;
        created_at: string;
        contactme: number;
        phone: number;
        stripe_customer_id: string;
      }>(
        "SELECT id, username, created_at, contactme, phone, stripe_customer_id FROM users WHERE email = :email",
        { email }
      )[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  generateJwt(id: string) {
    // Create the payload with the expiration date (token have an expiry date) and the id of current user (you can add that you want)
    const payload = {
      id,
      iat: getNumericDate(new Date()),
    };
    // return the generated token
    return create({ alg: "HS512", typ: "JWT" }, payload, JwtConfig.secretKey);
  }

  updatePasswordResetData(userID: string, token: string, expiry: number) {
    try {
      const query = this.db.queryObject<any>(
        `
      UPDATE users
      SET
      password_reset_token = ?,
      password_reset_expiry = ?
      WHERE id = ?`,
        token,
        expiry,
        userID
      );
      return query;
    } catch (err) {
      console.error(err);
    }
  }

  getPasswordResetData({ token, userID }: { token?: string; userID?: string }) {
    try {
      return this.db.queryObject<{ id: string; password_reset_expiry: string }>(
        `SELECT id, password_reset_expiry, password_reset_token FROM users WHERE ${
          token ? `password_reset_token = '${token}'` : `id = '${userID}'`
        }`
      )[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  updatePassword(userID: string, hashedPassword: string) {
    try {
      const expiry = Date.now();
      const query = this.db.queryObject<any>(
        `
      UPDATE users
      SET
      hashed_password = ?,
      password_reset_expiry = ?
      WHERE id = ?`,
        hashedPassword,
        expiry,
        userID
      );
      return query;
    } catch (err) {
      console.error(err);
    }
  }
}

export default Users;
