import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.5/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`
        ALTER TABLE users
        ADD COLUMN password_reset_token TEXT
    `);
    await this.client.query(`
        ALTER TABLE users
        ADD COLUMN password_reset_expiry INT
    `);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`
        ALTER TABLE users
        DROP COLUMN password_reset_token TEXT
      `);
    await this.client.query(`
        ALTER TABLE users
        DROP COLUMN password_reset_expiry INT
    `);
  }
}
