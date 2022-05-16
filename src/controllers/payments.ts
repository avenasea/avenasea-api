import Users from "../models/users.ts";
import Plans from "../models/plans.ts";
import Billing from "../models/billing.ts";
import { config, Stripe } from "../deps.ts";
import verifyStripeWebhook from "../utils/verifyStripeWebhook.ts";
import verifyCoinpaymentsWebhook from "../utils/verifyCoinpaymentsWebhook.ts";
import Base from "./_base.ts";

const ENV = config();

const stripe = new Stripe(ENV.STRIPE_SK, {
  apiVersion: "2020-08-27",
  httpClient: Stripe.createFetchHttpClient(),
});

class Controller extends Base {
  constructor() {
    super();
  }

  async createSubscription(context: any) {
    const user: any = await new Users().find(context.state.user.id);
    const { planID } = JSON.parse(await context.request.body().value);
    const planData: any = await Plans.find(planID);

    if (!user || !planData || user.status == "active")
      return (context.response.status = 500);

    if (!user.stripe_customer_id) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
        });
        user.stripe_customer_id = customer.id;
        await this.db.query<any[]>(
          `UPDATE users SET
           updated_at = ?,
           stripe_customer_id = ?
        WHERE id = ?`,
          [new Users().getCurrentTime(), user.stripe_customer_id, user.id]
        );
      } catch (err) {
        console.error(err);
        context.response.body = {
          error: "error creating stripe customer",
        };
        return (context.response.status = 500);
      }
    }

    if (planData.billing_frequency == "once") {
      try {
        const paymentIntent = await stripe.paymentIntents.create({
          amount: planData.cost * 100,
          currency: "usd",
          payment_method_types: ["card"],
          customer: user.stripe_customer_id,
          metadata: {
            planID: planData.id,
          },
        });
        context.response.body = {
          clientSecret: paymentIntent.client_secret,
        };
      } catch {
        context.response.body = {
          error: "error creating stripe payment intent",
        };
        return (context.response.status = 500);
      }
    } else {
      try {
        const subscription = await stripe.subscriptions.create({
          customer: user.stripe_customer_id,
          items: [
            {
              price: planData.stripe_price_id,
            },
          ],
          payment_behavior: "default_incomplete",
          expand: ["latest_invoice.payment_intent"],
        });

        context.response.body = {
          clientSecret:
            subscription.latest_invoice.payment_intent.client_secret,
        };
      } catch (err) {
        console.error(err);
        context.response.body = {
          error: "error creating stripe subscription",
        };
        return (context.response.status = 500);
      }
    }
  }

  async cancelSubscription(context: any) {
    const sub: any = await Billing.find(context.state.user.id);
    if (sub.status == "canceled" || sub.cancel_at_period_end == true)
      return (context.response.body = {
        error: "subscription already canceled",
      });
    try {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      return (context.response.body = { success: true });
    } catch (err) {
      console.error(err);
      return (context.response.body = {
        error: "error cancelling subscription",
      });
    }
  }

  async webhook(context: any) {
    const rawBody = await context.request.body({ type: "text" }).value;
    const parsedBody = await context.request.body().value;

    const verified = verifyStripeWebhook(
      ENV.STRIPE_WEBHOOK_SECRET,
      context.request.headers.get("stripe-signature"),
      rawBody
    );

    if (!verified) return (context.response.status = 401);

    const dataObject = parsedBody.data.object;

    const handlePaymentOrSubUpdate = async (dataObject: any) => {
      const user: any = await new Users().findByStripeID(dataObject.customer);
      if (!user) return;

      await Billing.updateOrInsert(
        dataObject.object == "subscription"
          ? {
              userID: user.id,
              status: dataObject.status,
              stripeSubscriptionID: dataObject.id,
              renewalDate: dataObject.current_period_end,
              paymentType: "stripe",
              planID: dataObject.plan.product,
              cancelAtPeriodEnd: dataObject.cancel_at_period_end,
            }
          : {
              userID: user.id,
              status: "active",
              stripeSubscriptionID: "",
              renewalDate: "95617584000", // far in the future,
              paymentType: "stripe",
              planID: dataObject.metadata.planID,
              cancelAtPeriodEnd: false,
            }
      );
    };

    switch (parsedBody.type) {
      case "customer.subscription.updated":
        handlePaymentOrSubUpdate(dataObject);
        break;
      case "payment_intent.succeeded":
        if (!dataObject.metadata || !dataObject.metadata.planID) break;
        handlePaymentOrSubUpdate(dataObject);
        break;
      case "customer.subscription.deleted":
        handlePaymentOrSubUpdate(dataObject);
        break;
      case "invoice.payment_succeeded":
        // set the payment method as default for the subscription
        if (dataObject["billing_reason"] == "subscription_create") {
          const subscription_id = dataObject["subscription"];
          const payment_intent_id = dataObject["payment_intent"];

          const payment_intent = await stripe.paymentIntents.retrieve(
            payment_intent_id
          );

          await stripe.subscriptions.update(subscription_id, {
            default_payment_method: payment_intent.payment_method,
          });
        }
        break;
      case "invoice.payment_failed":
        break;
      default:
      // Unexpected event type
    }
    context.response.status = 200;
  }

  async coinpaymentsWebhook(context: any) {
    const rawBody = await context.request.body({ type: "text" }).value;
    const parsedBody = await context.request.body().value;

    const verified = verifyCoinpaymentsWebhook(
      ENV.COINPAYMENTS_WEBHOOK_SECRET,
      context.request.headers.get("HMAC"),
      rawBody
    );

    if (!verified) return (context.response.status = 401);

    // payment complete
    if (parsedBody.get("status") >= 100) {
      const user: any = await new Users().find(parsedBody.get("invoice"));
      if (!user) return;

      let existing: any = await Billing.find(user.id).catch(console.error);
      const planData: any = await Plans.find(parsedBody.get("item_number"));

      if (
        !existing ||
        existing.status != "active" ||
        existing.payment_type != "coinpayments" ||
        existing.plan_id != parsedBody.get("item_number")
      )
        existing = null;

      let renewalDate = "95617584000";
      if (planData.billing_frequency == "monthly") {
        const startingDate = existing
          ? new Date(existing.renewal_date * 1000)
          : new Date();
        startingDate.setMonth(
          startingDate.getMonth() + parseInt(parsedBody.get("quantity"))
        );
        renewalDate = Math.floor(startingDate.getTime() / 1000).toString();
      }

      await Billing.updateOrInsert({
        userID: user.id,
        status: "active",
        stripeSubscriptionID: null,
        renewalDate: renewalDate,
        paymentType: "coinpayments",
        planID: parsedBody.get("item_number"),
        cancelAtPeriodEnd: false,
      });
    }

    context.response.status = 200;
  }
}

export default new Controller();
