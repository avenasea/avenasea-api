import Users from "../models/users.ts";
import { checkPerms } from "../middleware/perms.ts";
import type { StandardContext, AuthorisedContext } from "../types/context.ts";

class Controller {
  async post(context: AuthorisedContext) {
    const { db, mongo } = context.state;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name, type } = body;
    const data: any = {};
    const search_id = crypto.randomUUID();
    console.log(await checkPerms(id, type, db));
    if ((await checkPerms(id, type, db)) == false) {
      context.response.status = 403;
      context.response.body = {
        message: "User is not a paid subscriber",
      };
      return;
    }

    // insert name of search
    await db.queryObject(
      "INSERT INTO searches (id, user_id, name, created_at, updated_at, type) VALUES (?, ?, ?, ?, ?, ?)",
      search_id,
      id,
      name,
      new Date().toISOString(),
      new Date().toISOString(),
      type
    );

    // add positive keywords
    for (let word of positive) {
      await db.queryObject(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        search_id,
        word.trim().toLowerCase()
      );
    }

    // add negative keywords
    for (let word of negative) {
      await db.queryObject(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        search_id,
        word.trim().toLowerCase()
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
  }

  async delete(context: AuthorisedContext) {
    const { db, mongo } = context.state;
    const id = context.params.id;

    await db.queryObject("DELETE FROM searches WHERE id = ?", id);
    await db.queryObject("DELETE FROM positive WHERE search_id = ?", id);
    await db.queryObject("DELETE FROM negative WHERE search_id = ?", id);

    context.response.status = 200;
    context.response.body = { message: "Search has been deleted" };
  }

  async getAll(context: AuthorisedContext) {
    const { db, mongo } = context.state;
    const id = context.state.user.id;
    const type = context.request.url.searchParams.get("type") || "job";
    const all = await db.queryObject(
      "SELECT * FROM searches WHERE user_id = ? AND type = ?",
      id,
      type
    );

    context.response.body = all;
  }

  async getByTag(context: StandardContext) {
    const { db, mongo } = context.state;
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = await db.queryObject(
      `
        SELECT s.*, u.username FROM searches as s
        INNER JOIN users u, positive p ON s.user_id = u.id AND s.id = p.search_id WHERE p.word = ? ORDER BY s.created_at DESC
    `,
      tag
    );

    context.response.body = all;
  }

  async getHistoryByTag(context: StandardContext) {
    const { db, mongo } = context.state;
    const tag = context.params.tag.replace(/-+/g, " ");
    const today = new Date();
    const prevSunday = new Date(today.valueOf()) || new Date();
    prevSunday.setDate(prevSunday.getDate() - ((prevSunday.getDay() + 7) % 7));

    console.log("today: ", today, "prev sunday: ", prevSunday);

    const all = await db.queryObject(
      `
        SELECT h.*, p.word FROM search_history as h
        INNER JOIN users u, positive p ON h.user_id = u.id AND h.search_id = p.search_id WHERE p.word = ? AND h.created_at > ? ORDER BY h.created_at DESC
    `,
      tag,
      prevSunday.toISOString()
    );

    context.response.body = all.filter((value, index, self) => {
      return self.findIndex((v) => v.url === value.url) === index;
    });
  }

  async getByUsername(context: StandardContext) {
    const { db, mongo } = context.state;
    const { username } = context.params;

    const all = await db.queryObject(
      `
        SELECT s.*, u.username FROM searches as s
        INNER JOIN users u ON s.user_id = u.id WHERE u.username = ? AND s.type = 'job' ORDER BY s.created_at DESC
    `,
      username
    );

    context.response.body = all;
  }

  async getCandidates(context: AuthorisedContext) {
    // todo
    // get search obj
    // find other searches (type job) where positive and negative match
    // join on user
    // return users
    const { db, mongo } = context.state;
    const users = new Users(db, mongo);
    const id = context.state.user.id;
    const search_id = context.params.id;
    console.log(id, search_id);
    const positive = await db.queryObject(
      `SELECT * FROM positive WHERE search_id = ?`,
      search_id
    );
    const negative = await db.queryObject(
      `SELECT * FROM negative WHERE search_id = ?`,
      search_id
    );
    console.log("positive: ", positive, " negative: ", negative);
    let pIn = "";
    let nIn = "";
    positive.forEach((p: any, i: any) => {
      pIn += "?" + (i < positive.length - 1 ? "," : "");
    });

    negative.forEach((n: any, i: any) => {
      nIn += "?" + (i < negative.length - 1 ? "," : "");
    });
    console.log("pIn", pIn);
    const pWords = <[]>positive.map((p: any) => p.word);
    const nWords = <[]>negative.map((n: any) => n.word);
    console.log("pWords", pWords);
    const args = ([] as string[]).concat(pWords, nWords, id);
    console.log("args", args);
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
    let searches = await db.queryObject(
      `SELECT s.*
        FROM searches s
        WHERE EXISTS (SELECT 1 FROM positive p WHERE p.word IN (${pIn}) AND p.search_id = s.id)
        AND NOT EXISTS (SELECT 1 FROM positive p WHERE p.word IN (${nIn}) AND p.search_id = s.id)
        AND s.type = 'job' AND s.user_id != ?
       `,
      ...args
    );

    for (let search of searches) {
      const { user_id } = search as { user_id: string };
      const user = await users.find(user_id);
      search.user = user;
    }

    // filter out those who wish to not be contacted
    searches = searches.filter((search: any) => {
      return search.user.contactme;
    });

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
    const { db, mongo } = context.state;
    // const id = context.state.user.id;
    const search_id = context.params.id;
    let data =
      (await db
        .queryObject(
          "SELECT s.*, u.username FROM searches as s INNER JOIN users u ON s.user_id = u.id WHERE s.id = ?",
          search_id
        )
        .pop()) || {};

    const positive = await db.queryObject(
      "SELECT word FROM positive WHERE search_id = ?",
      search_id
    );

    const negative = await db.queryObject(
      "SELECT word FROM negative WHERE search_id = ?",
      search_id
    );

    data.positive = positive.map((w: any) => w.word);
    data.negative = negative.map((w: any) => w.word);
    context.response.body = data;
  }

  async update(context: AuthorisedContext) {
    const { db, mongo } = context.state;
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name, type } = body;
    const data: any = {};
    const search_id = context.params.id;

    // insert name of search
    await db.queryObject(
      "UPDATE searches SET name = ?, updated_at = ?, type = ? WHERE id = ?",
      name,
      new Date().toISOString(),
      type,
      search_id
    );

    // add positive keywords
    await db.queryObject("DELETE from positive WHERE search_id = ?", search_id);

    for (let word of positive) {
      await db.queryObject(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        search_id,
        word.trim().toLowerCase()
      );
    }

    // add negative keywords
    await db.queryObject("DELETE from negative WHERE search_id = ?", search_id);

    for (let word of negative) {
      await db.queryObject(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        crypto.randomUUID(),
        search_id,
        word.trim().toLowerCase()
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
  }

  async getAllHistory(context: AuthorisedContext) {
    const { db, mongo } = context.state;
    const today = new Date();
    const prevSunday = new Date(today.valueOf()) || new Date();
    prevSunday.setDate(prevSunday.getDate() - ((prevSunday.getDay() + 7) % 7));

    console.log("today: ", today, "prev sunday: ", prevSunday);
    const all = await db.queryObject(
      // "SELECT * FROM search_history WHERE created_at > ?",

      `
      SELECT h.*, s.name FROM search_history as h
        INNER JOIN users u, positive p, searches as s ON h.user_id = u.id AND h.search_id = p.search_id  AND s.id = h.search_id WHERE h.created_at > ? ORDER BY h.created_at DESC LIMIT 1000
        `,
      prevSunday.toISOString()
    );

    all.map((row) => {
      const search_id = row.search_id;
      console.log("search_id: ", search_id);

      const positive = db.queryObject(
        `SELECT p.word FROM positive as p WHERE p.search_id = ?`,
        search_id
      );

      row.positive = positive.map((w) => w.word);
    });

    context.response.body = all;
  }
}

export default new Controller();
