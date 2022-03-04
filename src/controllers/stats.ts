import { db } from "../db.ts";

class Controller {
  async stats(context: any) {
    const totalUsers = await db.queryEntries(
      "SELECT count(*) as total from users"
    );
    const totalSearches = await db.queryEntries(
      "SELECT count(*) as total from searches"
    );

    context.response.status = 200;
    const users = totalUsers?.pop()?.total;
    const searches = totalSearches?.pop()?.total;

    context.response.body = {
      users,
      searches,
    };
  }

  async tags(context: any) {
    const tags = await db.queryEntries(
      "SELECT DISTINCT word from positive ORDER BY word"
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }
}

export default new Controller();
