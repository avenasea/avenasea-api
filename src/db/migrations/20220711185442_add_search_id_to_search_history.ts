import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE search_history
					ADD COLUMN search_id TEXT
			`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE search_history
					DROP COLUMN search_id
			`);
  }
}
