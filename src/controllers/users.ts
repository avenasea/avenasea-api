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
      "INSERT INTO users (id, email, username, hashed_password, created_at, updated_at, contactme) VALUES (?,?,?,?,?,?,?)",
      [
        Users.getRandomId(),
        body.email.toLowerCase(),
        body.username.toLowerCase(),
        hashedPassword,
        Users.getCurrentTime(),
        Users.getCurrentTime(),
        body.contactme,
      ]
    );

    console.log("user registered! ", body.email, Users.getCurrentTime());
    context.response.body = { message: "User created" };
  }

  async update(context: any) {
    const id = context.state.user.id;
    const user = await Users.find(id);

    if (!user) {
      context.response.status = 400;
      return (context.response.body = { message: "User does not exist" });
    }

    const body = JSON.parse(await context.request.body().value);
    if (body.newEmail) {
      const existing = await db.query("SELECT * FROM users WHERE email = ?", [
        body.newEmail,
      ]);

      if (existing.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    if (body.newUsername) {
      const userNameExisting = await db.query(
        "SELECT * FROM users WHERE username = ?",
        [body.newUsername]
      );

      if (userNameExisting.length) {
        context.response.status = 400;
        return (context.response.body = { message: "User already exists" });
      }
    }

    if (body.newPassword) {
      // updating password and fields
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      user.contactme = Number(body.contactme);

      const hashedPassword = await Users.hashPassword(body.newPassword);
      await db.query<any[]>(
        "UPDATE users SET hashed_password = ?, email = ?, username = ?, updated_at = ?, contactme = ? WHERE id = ?",
        [
          hashedPassword,
          user.email,
          user.username,
          user.contactme,
          Users.getCurrentTime(),
          id,
        ]
      );
    } else {
      // updating fields only
      if (body.newEmail) {
        user.email = body.newEmail.toLowerCase();
      }

      if (body.newUsername) {
        user.username = body.newUsername.toLowerCase();
      }

      user.contactme = Number(body.contactme);

      await db.query<any[]>(
        `UPDATE users
           SET email = ?,
           username = ?,
           updated_at = ?,
           contactme = ?
        WHERE id = ?`,
        [user.email, user.username, Users.getCurrentTime(), user.contactme, id]
      );
    }

    console.log(
      "user updated! ",
      user.email,
      user.username,
      Users.getCurrentTime()
    );

    context.response.body = { message: "User updated" };
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
