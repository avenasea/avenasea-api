import { AbstractMigration, Info, ClientSQLite } from "https://deno.land/x/nessie@2.0.2/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
    /** Runs on migrate */
    async up(info: Info): Promise<void> {
			await this.client.query(`ALTER TABLE searches
				RENAME COLUMN account_id TO user_id
			`);
    }

    /** Runs on rollback */
    async down(info: Info): Promise<void> {
			await this.client.query(`ALTER TABLE searches
				RENAME COLUMN user_id TO account_id
			`);
    }
}
