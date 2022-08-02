import { Mongo } from "../../deps.ts";

export class BillingModel {
  constructor(
    public user_id: string,
    public status: string,
    public renewal_date: number,
    public payment_type: "coinpayments" | "stripe",
    public plan_id: number,
    public cancel_at_period_end: number,
    public stripe_subscription_id?: string,
    public id?: string // may just use user_id
  ) {}
}

export class Billing {
  constructor(private db: Mongo.Database) {}
  async find(userID: string) {
    const data = (await this.db
      .collection("billing")
      .findOne({ user_id: userID })) as BillingModel;

    return data;
  }

  async findAll() {
    const data = (await this.db
      .collection("billing")
      .find()
      .toArray()) as BillingModel[];

    return data;
  }

  async insert(
    userID: string,
    status: string,
    stripeSubscriptionID: string,
    renewalDate: number,
    paymentType: "coinpayments" | "stripe",
    planID: number
  ) {
    const billingData: BillingModel = {
      user_id: userID,
      status,
      stripe_subscription_id: stripeSubscriptionID,
      renewal_date: renewalDate,
      payment_type: paymentType,
      plan_id: planID,
      cancel_at_period_end: 0,
    };
    const query = await this.db.collection("billing").insertOne(billingData);

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
  }: {
    userID: BillingModel["user_id"];
    status: BillingModel["status"];
    stripeSubscriptionID?: BillingModel["stripe_subscription_id"];
    renewalDate: BillingModel["renewal_date"];
    paymentType: BillingModel["payment_type"];
    planID: BillingModel["plan_id"] | string;
    cancelAtPeriodEnd: BillingModel["cancel_at_period_end"] | boolean;
  }) {
    cancelAtPeriodEnd = +cancelAtPeriodEnd;
    planID = typeof planID == "string" ? parseInt(planID) : planID;
    const billingData: BillingModel = {
      user_id: userID,
      status,
      stripe_subscription_id: stripeSubscriptionID,
      renewal_date: renewalDate,
      payment_type: paymentType,
      plan_id: planID,
      cancel_at_period_end: cancelAtPeriodEnd,
    };
    const query = this.db
      .collection("billing")
      .updateOne({ user_id: userID }, { $set: billingData }, { upsert: true });
    return query;
  }
}
