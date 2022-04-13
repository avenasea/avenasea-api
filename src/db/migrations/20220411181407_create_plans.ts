import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.5/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE IF NOT EXISTS plans (
        id string primary key,
        name string,
        cost integer,
        billing_frequency string,
        stripe_price_id string,
        job_search_profiles integer,
        candidate_search_profiles integer,
        type string
      )`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE plans`);
  }
}
