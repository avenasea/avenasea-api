import { bcrypt } from "../deps.ts";
import Users from "../models/users.ts";
import { db } from "../db.ts";

class Controller {
  async register(context: any) {
    const body = JSON.parse(await context.request.body().value);
    const existing = await db.query("SELECT * FROM users WHERE email = ?", [
      body.email,
    ]);

    const userNameExisting = await db.query(
      "SELECT * FROM users WHERE username = ?",
      [body.username]
    );

    if (existing.length || userNameExisting.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    const hashedPassword = await Users.hashPassword(body.password);
    const user = await db.query<any[]>(
      "INSERT INTO users (id, email, username, hashed_password, created_at, updated_at) VALUES (?,?,?,?,?,?)",
      [
        Users.getRandomId(),
        body.email.toLowerCase(),
        body.username.toLowerCase(),
        hashedPassword,
        Users.getCurrentTime(),
        Users.getCurrentTime(),
      ]
    );

    console.log("user registered! ", body.email, Users.getCurrentTime());
    context.response.body = { message: "User created" };
  }

  async login(context: any) {
    const body = JSON.parse(await context.request.body().value);
    let user: any;

    try {
      const query = db.prepareQuery<unknown[]>(
        "SELECT id, email, hashed_password FROM users WHERE email = :email"
      );
      user = query.oneEntry({ email: body.email.toLowerCase() });
      query.finalize();
    } catch (err) {
      console.error(err);
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    console.log("user login: ", user.email);
    const comparison = await bcrypt.compare(
      body.password,
      user.hashed_password
    );

    if (comparison) {
      context.response.status = 200;
      //delete user.hashed_password;
      const token = await Users.generateJwt(user.id);
      delete user.hashed_password;

      await db.query("UPDATE users SET updated_at = ? WHERE email = ?", [
        Users.getCurrentTime(),
        user.email,
      ]);

      return (context.response.body = {
        user,
        token,
      });
    }
  }

  async getMe(context: any) {
    //get user id from jwt
    const id = context.state.user.id;
    const user = await Users.find(id);
    if (typeof user === "undefined") {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      delete user.hashedPassword;
      context.response.body = user;
    }
  }

  async getUsername(context: any) {
    const username = context.params.username;
    const user = await Users.findByUsername(username);

    if (!user) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      context.response.body = user;
    }
  }
}

export default new Controller();
