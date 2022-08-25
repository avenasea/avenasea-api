import {
  Contract,
  Comment,
  ChangeHistory,
  ContractField,
} from "../models/mongo/contract.ts";
import type { AuthorisedContext } from "../types/context.ts";
import { getRandomId } from "../utils/randomId.ts";

class Controller {
  async getMyContracts(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const userID = context.state.user.id;

    const contract = await mongo
      .collection<Pick<Contract, "id" | "name" | "created_at">>("contracts")
      .find(
        {
          "parties.userID": userID,
        },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            created_at: 1,
          },
        }
      )
      .toArray();

    context.response.status = 200;
    context.response.body = contract;
  }
  async create(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const body = JSON.parse(await context.request.body().value);

    try {
      const schema = JSON.parse(await Deno.readTextFile("./newSchema.json"));
      const fields: ContractField[] = Object.entries(schema.properties).map(
        ([key, val]: [string, any]) => {
          return {
            fieldName: key,
            schemaData: val,
            currentValue: null,
            changeHistory: [],
            comments: [],
            approvalStatus: {},
          };
        }
      );
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
        fields
      );

      await mongo.collection("contracts").insertOne(item);
      context.response.status = 201;
      context.response.body = {
        id,
      };
    } catch {
      return context.state.sendError(500);
    }
  }
  async getContractById(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const userID = context.state.user.id;

    const contract = await mongo
      .collection<
        Pick<Contract, "id" | "name" | "created_at" | "parties"> & {
          fields: {
            fieldName: ContractField["fieldName"];
            schemaData: { module: string };
          }[];
        }
      >("contracts")
      .findOne(
        { id: contractID },
        {
          projection: {
            _id: 0,
            id: 1,
            name: 1,
            created_at: 1,
            parties: 1,
            "fields.fieldName": 1,
            "fields.schemaData.module": 1,
          },
        }
      );
    if (!contract) {
      context.response.status = 404;
      context.response.body = {
        message: "contract not found",
      };
      return;
    }

    // Check user is party to contract
    if (contract.parties.findIndex((p) => p.userID == userID) == -1)
      return context.state.sendError(401);

    const userIds = contract.parties.map((u) => u.userID);
    const users = await mongo
      .collection("users")
      .find(
        { id: { $in: userIds } },
        {
          projection: {
            _id: 0,
            id: 1,
            username: 1,
          },
        }
      )
      .toArray();
    contract.parties = contract.parties.map((p) => {
      return {
        ...p,
        username: users.find((u) => p.userID == u.id)?.username,
      };
    });

    context.response.status = 200;
    context.response.body = contract;
  }
  async getFieldByName(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const userID = context.state.user.id;
    const { contractID, fieldName } = context.params;

    const contract = await mongo
      .collection<Pick<Contract, "parties" | "fields">>("contracts")
      .findOne(
        {
          id: contractID,
          "fields.fieldName": fieldName,
        },
        {
          projection: {
            _id: 0,
            "fields.$": 1,
            parties: 1,
          },
        }
      );

    if (!contract || !contract.fields[0])
      return context.state.sendError(404, "field not found");

    if (contract.parties.findIndex((p) => p.userID == userID) == -1)
      return context.state.sendError(401);

    context.response.status = 200;
    context.response.body = contract.fields[0];
  }

  async updateField(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const userID = context.state.user.id;
    const contractID = context.params.contractID;
    const body = JSON.parse(await context.request.body().value);

    const contract = await mongo
      .collection<
        Pick<Contract, "parties"> & {
          fields: [{ currentValue: ContractField["currentValue"] }];
        }
      >("contracts")
      .findOne(
        { id: contractID, "fields.fieldName": body.fieldName },
        {
          projection: {
            _id: 0,
            "fields.currentValue.$": 1,
            parties: 1,
          },
        }
      );

    const currentValue = contract?.fields?.[0]?.currentValue;
    if (typeof currentValue == "undefined")
      return context.state.sendError(404, "field not found");

    if (contract?.parties.findIndex((p) => p.userID == userID) == -1)
      return context.state.sendError(401);

    const changeData: ChangeHistory = {
      timestamp: new Date(),
      userID: context.state.user.id,
      changedFrom: currentValue,
      changedTo: body.value,
    };

    await mongo.collection("contracts").updateOne(
      { id: contractID, "fields.fieldName": body.fieldName },
      {
        $set: {
          "fields.$.currentValue": body.value,
          "fields.$.approvalStatus": {},
        },
        $push: {
          "fields.$.changeHistory": { $each: [changeData] },
        },
      }
    );

    context.response.status = 200;
    context.response.body = changeData;
  }
  async createComment(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const userID = context.state.user.id;
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
      {
        id: contractID,
        "fields.fieldName": body.fieldName,
        "parties.userID": userID,
      },
      {
        $push: {
          "fields.$.comments": { $each: [comment] },
        },
      }
    );
    if (update.modifiedCount != 1)
      return context.state.sendError(500, "error creating comment");

    context.response.status = 201;
    context.response.body = comment;
  }

  async approveField(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const contractID = context.params.contractID;
    const userID = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);

    const update = await mongo.collection("contracts").updateOne(
      {
        id: contractID,
        "fields.fieldName": body.fieldName,
        "parties.userID": userID,
      },
      {
        $set: {
          [`fields.$.approvalStatus.${context.state.user.id}`]: {
            choice: body.choice,
          },
        },
      }
    );

    if (update.modifiedCount != 1)
      return context.state.sendError(500, "error approving field");

    context.response.status = 200;
    context.response.body = { userID: context.state.user.id };
  }
}

export default new Controller();
