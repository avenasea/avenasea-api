// import { db } from "../db.ts";
import { Users } from "../models/mongo/users.ts";
import { Plans } from "../models/mongo/plans.ts";
import { Billing, BillingModel } from "../models/mongo/billing.ts";
import { config, Stripe } from "../deps.ts";
import verifyStripeWebhook from "../utils/verifyStripeWebhook.ts";
import verifyCoinpaymentsWebhook from "../utils/verifyCoinpaymentsWebhook.ts";
import type { StandardContext, AuthorisedContext } from "../types/context.ts";

const ENV = config();

const stripe = new Stripe(ENV.STRIPE_SK, {
  apiVersion: "2020-08-27",
  httpClient: Stripe.createFetchHttpClient(),
});

class Controller {
  async createSubscription(context: AuthorisedContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const plans = new Plans(mongo);
    const user = await users.find(context.state.user.id);
    const { planID } = JSON.parse(await context.request.body().value);
    const planData = await plans.find(planID);
    console.log({ user, planData, planID });

    if (!user || !planData || user.status == "active")
      return (context.response.status = 500);

    if (!user.stripe_customer_id) {
      try {
        const customer = await stripe.customers.create({
          email: user.email,
        });
        user.stripe_customer_id = customer.id;
        await mongo.collection("users").updateOne(
          { id: user.id },
          {
            $set: {
              updated_at: users.getCurrentTime(),
              stripe_customer_id: user.stripe_customer_id,
            },
          }
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

  async cancelSubscription(context: AuthorisedContext) {
    const { mongo } = context.state;
    const billing = new Billing(mongo);
    const sub = await billing.find(context.state.user.id);
    if (sub.status == "canceled" || sub.cancel_at_period_end == 1)
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

  async webhook(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const billing = new Billing(mongo);
    const rawBody = await context.request.body({ type: "text" }).value;
    const parsedBody = await context.request.body().value;

    const verified = verifyStripeWebhook(
      ENV.STRIPE_WEBHOOK_SECRET,
      context.request.headers.get("stripe-signature") || "",
      rawBody
    );

    if (!verified) return (context.response.status = 401);

    const dataObject = parsedBody.data.object;

    const handlePaymentOrSubUpdate = async (dataObject: any) => {
      const user = await users.findByStripeID(dataObject.customer);
      if (!user) return;

      await billing.updateOrInsert(
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
              cancelAtPeriodEnd: 0,
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

  async coinpaymentsWebhook(context: StandardContext) {
    const { mongo } = context.state;
    const users = new Users(mongo);
    const billing = new Billing(mongo);
    const plans = new Plans(mongo);
    const rawBody = await context.request.body({ type: "text" }).value;
    const parsedBody = await context.request.body().value;

    const verified = verifyCoinpaymentsWebhook(
      ENV.COINPAYMENTS_WEBHOOK_SECRET,
      context.request.headers.get("HMAC") || "",
      rawBody
    );

    if (!verified) return (context.response.status = 401);

    // payment complete
    if (parsedBody.get("status") >= 100) {
      const user = await users.find(parsedBody.get("invoice"));
      if (!user) return;

      let existing: BillingModel | null = await billing.find(user.id);
      const planData = await plans.find(parsedBody.get("item_number"));

      if (!planData) return (context.response.status = 500);

      if (
        !existing ||
        existing.status != "active" ||
        existing.payment_type != "coinpayments" ||
        existing.plan_id != parsedBody.get("item_number")
      )
        existing = null;

      let renewalDate = 95617584000;
      if (planData.billing_frequency == "monthly") {
        const startingDate = existing
          ? new Date(existing.renewal_date * 1000)
          : new Date();
        startingDate.setMonth(
          startingDate.getMonth() + parseInt(parsedBody.get("quantity"))
        );
        renewalDate = Math.floor(startingDate.getTime() / 1000);
      }

      await billing.updateOrInsert({
        userID: user.id,
        status: "active",
        stripeSubscriptionID: undefined,
        renewalDate: renewalDate,
        paymentType: "coinpayments",
        planID: parsedBody.get("item_number"),
        cancelAtPeriodEnd: 0,
      });
    }

    context.response.status = 200;
  }
}

export default new Controller();
