import type { StandardContext, AuthorisedContext } from "../types/context.ts";
import { JobModel } from "../models/mongo/jobs.ts";
import { PositiveModel } from "../models/mongo/positive.ts";
import { NegativeModel } from "../models/mongo/negative.ts";

class Controller {
  async post(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, pay, contact, description } = body;
    const data: any = {};
    const job_id = crypto.randomUUID();

    // insert name of search
    const jobData: JobModel = {
      id: job_id,
      user_id: id,
      title,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type,
      pay,
      contact,
      description,
    };
    await mongo.collection("jobs").insertOne(jobData);

    // add positive keywords
    for (let word of positive) {
      const positiveData: PositiveModel = {
        id: crypto.randomUUID(),
        search_id: job_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("positive").insertOne(positiveData);
    }

    // add negative keywords
    for (let word of negative) {
      const negativeData: NegativeModel = {
        id: crypto.randomUUID(),
        search_id: job_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("negative").insertOne(negativeData);
    }

    data.positive = positive;
    data.negative = negative;
    data.title = title;
    data.pay = pay;
    data.description = description;
    data.contact = contact;

    context.response.status = 201;
    context.response.body = data;
  }

  delete(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const id = context.params.id;

    mongo.collection("jobs").deleteMany({ id: id });
    mongo.collection("positive").deleteMany({ search_id: id });
    mongo.collection("negative").deleteMany({ search_id: id });

    context.response.status = 200;
    context.response.body = { message: "Job has been deleted" };
  }

  async getMyJobs(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const id = context.state.user.id;
    const all = await mongo
      .collection<JobModel>("jobs")
      .find({ user_id: id })
      .toArray();

    context.response.body = all;
  }

  async getAll(context: StandardContext) {
    const mongo = context.state.mongo;
    const all = await mongo
      .collection("jobs")
      .aggregate<JobModel & { username: string }>([
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "id",
            as: "user",
            pipeline: [
              {
                $project: {
                  username: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$$ROOT", "$user"],
            },
          },
        },
        {
          $project: {
            user: 0,
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray();

    context.response.body = all;
  }

  async getByTag(context: StandardContext) {
    const mongo = context.state.mongo;
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = await mongo
      .collection("jobs")
      .aggregate<JobModel & { username: string; word: string }>([
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "id",
            as: "user",
            pipeline: [
              {
                $project: {
                  username: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "positive",
            localField: "id",
            foreignField: "search_id",
            as: "positive",
            pipeline: [
              {
                $project: {
                  word: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $unwind: {
            path: "$positive",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$$ROOT", "$user", "$positive"],
            },
          },
        },
        {
          $match: {
            word: tag,
          },
        },
        {
          $project: {
            user: 0,
            positive: 0,
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray();

    context.response.body = all;
  }

  async getByUsername(context: StandardContext) {
    const mongo = context.state.mongo;
    const { username } = context.params;

    const all = await mongo
      .collection("jobs")
      .aggregate<JobModel & { username: string }>([
        {
          $lookup: {
            from: "users",
            localField: "user_id",
            foreignField: "id",
            as: "user",
            pipeline: [
              {
                $project: {
                  username: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$user",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $replaceRoot: {
            newRoot: {
              $mergeObjects: ["$$ROOT", "$user"],
            },
          },
        },
        {
          $match: {
            username: username.toLowerCase(),
          },
        },
        {
          $project: {
            user: 0,
          },
        },
        {
          $sort: {
            created_at: -1,
          },
        },
      ])
      .toArray();

    context.response.body = all;
  }
  async getOne(context: StandardContext) {
    const mongo = context.state.mongo;
    // const id = context.state.user.id;
    const job_id = context.params.id;

    const data = (
      await mongo
        .collection("jobs")
        .aggregate<
          JobModel & { username: string; positive: string; negative: string }
        >([
          {
            $match: {
              id: job_id,
            },
          },
          {
            $lookup: {
              from: "users",
              localField: "user_id",
              foreignField: "id",
              as: "user",
              pipeline: [
                {
                  $project: {
                    username: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "positive",
              localField: "id",
              foreignField: "search_id",
              as: "positive",
              pipeline: [
                {
                  $project: {
                    word: 1,
                  },
                },
              ],
            },
          },
          {
            $lookup: {
              from: "negative",
              localField: "id",
              foreignField: "search_id",
              as: "negative",
              pipeline: [
                {
                  $project: {
                    word: 1,
                  },
                },
              ],
            },
          },
          {
            $unwind: {
              path: "$user",
              preserveNullAndEmptyArrays: true,
            },
          },
          {
            $replaceRoot: {
              newRoot: {
                $mergeObjects: ["$$ROOT", "$user"],
              },
            },
          },
          {
            $set: {
              positive: {
                $map: {
                  input: "$positive",
                  as: "pos",
                  in: "$$pos.word",
                },
              },
              negative: {
                $map: {
                  input: "$negative",
                  as: "neg",
                  in: "$$neg.word",
                },
              },
            },
          },
          {
            $project: {
              user: 0,
            },
          },
          {
            $sort: {
              created_at: -1,
            },
          },
        ])
        .toArray()
    )?.[0];

    context.response.body = data;
  }

  async update(context: AuthorisedContext) {
    const mongo = context.state.mongo;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, title, type, contact, pay, description } = body;
    const data: any = {};
    const job_id = context.params.id;

    await mongo.collection("jobs").updateOne(
      { id: job_id },
      {
        $set: {
          title,
          type,
          contact,
          pay,
          description,
          updated_at: new Date().toISOString(),
        },
      }
    );

    await mongo.collection("positive").deleteMany({ search_id: job_id });

    for (let word of positive) {
      const positiveData: PositiveModel = {
        id: crypto.randomUUID(),
        search_id: job_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("positive").insertOne(positiveData);
    }

    // add negative keywords
    await mongo.collection("negative").deleteMany({ search_id: job_id });

    for (let word of negative) {
      const negativeData: NegativeModel = {
        id: crypto.randomUUID(),
        search_id: job_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("negative").insertOne(negativeData);
    }

    data.positive = positive;
    data.negative = negative;
    data.title = title;
    data.pay = pay;
    data.description = description;
    data.contact = contact;
    data.type = type;

    context.response.status = 201;
    context.response.body = data;
  }
}

export default new Controller();
