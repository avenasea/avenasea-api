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
    const users = totalUsers?.pop()?.total;
    const searches = totalSearches?.pop()?.total;

    context.response.body = {
      users,
      searches,
    };
  }
}

export default new Controller();
