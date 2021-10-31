import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import Users from "../models/users.ts";
import { db } from '../db.ts';

class Controller {
  async register(context: any) {
    const body = JSON.parse(await context.request.body().value);
    const existing = await db.query("SELECT * FROM users WHERE email = ?", [body.email]);

    if (existing.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    const hashedPassword = await Users.hashPassword(body.password);
		console.log(hashedPassword);
    const user = await db.query('INSERT INTO users (email, hashed_password) VALUES (?,?)',[
      body.email,
      hashedPassword,
    ]);

		console.log('user created: ', user);
    context.response.body = { message: "User created" };
  }

  async login(context: any) {
    const body = JSON.parse(await context.request.body().value);
		// todo need to figure out how to get key/value
    let user: any = await db.query('SELECT id, email, hashed_password FROM users WHERE email = ?', [body.email]);

    if (!user || !user.length) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }
    user = user[0];
		console.log(user);
		console.log(body.password, user[2]);
    const comparison = await bcrypt.compare(body.password, user[2]);
		console.log('comparison: ', comparison);

    if (comparison) {
      context.response.status = 200;
      delete user.hashed_password;
      const token = await Users.generateJwt(user.id);
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
}

export default new Controller();
