import { bcrypt } from "../deps.ts";
import Users from "../models/users.ts";
import type {
  StandardContext,
  AuthorisedContext,
  OptionallyAuthorisedContext,
} from "../types/context.ts";

class Controller {
  async register(context: AuthorisedContext) {
    const db = context.state.db;
    const users = new Users(db);
    const body = JSON.parse(await context.request.body().value);
    const existing = await db.queryObject(
      "SELECT * FROM users WHERE email = ?",
      body.email
    )[0];

    const userNameExisting = await db.queryObject(
      "SELECT * FROM users WHERE username = ?",
      body.username
    )[0];

    if (existing.length || userNameExisting.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    // todo:
    // handle body.affiliate code when present (look up referring user and give credit, also deduct discount from this user when paying)
    const hashedPassword = await users.hashPassword(body.password);
    const user = await db.queryObject(
      "INSERT INTO users (id, email, username, hashed_password, created_at, updated_at, contactme, phone, location) VALUES (?,?,?,?,?,?,?,?, ?)",
      users.getRandomId(),
      body.email.toLowerCase(),
      body.username.toLowerCase(),
      hashedPassword,
      users.getCurrentTime(),
      users.getCurrentTime(),
      body.contactme,
      body.phone,
      body.location
    );

    console.log("user registered! ", body.email, users.getCurrentTime());
    context.response.body = { message: "User created" };
  }

  async update(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.state.user.id;
    const users = new Users(db);
    const user = await users.find(id);

    if (!user) {
      context.response.status = 400;
      return (context.response.body = { message: "User does not exist" });
    }

    const body = JSON.parse(await context.request.body().value);
    if (body.newEmail) {
      const existing = await db.queryObject(
        "SELECT * FROM users WHERE email = ?",
        body.newEmail
      )[0];

      if (existing.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    if (body.newUsername) {
      const userNameExisting = await db.queryObject(
        "SELECT * FROM users WHERE username = ?",
        body.newUsername
      )[0];

      if (userNameExisting.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    user.contactme = Number(body.contactme);
    user.phone = body.newPhone;
    user.location = body.location;

    if (body.newPassword) {
      // updating password and fields
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      const hashedPassword = await users.hashPassword(body.newPassword);
      await db.queryObject(
        "UPDATE users SET hashed_password = ?, email = ?, username = ?, updated_at = ?, contactme = ?, phone = ?, location = ? WHERE id = ?",
        hashedPassword,
        user.email,
        user.username,
        user.contactme,
        users.getCurrentTime(),
        user.phone,
        user.location,
        id
      );
    } else {
      // updating fields only
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      await db.queryObject(
        `UPDATE users
           SET email = ?,
           username = ?,
           updated_at = ?,
           contactme = ?,
           phone = ?,
           location = ?
        WHERE id = ?`,
        user.email,
        user.username,
        users.getCurrentTime(),
        user.contactme,
        user.phone,
        user.location,
        id
      );
    }

    console.log(
      "user updated! ",
      user.email,
      user.username,
      user.phone,
      users.getCurrentTime()
    );

    context.response.body = { message: "User updated" };
  }

  async login(context: AuthorisedContext) {
    const db = context.state.db;
    const users = new User(db);
    const body = JSON.parse(await context.request.body().value);
    let user: any;

    if (!body.email || !body.password) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    try {
      user = db.queryObject(
        `SELECT
        id,
        email,
        hashed_password,
        billing.status
        FROM users
        LEFT JOIN billing ON billing.user_id = users.id
        WHERE email = :email`,
        { email: body.email.toLowerCase() }
      )[0];
    } catch (err) {
      console.error(err);
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }

    if (!user.email) {
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
      const token = await users.generateJwt(user.id);
      delete user.hashed_password;

      await db.queryObject(
        "UPDATE users SET updated_at = ? WHERE email = ?",
        users.getCurrentTime(),
        user.email
      );

      return (context.response.body = {
        user,
        token,
      });
    } else {
      console.error(
        "Incorrect login: ",
        // body.password,
        user.hashed_password,
        comparison
      );
      context.response.status = 400;
      context.response.body = { message: "Incorrect login" };
    }
  }

  async getMe(context: AuthorisedContext) {
    //get user id from jwt
    const db = context.state.db;
    const id = context.state.user.id;
    const users = new Users(db);
    const user: any = await users.find(id);
    if (typeof user === "undefined") {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      // check subscription expiry
      if (
        user.payment_type == "coinpayments" &&
        user.status == "active" &&
        user.renewal_date <= Math.floor(Date.now() / 1000)
      ) {
        user.status = "canceled";
        db.queryObject(
          "UPDATE billing SET status = ? WHERE user_id = ?",
          user.status,
          id
        );
      }
      delete user.hashedPassword;
      context.response.body = user;
    }
  }

  async getUsername(context: AuthorisedContext) {
    const db = context.state.db;
    const id = context.state.user?.id;
    const users = new Users(db);
    const username = context.params.username;
    const user = await users.findByUsername(username, id);

    if (!user) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
    } else {
      context.response.body = user;
    }
  }

  async getAll(context: AuthorisedContext) {
    const db = context.state.db;
    const _users = new Users(db);
    const users = await _users.findAll();

    if (!users.length) {
      context.response.status = 400;
      context.response.body = { message: "Users not found" };
    } else {
      context.response.body = users;
    }
  }
}

export default new Controller();
