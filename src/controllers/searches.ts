// import Searches from "../models/searches.ts";
import { db } from "../db.ts";

class Controller {
  async post(context: any) {
    const id = context.state.user.id;
    const body = JSON.parse(await context.request.body().value);
    const { positive, negative, name } = body;
    const data: any = {};
    const search_id = crypto.randomUUID();

    // insert name of search
    await db.query(
      "INSERT INTO searches (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
      [search_id, id, name, new Date().toISOString(), new Date().toISOString()],
    );

    // add positive keywords
    for (let word of positive) {
      await db.query(
        "INSERT INTO positive (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word],
      );
    }

    // add negative keywords
    for (let word of negative) {
      await db.query(
        "INSERT INTO negative (id, search_id, word) VALUES (?, ?, ?)",
        [crypto.randomUUID(), search_id, word],
      );
    }

    data.positive = positive;
    data.negative = negative;
    data.name = name;

    context.response.status = 201;
    context.response.body = data;
  }

  async delete(context: any) {
    const id = context.params.id;
    
    await db.query("DELETE FROM searches WHERE id = ?", [id]);
    await db.query("DELETE FROM positive WHERE search_id = ?", [id]);
    await db.query("DELETE FROM negative WHERE search_id = ?", [id]);

    context.response.status = 204;
  }

  async getAll(context: any) {
    const id = context.state.user.id;
    const all = await db.queryEntries(
      "SELECT * FROM searches WHERE user_id = ?",
      [id],
    );

    context.response.body = all;
  }

  async getOne(context: any) {
    const id = context.state.user.id;
    const search_id = context.params.id;
    const data = await db.queryEntries(
      "SELECT * FROM searches WHERE user_id = ? AND id = ?",
      [id, search_id],
    );

    context.response.body = data;
  }
}

export default new Controller();
