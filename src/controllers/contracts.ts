import Contract from "../models/mongo/contract.ts";
import { Mongo } from "../deps.ts";
import type { AuthorisedContext } from "../types/context.ts";

class Controller {
  async create(context: AuthorisedContext) {
    const db = context.state.db;
    const mongo = context.state.mongo;
    const body = JSON.parse(await context.request.body().value);

    try {
      const schema = JSON.parse(await Deno.readTextFile("./newSchema.json"));

      const item = new Contract(
        body.name,
        [
          {
            userID: context.state.user.id,
            creator: true,
          },
        ],
        schema,
        {},
        {}
      );

      const result = await mongo.collection("contracts").insertOne(item);
      context.response.status = 201;
      context.response.body = {
        id: result.toString(),
      };
    } catch {
      // TODO: error handler fn
      context.response.status = 500;
      context.response.body = {
        message: "internal server error",
      };
    }
  }
  async getById(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;

    const contract = await mongo
      .collection("contracts")
      .findOne({ _id: new Mongo.ObjectId(contractID) });
    console.log(contract);

    // TODO: handle not found

    context.response.status = 200;
    context.response.body = contract;
  }
}

export default new Controller();
