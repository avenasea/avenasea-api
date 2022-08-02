import { checkPerms } from "../middleware/perms.ts";
import type { StandardContext, AuthorisedContext } from "../types/context.ts";
import { SearchModel } from "../models/mongo/searches.ts";
import { PositiveModel } from "../models/mongo/positive.ts";
import { NegativeModel } from "../models/mongo/negative.ts";
import { SearchHistoryModel } from "../models/mongo/search_history.ts";
import { getLastSunday, getOneWeekAgo } from "../utils/dates.ts";

class Controller {
  async post(context: AuthorisedContext) {
    const { mongo } = context.state;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name, type } = body;
    const data: any = {};
    const search_id = crypto.randomUUID();

    if ((await checkPerms(id, type)) == false) {
      context.response.status = 403;
      context.response.body = {
        message: "User is not a paid subscriber",
      };
      return;
    }

    // insert name of search
    const searchData: SearchModel = {
      id: search_id,
      user_id: id,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      type,
    };
    await mongo.collection("searches").insertOne(searchData);

    // add positive keywords
    for (let word of positive) {
      const positiveData: PositiveModel = {
        id: crypto.randomUUID(),
        search_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("positive").insertOne(positiveData);
    }

    // add negative keywords
    for (let word of negative) {
      const negativeData: NegativeModel = {
        id: crypto.randomUUID(),
        search_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("negative").insertOne(negativeData);
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
  }

  delete(context: AuthorisedContext) {
    const { mongo } = context.state;
    const id = context.params.id;

    mongo.collection("searches").deleteMany({ id: id });
    mongo.collection("positive").deleteMany({ search_id: id });
    mongo.collection("negative").deleteMany({ search_id: id });

    context.response.status = 200;
    context.response.body = { message: "Search has been deleted" };
  }

  async getAll(context: AuthorisedContext) {
    const { mongo } = context.state;
    const id = context.state.user.id;
    const type = context.request.url.searchParams.get("type") || "job";

    const all = await mongo
      .collection<SearchModel>("searches")
      .find({ user_id: id, type })
      .toArray();

    context.response.body = all;
  }

  async getByTag(context: StandardContext) {
    const { mongo } = context.state;
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = await mongo
      .collection("searches")
      .aggregate<SearchModel & { username: string; word: string }>([
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

  async getHistoryByTag(context: StandardContext) {
    const { mongo } = context.state;
    const tag = context.params.tag.replace(/-+/g, " ");
    const today = new Date();
    const prevSunday = getOneWeekAgo(today);

    console.log("today: ", today, "prev sunday: ", prevSunday);

    const all = await mongo
      .collection("search_history")
      .aggregate<SearchHistoryModel & { username: string; word: string }>([
        {
          $match: {
            created_at: { $gt: prevSunday.toISOString() },
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
            localField: "search_id",
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

    context.response.body = all.filter((value, index, self) => {
      return self.findIndex((v) => v.url === value.url) === index;
    });
  }

  async getByUsername(context: StandardContext) {
    const { mongo } = context.state;
    const { username } = context.params;

    const all = await mongo
      .collection("searches")
      .aggregate<SearchModel & { username: string }>([
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
            type: "job",
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

  async getCandidates(context: AuthorisedContext) {
    // todo
    // get search obj
    // find other searches (type job) where positive and negative match
    // join on user
    // return users
    const { mongo } = context.state;
    const id = context.state.user.id;
    const search_id = context.params.id;
    console.log(id, search_id);
    const positive = await mongo
      .collection<PositiveModel>("positive")
      .find({ search_id })
      .toArray();
    const negative = await mongo
      .collection<NegativeModel>("negative")
      .find({ search_id })
      .toArray();
    console.log("positive: ", positive, " negative: ", negative);
    const pWords = <[]>positive.map((p: any) => p.word);
    const nWords = <[]>negative.map((n: any) => n.word);
    console.log("pWords", pWords);
    console.log("nWords", nWords);
    /*
    const searches = await db.queryObject(
      `SELECT s.* FROM searches s, positive p, negative n
      INNER JOIN positive ON s.id = positive.search_id
      INNER JOIN negative ON s.id = negative.search_id
       WHERE p.word IN (${pIn}) AND p.word NOT IN (${nIn})
       `,
      args
    );

       */
    console.log(positive);
    const searches = await mongo
      .collection("searches")
      .aggregate<SearchModel & { user: { contactme: 0 | 1; email: string } }>([
        {
          $lookup: {
            from: "positive",
            localField: "id",
            foreignField: "search_id",
            as: "positive",
            pipeline: [
              {
                $project: {
                  _id: 0,
                  word: 1,
                },
              },
            ],
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
                  _id: 0,
                  contactme: 1,
                  email: 1,
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
          $match: {
            "positive.word": { $nin: nWords },
          },
        },
        {
          $match: {
            "positive.word": { $in: pWords },
          },
        },
        {
          $match: {
            user_id: { $ne: id },
            "user.contactme": 1,
            type: "job",
          },
        },
      ])
      .toArray();

    console.log("searches: ", searches);
    /*
    const searches = db.queryObject(`
      SELECT s.*,
        p.word as posWord,
        n.word as negWord
      FROM searches s
      INNER JOIN positive p
        ON p.search_id = s.id
      INNER JOIN negative n
      ON n.search_id = s.id
      GROUP BY n.id AND p.id
    `);

    console.log(searches);
*/
    context.response.body = searches;
  }

  async getOne(context: StandardContext) {
    const { mongo } = context.state;
    // const id = context.state.user.id;
    const search_id = context.params.id;
    const data = (
      await mongo
        .collection("searches")
        .aggregate<
          SearchModel & { username: string; positive: string; negative: string }
        >([
          {
            $match: {
              id: search_id,
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
    const { mongo } = context.state;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name, type } = body;
    const data: any = {};
    const search_id = context.params.id;

    // insert name of search
    await mongo.collection("searches").updateOne(
      { id: search_id },
      {
        $set: {
          name,
          type,
          updated_at: new Date().toISOString(),
        },
      }
    );

    // add positive keywords
    await mongo.collection("positive").deleteMany({ search_id });

    for (let word of positive) {
      const positiveData: PositiveModel = {
        id: crypto.randomUUID(),
        search_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("positive").insertOne(positiveData);
    }

    // add negative keywords
    await mongo.collection("negative").deleteMany({ search_id });

    for (let word of negative) {
      const negativeData: NegativeModel = {
        id: crypto.randomUUID(),
        search_id,
        word: word.trim().toLowerCase(),
      };
      await mongo.collection("negative").insertOne(negativeData);
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
  }

  async getAllHistory(context: AuthorisedContext) {
    const { mongo } = context.state;
    const today = new Date();
    const prevSunday = getOneWeekAgo(today);

    console.log("today: ", today, "prev sunday: ", prevSunday);

    const all = await mongo
      .collection("search_history")
      .aggregate<SearchHistoryModel & { positive: string[]; name: string }>([
        {
          $match: {
            created_at: { $lt: prevSunday.toISOString() },
          },
        },
        {
          $limit: 1000,
        },
        {
          $lookup: {
            from: "positive",
            localField: "search_id",
            foreignField: "search_id",
            as: "positive",
            pipeline: [
              {
                $project: {
                  _id: 0,
                  word: 1,
                },
              },
            ],
          },
        },
        {
          $lookup: {
            from: "searches",
            localField: "search_id",
            foreignField: "id",
            as: "search",
            pipeline: [
              {
                $project: {
                  name: 1,
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$search",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $sort: {
            created_at: -1,
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
            name: "$search.name",
          },
        },
        {
          $project: {
            search: 0,
            _id: 0,
          },
        },
      ])
      .toArray();

    context.response.body = all;
  }
}

export default new Controller();
