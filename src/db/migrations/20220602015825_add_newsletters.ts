import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE IF NOT EXISTS newsletters (
				id string primary key,
				email string unique,
                name string,
                phone string,
                contactme INTEGER DEFAULT 1,
                created_at TEXT,
                updated_at TEXT
            )`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE newsletters`);
  }
}
