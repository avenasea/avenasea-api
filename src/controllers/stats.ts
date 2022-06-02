// import { db } from "../db.ts";

class Controller {
  async stats(context: any) {
    const db = context.state.db;
    const totalUsers = await db.queryEntries(
      "SELECT count(*) as total from users"
    );

    const totalSearches = await db.queryEntries(
      "SELECT count(*) as total from searches"
    );

    const totalJobs = await db.queryEntries(
      "SELECT count(*) as total from jobs"
    );

    const users = totalUsers?.pop()?.total;
    const searches = totalSearches?.pop()?.total;
    const jobs = totalJobs?.pop()?.total;

    context.response.status = 200;
    context.response.body = {
      users,
      searches,
      jobs,
    };
  }

  async tags(context: any) {
    const db = context.state.db;
    const tags = await db.queryEntries(
      "SELECT word, COUNT(word) as count from positive GROUP BY word ORDER BY count DESC LIMIT 50"
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }

  async jobTags(context: any) {
    const db = context.state.db;
    const tags = await db.queryEntries(
      `SELECT p.word, COUNT(p.word) as count from positive as p INNER JOIN jobs j ON j.id = p.search_id GROUP BY word ORDER BY count DESC LIMIT 50`
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }
}

export default new Controller();
