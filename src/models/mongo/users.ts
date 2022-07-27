import { Mongo } from "../../deps.ts";
import { bcrypt, create, getNumericDate } from "../../deps.ts";
import { JwtConfig } from "../../middleware/jwt.ts";

export class UserModel {
  constructor(
    public id: string,
    public email: string,
    public hashed_password: string,
    public updated_at: string,
    public created_at: string,
    public username: string,
    public contactme: 0 | 1,
    public password_reset_token?: string,
    public password_reset_expiry?: number,
    public phone?: string,
    public location?: string,
    public stripe_customer_id?: string
  ) {}
}

export class Users {
  constructor(private db: Mongo.Database) {}
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
  async find(id: string) {
    try {
      const user = await this.db
        .collection("users")
        .aggregate<{
          id: string;
          email: string;
          created_at: string;
          username: string;
          contactme: 0 | 1;
          stripe_customer_id: null;
          phone: string;
          location: string;
          status: string;
          renewal_date: number;
          payment_type: string;
          plan_id: string | number;
          cancel_at_period_end: 0 | 1;
          billing_frequency: string;
          job_search_profiles: number;
          candidate_search_profiles: number;
          plan_name: string;
        }>([
          {
            $match: {
              id: id,
            },
          },
          {
            $lookup: {
              from: "billing",
              localField: "id",
              foreignField: "user_id",
              as: "billing",
              pipeline: [
                {
                  $project: {
                    status: 1,
                    renewal_date: 1,
                    payment_type: 1,
                    plan_id: 1,
                    cancel_at_period_end: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$billing",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $lookup: {
              from: "plans",
              localField: "billing.plan_id",
              foreignField: "id",
              as: "plans",
              pipeline: [
                {
                  $project: {
                    name: 1,
                    billing_frequency: 1,
                    job_search_profiles: 1,
                    candidate_search_profiles: 1,
                  },
                },
                {
                  $addFields: {
                    plan_name: "$name",
                  },
                },
                {
                  $project: {
                    name: 0,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$plans",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$$ROOT", "$billing", "$plans"],
              },
            },
          },
          {
            $project: {
              updated_at: 0,
              hashed_password: 0,
              billing: 0,
              plans: 0,
              password_reset_token: 0,
              password_reset_expiry: 0,
            },
          },
        ])
        .toArray();
      return user?.[0];
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async findByUsername(username: string, id?: string) {
    console.log("username: ", username, "id: ", id);

    try {
      const user = (await this.db
        .collection("users")
        .findOne({ username: username })) as Omit<
        UserModel,
        "phone" | "email"
      > & { phone?: string; email?: string };

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
  async findAll() {
    try {
      const users = await this.db
        .collection("users")
        .aggregate<{
          id: string;
          username: string;
          created_at: string;
          email: string;
          phone: string;
          total: number;
        }>([
          {
            $lookup: {
              from: "searches",
              localField: "id",
              foreignField: "user_id",
              as: "searches",
            },
          },
          {
            $addFields: {
              total: { $size: "$searches" },
            },
          },
          {
            $project: {
              id: 1,
              username: 1,
              created_at: 1,
              email: 1,
              phone: 1,
              total: 1,
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray();

      return users;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async findByStripeID(stripeCustomerID: string) {
    try {
      const user = (await this.db.collection("users").findOne(
        { stripe_customer_id: stripeCustomerID },
        {
          projection: {
            id: 1,
            username: 1,
            created_at: 1,
            contactme: 1,
            phone: 1,
            stripe_customer_id: 1,
          },
        }
      )) as Pick<
        UserModel,
        | "id"
        | "username"
        | "created_at"
        | "contactme"
        | "phone"
        | "stripe_customer_id"
      >;
      return user;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async findByEmail(email: string) {
    try {
      const user = (await this.db.collection("users").findOne(
        { email },
        {
          projection: {
            id: 1,
            username: 1,
            created_at: 1,
            contactme: 1,
            phone: 1,
            stripe_customer_id: 1,
          },
        }
      )) as Pick<
        UserModel,
        | "id"
        | "username"
        | "created_at"
        | "contactme"
        | "phone"
        | "stripe_customer_id"
      >;
      return user;
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

  async updatePasswordResetData(userID: string, token: string, expiry: number) {
    try {
      const user = await this.db.collection("users").updateOne(
        { id: userID },
        {
          $set: {
            password_reset_token: token,
            password_reset_expiry: expiry,
          },
        }
      );
      return user;
    } catch (err) {
      console.error(err);
    }
  }

  async getPasswordResetData({
    token,
    userID,
  }: {
    token?: string;
    userID?: string;
  }) {
    try {
      const data = (await this.db
        .collection("users")
        .findOne(token ? { password_reset_token: token } : { id: userID }, {
          projection: {
            id: 1,
            password_reset_expiry: 1,
            password_reset_token: 1,
          },
        })) as Pick<
        UserModel,
        "id" | "password_reset_expiry" | "password_reset_token"
      >;
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  }

  async updatePassword(userID: string, hashedPassword: string) {
    try {
      const expiry = Date.now();
      const p = await this.db.collection("users").updateOne(
        { id: userID },
        {
          $set: {
            hashed_password: hashedPassword,
            password_reset_expiry: expiry,
          },
        }
      );
      return p;
    } catch (err) {
      console.error(err);
    }
  }
}
