import type { StandardContext } from "../types/context.ts";

class Controller {
  // todo get db versions
  async index(context: StandardContext) {
    context.response.body = "api 1.0 - " + Deno.env.get("HOST_PROJECT");
  }
}

export default new Controller();
