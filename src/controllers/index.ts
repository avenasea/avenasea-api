class Controller {
  async index(context: any) {
    context.response.body = "api 1.0 - " + Deno.env.get("HOST_PROJECT");
  }
}

export default new Controller();
