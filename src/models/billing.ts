import { DB, MongoDatabase } from "../deps.ts";

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

  constructor(db: any, mongo: any) {
    this.db = db;
    this.mongo = mongo;
  }

  find(userID: string) {
    const query = this.db.queryObject<any>(
      `
      SELECT
      *
      FROM billing WHERE user_id = :userID`,
      { userID }
    )[0];

    return query;
  }

  findAll() {
    const query = this.db.queryObject<any>(`
      SELECT
      *
      FROM billing`);

    return query;
  }

  insert(
    userID: string,
    status: string,
    stripeSubscriptionID: string,
    renewalDate: string,
    paymentType: string,
    planID: string
  ) {
    const query = this.db.queryArray<any[]>(
      `
        INSERT INTO billing (
          user_id,
          status,
          stripe_subscription_id,
          renewal_date,
          payment_type,
          plan_id
        ) VALUES (?,?,?,?,?,?)`,
      userID,
      status,
      stripeSubscriptionID,
      renewalDate,
      paymentType,
      planID
    );

    return query;
  }

  updateOrInsert({
    userID,
    status,
    stripeSubscriptionID,
    renewalDate,
    paymentType,
    planID,
    cancelAtPeriodEnd,
  }: UpdateOrInsertParams) {
    const query1 = this.db.queryArray<any[]>(
      `
      SELECT
      *
      FROM billing WHERE user_id = ?`,
      userID
    );
    if (query1.length > 0) {
      console.log("updating");
      return this.db.queryArray<any[]>(
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
        status,
        stripeSubscriptionID,
        renewalDate,
        paymentType,
        planID,
        cancelAtPeriodEnd,
        userID
      );
    } else {
      return this.db.queryArray<any[]>(
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
        userID,
        status,
        stripeSubscriptionID,
        renewalDate,
        paymentType,
        planID,
        cancelAtPeriodEnd
      );
    }
  }
}

export default Billing;
