import { DB, MongoDatabase } from '../deps.ts';

interface UpdateOrInsertParams {
  userID: string;
  status: string;
  stripeSubscriptionID: string | null;
  renewalDate: string;
  paymentType: string;
  planID: string;
  cancelAtPeriodEnd: boolean | number;
}

class Billing {
	db: DB;
	mongo: MongoDatabase;

	constructor(db:any, mongo:any) {
		this.db = db;
		this.mongo = mongo;
	}

  async find(userID: string) {
    const query = this.db.prepareQuery<any[]>(`
      SELECT
      *
      FROM billing WHERE user_id = :userID`);

    return await query.oneEntry({ userID });
  }

  async findAll() {
    const query = this.db.prepareQuery<any[]>(`
      SELECT
      *
      FROM billing`);

    return await query.allEntries();
  }

  async insert(
    userID: string,
    status: string,
    stripeSubscriptionID: string,
    renewalDate: string,
    paymentType: string,
    planID: string
  ) {
    const query = this.db.query<any[]>(
      `
        INSERT INTO billing (
          user_id,
          status,
          stripe_subscription_id,
          renewal_date,
          payment_type,
          plan_id
        ) VALUES (?,?,?,?,?,?)`,
      [userID, status, stripeSubscriptionID, renewalDate, paymentType, planID]
    );

    return await query;
  }

  async updateOrInsert({
    userID,
    status,
    stripeSubscriptionID,
    renewalDate,
    paymentType,
    planID,
    cancelAtPeriodEnd,
  }: UpdateOrInsertParams) {
    const query1 = await this.db.query<any[]>(
      `
      SELECT
      *
      FROM billing WHERE user_id = ?`,
      [userID]
    );
    if (query1.length > 0) {
      console.log("updating");
      return await this.db.query<any[]>(
        `
        UPDATE billing
        SET
          status = ?,
          stripe_subscription_id = ?,
          renewal_date = ?,
          payment_type = ?,
          plan_id = ?,
          cancel_at_period_end = ?
        WHERE user_id = ?`,
        [
          status,
          stripeSubscriptionID,
          renewalDate,
          paymentType,
          planID,
          cancelAtPeriodEnd,
          userID,
        ]
      );
    } else {
      return await this.db.query<any[]>(
        `
        INSERT INTO billing (
          user_id,
          status,
          stripe_subscription_id,
          renewal_date,
          payment_type,
          plan_id,
          cancel_at_period_end
        ) VALUES (?,?,?,?,?,?,?)`,
        [
          userID,
          status,
          stripeSubscriptionID,
          renewalDate,
          paymentType,
          planID,
          cancelAtPeriodEnd,
        ]
      );
    }
  }
}

export default Billing;
