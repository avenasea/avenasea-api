import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import Users from "../models/users.ts";

class Controller {
  async register(context: any) {
    const body = JSON.parse(await context.request.body().value);
    const existing = await Users.where("email", body.email).get();

    if (existing.length) {
      context.response.status = 400;
      return (context.response.body = { message: "User already exists" });
    }

    const hashedPassword = await Users.hashPassword(body.password);
    const user = await Users.create({
      email: body.email,
      hashedPassword,
    });

    context.response.body = { message: "User created" };
  }

  async login(context: any) {
    const body = JSON.parse(await context.request.body().value);
    // problem with Model type not having correct properties
    let user: any = await Users.where("email", body.email).get();
    if (!user || !user.length) {
      context.response.status = 400;
      context.response.body = { message: "User not found" };
      return;
    }
    user = user[0];
    const comparison = await bcrypt.compare(body.password, user.hashedPassword);
    if (comparison) {
      context.response.status = 200;
      delete user.hashedPassword;
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
