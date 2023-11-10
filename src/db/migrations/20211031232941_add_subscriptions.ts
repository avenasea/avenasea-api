import {
  AbstractMigration,
  ClientSQLite,
  Info,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE IF NOT EXISTS searches (
				id STRING PRIMARY KEY,
				account_id STRING NOT NULL,
				name STRING NOT NULL,
				created_at TEXT,
				updated_at TEXT
			)`);

    await this.client.query(`CREATE TABLE IF NOT EXISTS positive (
				id string PRIMARY KEY,
				search_id STRING NOT NULL,
				word string NOT NULL,
				created_at TEXT,
				updated_at TEXT
			)`);

    await this.client.query(`CREATE TABLE IF NOT EXISTS negative (
				id string PRIMARY KEY,
				search_id STRING NOT NULL,
				word STRING NOT NULL,
				created_at TEXT,
				updated_at TEXT
			)`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE searches`);
    await this.client.query(`DROP TABLE positive`);
    await this.client.query(`DROP TABLE negative`);
  }
}
