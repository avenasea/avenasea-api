import { Contract, Comment, ChangeHistory } from "../models/mongo/contract.ts";
import type { AuthorisedContext } from "../types/context.ts";
import { getRandomId } from "../utils/randomId.ts";

class Controller {
  async create(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const body = JSON.parse(await context.request.body().value);

    try {
      const schema = JSON.parse(await Deno.readTextFile("./newSchema.json"));
      const parties = await mongo
        .collection<{ userID: string; creator: boolean }>("users")
        .find(
          { email: { $in: body.parties } },
          {
            projection: {
              _id: 0,
              userID: "$id",
              creator: { $toBool: false },
            },
          }
        )
        .toArray();

      const id = getRandomId();
      const item = new Contract(
        id,
        body.name,
        new Date(),
        [
          {
            userID: context.state.user.id,
            creator: true,
          },
          ...parties,
        ],
        schema,
        {},
        {},
        []
      );

      await mongo.collection("contracts").insertOne(item);
      context.response.status = 201;
      context.response.body = {
        id,
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

    const contract = (
      await mongo
        .collection("contracts")
        .aggregate<Contract>([
          {
            $match: {
              id: contractID,
            },
          },
          {
            $unwind: "$parties",
          },
          {
            $lookup: {
              from: "users",
              let: {
                userID: "$parties.userID",
                parties: "$parties",
              },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $eq: ["$id", "$$userID"],
                    },
                  },
                },
                {
                  $project: {
                    userID: 1,
                    creator: 1,
                    username: 1,
                  },
                },
                {
                  $replaceRoot: {
                    newRoot: {
                      $mergeObjects: ["$$parties", "$$ROOT"],
                    },
                  },
                },
              ],
              as: "parties",
            },
          },
          {
            $group: {
              _id: "$id",
              data: { $first: "$$ROOT" },
              parties: {
                $push: {
                  $first: "$parties",
                },
              },
            },
          },
          {
            $replaceRoot: {
              newRoot: { $mergeObjects: ["$data", { parties: "$parties" }] },
            },
          },
        ])
        .toArray()
    )?.[0];

    if (!contract) {
      context.response.status = 404;
      context.response.body = {
        message: "contract not found",
      };
      return;
    }

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
        id: contractID,
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

    const changeData: ChangeHistory = {
      timestamp: new Date(),
      userID: context.state.user.id,
      changedFrom: contract.currentData[body.fieldName],
      changedTo: body.value,
    };

    await mongo.collection("contracts").updateOne(
      { id: contractID },
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
  async createComment(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const body = JSON.parse(await context.request.body().value);
    const comment: Comment = {
      id: getRandomId(),
      parentID: body.parentID,
      text: body.text,
      timestamp: new Date(),
      userID: context.state.user.id,
      field: body.fieldName,
    };
    const update = await mongo.collection("contracts").updateOne(
      { id: contractID },
      {
        $push: {
          comments: { $each: [comment] },
        },
      }
    );
    if (update.modifiedCount != 1) {
      context.response.body = {
        error: "error creating comment",
      };
      return (context.response.status = 500);
    }
    context.response.status = 201;
    context.response.body = comment;
  }

  async approveField(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const body = JSON.parse(await context.request.body().value);

    await mongo.collection("contracts").updateOne(
      {
        id: contractID,
        "parties.userID": context.state.user.id,
      },
      {
        $set: {
          [`parties.$.fieldsApproved.${body.fieldName}`]: {
            choice: body.choice,
          },
        },
      }
    );

    context.response.status = 200;
    context.response.body = { userID: context.state.user.id };
  }
}

export default new Controller();
