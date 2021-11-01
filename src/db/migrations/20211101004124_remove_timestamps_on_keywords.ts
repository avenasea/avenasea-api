import {
  AbstractMigration,
  ClientSQLite,
  Info,
} from "https://deno.land/x/nessie@2.0.2/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE positive
					DROP COLUMN created_at
			`);

    await this.client.query(`
				ALTER TABLE positive
					DROP COLUMN updated_at
			`);

    await this.client.query(`
				ALTER TABLE negative 
					DROP COLUMN created_at
			`);

    await this.client.query(`
				ALTER TABLE negative 
					DROP COLUMN updated_at
			`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
				ALTER TABLE positive
					ADD COLUMN updated_at TEXT
			`);
    await this.client.query(`
				ALTER TABLE positive 
					ADD COLUMN created_at TEXT
			`);
    await this.client.query(`
				ALTER TABLE negative 
					ADD COLUMN updated_at TEXT
			`);
    await this.client.query(`
				ALTER TABLE negative
					ADD COLUMN created_at TEXT
			`);
  }
}
