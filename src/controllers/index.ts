class Controller {
  async index(context: any) {
    context.response.body = "api 1.0";
  }
}

export default new Controller();
