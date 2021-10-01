import {
  AbstractMigration,
  ClientSQLite,
  Info,
} from "https://deno.land/x/nessie@2.0.1/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE users (
				id string primary key,
				email string unique,
				hashedPassword string
			)`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE users`);
  }
}
