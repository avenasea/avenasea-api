import {
  AbstractMigration,
  ClientSQLite,
  Info,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE IF NOT EXISTS jobs (
				id STRING PRIMARY KEY,
				user_id STRING NOT NULL,
				title STRING NOT NULL,
				description STRING NOT NULL,
				pay STRING NOT NULL,
				type STRING NOT NULL,
				created_at TEXT,
				updated_at TEXT
			)`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE jobs`);
  }
}
