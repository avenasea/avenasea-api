import Base from "./_base.ts";

class Plans extends Base {
  constructor() {
    super();
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

export default new Plans();
