import * as bcrypt from "https://deno.land/x/bcrypt/mod.ts";
import Users from "../models/users.ts";

class Controller {
  async register(context: any) {
    const body = await context.request.body().value;
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
    const body = await context.request.body().value;
    const user = await Users.where("email", body.email).get();
    const comparison = await bcrypt.compare(body.password, user.hashedPassword);

    if (comparison && user.length) {
      context.response.status = 200;
      //delete user.hashedPassword;
      const jwt = Users.generateJwt(user.id);
      return (context.response.body = { jwt });
    }

    context.response.status = 400;
    context.response.body = { message: "User not found" };
  }

  async getMe(context: any) {
    // get user id from jwt
    const id = null;
    const user = await Users.get();
    context.response.body = user;
  }
}

export default new Controller();
