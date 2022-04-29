import {
  AbstractMigration,
  Info,
  ClientSQLite,
} from "https://deno.land/x/nessie@2.0.5/mod.ts";

export default class extends AbstractMigration<ClientSQLite> {
  /** Runs on migrate */
  async up(info: Info): Promise<void> {
    await this.client.query(
      `
            INSERT INTO plans (
                id,
                name,
                cost,
                billing_frequency,
                stripe_price_id,
                job_search_profiles,
                candidate_search_profiles,
                type
            ) VALUES (?,?,?,?,?,?,?,?)
        `,
      [7, "Full Access", 10000, "once", null, -1, -1, "recruiter"]
    );
  }

  /** Runs on rollback */
  async down(info: Info): Promise<void> {
    await this.client.query("DELETE FROM plans WHERE id=7");
  }
}
