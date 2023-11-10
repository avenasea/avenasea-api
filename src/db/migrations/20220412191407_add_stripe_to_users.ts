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
      ADD COLUMN stripe_customer_id TEXT
    `);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
      ALTER TABLE users
      DROP COLUMN stripe_customer_id
    `);
  }
}
