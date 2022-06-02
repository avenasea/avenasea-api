
import { DB, MongoDatabase } from '../deps.ts';

class Plans {
	db: DB;
	mongo: MongoDatabase;

	constructor(db: any, mongo: any) {
		this.db = db;
		this.mongo = mongo;
	}

  async find(id: number) {
    const query = this.db.prepareQuery<any[]>(`
      SELECT
      *
      FROM plans WHERE id = :id`);

    return await query.oneEntry({ id });
  }

  async findAll() {
    const query = this.db.prepareQuery<any[]>(`
      SELECT
      *
      FROM plans`);

    return await query.allEntries();
  }
}

export default Plans;
