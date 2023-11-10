import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE users
					DROP COLUMN type
			`);
    await this.client.query(`
				ALTER TABLE searches
					ADD COLUMN type TEXT DEFAULT 'job'
			`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE searches
					DROP COLUMN type
			`);
  }
}
