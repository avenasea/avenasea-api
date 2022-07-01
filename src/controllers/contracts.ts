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
        new Date(),
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

    const contract = (await mongo
      .collection("contracts")
      .findOne({ _id: new Mongo.ObjectId(contractID) })) as Contract;
    console.log(contract);

    // TODO: handle not found

    context.response.status = 200;
    context.response.body = contract;
  }
  async updateField(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const body = JSON.parse(await context.request.body().value);

    // TODO: authorization

    const contract = await mongo.collection("contracts").findOne(
      {
        _id: new Mongo.ObjectId(contractID),
      },
      {
        projection: {
          [`currentData.${body.fieldName}`]: 1,
        },
      }
    );

    if (typeof contract == "undefined") {
      context.response.status = 404;
      context.response.body = {
        message: "contract not founds",
      };
      return;
    }

    const changeData: Contract["changeHistory"]["key"][0] = {
      timestamp: new Date(),
      userID: context.state.user.id,
      changedFrom: contract.currentData[body.fieldName],
      changedTo: body.value,
    };

    await mongo.collection("contracts").updateOne(
      { _id: new Mongo.ObjectId(contractID) },
      {
        $set: {
          [`currentData.${body.fieldName}`]: body.value,
        },
        $push: {
          [`changeHistory.${body.fieldName}`]: { $each: [changeData] },
        },
      }
    );

    context.response.status = 200;
    context.response.body = changeData;
  }
}

export default new Controller();
