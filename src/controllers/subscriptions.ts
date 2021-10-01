import Subscriptions from "../models/subscriptions.ts";

class Controller {
  async post(context: any) {
    const body = await context.request.body().value;
    const existing = await Subscriptions.where("email", body.email).get();

    if (existing.length) {
      context.response.status = 400;
      return (context.response.body = { message: "Email already exists" });
    }

    const subscription = await Subscriptions.create({
      id: crypto.randomUUID(),
      email: body.email,
    });

    context.response.body = { message: "Email subscribed" };
  }

  async delete(context: any) {
    const id = context.params.id;
    await Subscriptions.where("id", id).delete();

    context.response.status = 204;
    context.response.body = { message: "Unsubscribed" };
  }

  async getAll(context: any) {
    const all = await Subscriptions.get();
    context.response.body = all;
  }
}

export default new Controller();
