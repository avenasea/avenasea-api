import { db } from "../db.ts";

class Users {
  static async find(id: number) {
    const query = db.prepareQuery<any[]>(`
      SELECT
      *
      FROM plans WHERE id = :id`);

    return await query.oneEntry({ id });
  }

  static async findAll() {
    const query = db.prepareQuery<any[]>(`
      SELECT
      *
      FROM plans`);

    return await query.allEntries();
  }
}

export default Users;
