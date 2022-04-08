import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.5/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE jobs
					ADD COLUMN contact TEXT
			`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE jobs
					DROP COLUMN contact
			`);
  }
}
