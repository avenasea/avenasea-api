import { db } from "../db.ts";

class Controller {
  async stats(context: any) {
    const totalUsers = await db.queryEntries(
      "SELECT count(*) as total from users",
    );
    const totalSearches = await db.queryEntries(
      "SELECT count(*) as total from searches",
    );

    context.response.status = 200;
    context.response.body = {
      users: totalUsers.pop().total,
      searches: totalSearches.pop().total,
    };
  }
}

export default new Controller();
