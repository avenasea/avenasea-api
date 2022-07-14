import { DB, MongoDatabase } from "../deps.ts";

class Plans {
  db: DB;
  mongo: MongoDatabase;

  constructor(db: any, mongo: any) {
    this.db = db;
    this.mongo = mongo;
  }

  find(id: number) {
    const query = this.db.queryObject<any>(
      `
      SELECT
      *
      FROM plans WHERE id = :id`,
      { id }
    )[0];

    return query;
  }

  findAll() {
    const query = this.db.queryObject<any>(`
      SELECT
      *
      FROM plans`);

    return query;
  }
}

export default Plans;
