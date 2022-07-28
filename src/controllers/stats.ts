import type { StandardContext } from "../types/context.ts";
import { getLastSunday } from "../utils/dates.ts";

class Controller {
  async stats(context: StandardContext) {
    const mongo = context.state.mongo;

    const users = await mongo.collection("users").countDocuments();
    const searches = await mongo.collection("searches").countDocuments();
    const jobs = await mongo.collection("jobs").countDocuments();

    context.response.status = 200;
    context.response.body = {
      users,
      searches,
      jobs,
    };
  }

  async tags(context: StandardContext) {
    const mongo = context.state.mongo;
    const tags = await mongo
      .collection("positive")
      .aggregate<{ word: string; count: number }>([
        {
          $group: {
            _id: "$word",
            count: {
              $count: {},
            },
          },
        },
        {
          $project: {
            _id: 0,
            word: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 50,
        },
      ])
      .toArray();

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }

  async jobTags(context: StandardContext) {
    const mongo = context.state.mongo;

    const tags = await mongo
      .collection("positive")
      .aggregate<{ word: string; count: number }>([
        {
          $lookup: {
            from: "jobs",
            localField: "search_id",
            foreignField: "id",
            as: "jobs",
          },
        },
        {
          $match: {
            jobs: { $ne: [] },
          },
        },
        {
          $group: {
            _id: "$word",
            count: {
              $count: {},
            },
          },
        },
        {
          $project: {
            _id: 0,
            word: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 50,
        },
      ])
      .toArray();
    context.response.status = 200;
    context.response.body = {
      tags,
    };
  }

  async historyTags(context: StandardContext) {
    const mongo = context.state.mongo;
    const today = new Date();
    const prevSunday = getLastSunday(today);
    console.log("today: ", today, "prev sunday: ", prevSunday);

    const tags = await mongo
      .collection("positive")
      .aggregate<{ word: string; count: number }>([
        {
          $lookup: {
            from: "search_history",
            localField: "search_id",
            foreignField: "search_id",
            as: "history",
          },
        },
        {
          $match: {
            history: { $ne: [] },
          },
        },
        {
          $group: {
            _id: "$word",
            count: {
              $count: {},
            },
          },
        },
        {
          $project: {
            _id: 0,
            word: "$_id",
            count: 1,
          },
        },
        {
          $sort: {
            count: -1,
          },
        },
        {
          $limit: 50,
        },
      ])
      .toArray();
    context.response.status = 200;
    context.response.body = {
      tags,
    };
  }
}

export default new Controller();
