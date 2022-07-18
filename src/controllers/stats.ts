import type { StandardContext } from "../types/context.ts";
import { getLastSunday } from "../utils/dates.ts";

class Controller {
  async stats(context: StandardContext) {
    const db = context.state.db;
    const totalUsers = await db.queryObject(
      "SELECT count(*) as total from users"
    );

    const totalSearches = await db.queryObject(
      "SELECT count(*) as total from searches"
    );

    const totalJobs = await db.queryObject(
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

  async tags(context: StandardContext) {
    const db = context.state.db;
    const tags = await db.queryObject(
      "SELECT word, COUNT(word) as count from positive GROUP BY word ORDER BY count DESC LIMIT 50"
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }

  async jobTags(context: StandardContext) {
    const db = context.state.db;
    const tags = await db.queryObject(
      `SELECT p.word, COUNT(p.word) as count from positive as p INNER JOIN jobs j ON j.id = p.search_id GROUP BY word ORDER BY count DESC LIMIT 50`
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }

  async historyTags(context: StandardContext) {
    const db = context.state.db;
    const today = new Date();
    const prevSunday = getLastSunday(today);

    console.log("today: ", today, "prev sunday: ", prevSunday);

    const tags = await db.queryObject(
      `SELECT p.word, COUNT(p.word) as count from positive as p INNER JOIN search_history h ON h.search_id = p.search_id WHERE h.created_at > ? GROUP BY word ORDER BY count DESC LIMIT 50`,
      prevSunday.toISOString()
    );

    context.response.status = 200;

    context.response.body = {
      tags,
    };
  }
}

export default new Controller();
