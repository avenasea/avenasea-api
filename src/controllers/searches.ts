// import Searches from "../models/searches.ts";
import Users from "../models/users.ts";
import { checkPerms } from "../middleware/perms.ts";
import Base from "./_base.ts";

class Controller extends Base {
  constructor() {
    super();
  }

  async post(context: any) {
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
    await this.db.query(
      "INSERT INTO searches (id, user_id, name, created_at, updated_at, type) VALUES (?, ?, ?, ?, ?, ?)",
      [
        search_id,
        id,
        name,
        new Date().toISOString(),
        new Date().toISOString(),
        type,
      ]
    );

    // add positive keywords
    for (let word of positive) {
      await this.db.query(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word.trim().toLowerCase()]
      );
    }

    // add negative keywords
    for (let word of negative) {
      await this.db.query(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word.trim().toLowerCase()]
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
    this.destroy();
  }

  async delete(context: any) {
    const id = context.params.id;

    await this.db.query("DELETE FROM searches WHERE id = ?", [id]);
    await this.db.query("DELETE FROM positive WHERE search_id = ?", [id]);
    await this.db.query("DELETE FROM negative WHERE search_id = ?", [id]);

    context.response.status = 200;
    context.response.body = { message: "Search has been deleted" };
    this.destroy();
  }

  async getAll(context: any) {
    const id = context.state.user.id;
    const type = context.request.url.searchParams.get("type") || "job";
    const all = await this.db.queryEntries(
      "SELECT * FROM searches WHERE user_id = ? AND type = ?",
      [id, type]
    );

    context.response.body = all;
    this.destroy();
  }

  async getByTag(context: any) {
    const tag = context.params.tag.replace(/-+/g, " ");

    const all = await this.db.queryEntries(
      `
        SELECT s.*, u.username FROM searches as s
        INNER JOIN users u, positive p ON s.user_id = u.id AND s.id = p.search_id WHERE p.word = ? ORDER BY s.created_at DESC
    `,
      [tag]
    );

    context.response.body = all;
    this.destroy();
  }

  async getByUsername(context: any) {
    const { username } = context.params;

    const all = await this.db.queryEntries(
      `
        SELECT s.*, u.username FROM searches as s
        INNER JOIN users u ON s.user_id = u.id WHERE u.username = ? AND s.type = 'job' ORDER BY s.created_at DESC
    `,
      [username]
    );

    context.response.body = all;
    this.destroy();
  }

  async getCandidates(context: any) {
    // todo
    // get search obj
    // find other searches (type job) where positive and negative match
    // join on user
    // return users
    const id = context.state.user.id;
    const search_id = context.params.id;
    console.log(id, search_id);
    const positive = await this.db.queryEntries(
      `SELECT * FROM positive WHERE search_id = ?`,
      [search_id]
    );
    const negative = await this.db.queryEntries(
      `SELECT * FROM negative WHERE search_id = ?`,
      [search_id]
    );
    console.log("positive: ", positive, " negative: ", negative);
    let pIn = "";
    let nIn = "";
    positive.forEach((p, i) => {
      pIn += "?" + (i < positive.length - 1 ? "," : "");
    });

    negative.forEach((n, i) => {
      nIn += "?" + (i < negative.length - 1 ? "," : "");
    });
    console.log("pIn", pIn);
    const pWords = <[]>positive.map((p) => p.word);
    const nWords = <[]>negative.map((n) => n.word);
    console.log("pWords", pWords);
    const args = [].concat(pWords, nWords, id);
    console.log("args", args);
    /*
    const searches = await this.db.queryEntries(
      `SELECT s.* FROM searches s, positive p, negative n
      INNER JOIN positive ON s.id = positive.search_id
      INNER JOIN negative ON s.id = negative.search_id
       WHERE p.word IN (${pIn}) AND p.word NOT IN (${nIn})
       `,
      args
    );

       */
    let searches = await this.db.queryEntries(
      `SELECT s.*
        FROM searches s
        WHERE EXISTS (SELECT 1 FROM positive p WHERE p.word IN (${pIn}) AND p.search_id = s.id)
        AND NOT EXISTS (SELECT 1 FROM positive p WHERE p.word IN (${nIn}) AND p.search_id = s.id)
        AND s.type = 'job' AND s.user_id != ?
       `,
      args
    );

    for (let search of searches) {
      const { user_id } = search as { user_id: string };
      const user = await Users.find(user_id);
      search.user = user;
    }

    // filter out those who wish to not be contacted
    searches = searches.filter((search: any) => {
      return search.user.contactme;
    });

    console.log("searches: ", searches);
    /*
    const searches = this.db.queryEntries(`
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
    this.destroy();
  }

  async getOne(context: any) {
    // const id = context.state.user.id;
    const search_id = context.params.id;
    let data =
      (await this.db
        .queryEntries(
          "SELECT s.*, u.username FROM searches as s INNER JOIN users u ON s.user_id = u.id WHERE s.id = ?",
          [search_id]
        )
        .pop()) || {};

    const positive = await this.db.queryEntries(
      "SELECT word FROM positive WHERE search_id = ?",
      [search_id]
    );

    const negative = await this.db.queryEntries(
      "SELECT word FROM negative WHERE search_id = ?",
      [search_id]
    );

    data.positive = positive.map((w) => w.word);
    data.negative = negative.map((w) => w.word);
    context.response.body = data;
    this.destroy();
  }

  async update(context: any) {
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name, type } = body;
    const data: any = {};
    const search_id = context.params.id;

    // insert name of search
    await this.db.query(
      "UPDATE searches SET name = ?, updated_at = ?, type = ? WHERE id = ?",
      [name, new Date().toISOString(), type, search_id]
    );

    // add positive keywords
    await this.db.query("DELETE from positive WHERE search_id = ?", [
      search_id,
    ]);

    for (let word of positive) {
      await this.db.query(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word.trim().toLowerCase()]
      );
    }

    // add negative keywords
    await this.db.query("DELETE from negative WHERE search_id = ?", [
      search_id,
    ]);

    for (let word of negative) {
      await this.db.query(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word.trim().toLowerCase()]
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
    this.destroy();
  }
}

export default new Controller();
