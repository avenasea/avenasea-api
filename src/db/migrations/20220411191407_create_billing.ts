import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.11/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(`CREATE TABLE IF NOT EXISTS billing (
            user_id string primary key,
            status string,
            stripe_subscription_id string,
            renewal_date string,
            payment_type string,
            plan_id string,
            cancel_at_period_end integer
          )`);
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query(`DROP TABLE billing`);
  }
}
