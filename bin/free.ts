import { parse } from "https://deno.land/std/flags/mod.ts";
import { Mongo, config } from "../src/deps.ts";
import { Users, UserModel } from "../src/models/mongo/users.ts";
import { Billing } from "../src/models/mongo/billing.ts";

// deno run -A --unstable ./bin/free.ts --email test@test.com
// or
// deno run -A --unstable ./bin/free.ts --all
// or
// deno run -A --unstable ./bin/free.ts --all_not_subscribed

const { email, all, all_not_subscribed } = parse(Deno.args);
const ENV = config();
const client = new Mongo.MongoClient();
const mongo = await client.connect(ENV.MONGO_CONNECTION_STRING);
const users = new Users(mongo);
const billing = new Billing(mongo);

if (email) {
  const user = await users.findByEmail(email);
  if (!user) throw "user not found";

  billing.updateOrInsert({
    userID: user.id,
    status: "active",
    stripeSubscriptionID: undefined,
    renewalDate: 95617584000,
    paymentType: "coinpayments",
    planID: "7",
    cancelAtPeriodEnd: 0,
  });
  console.log("user updated");
} else if (all) {
  const userIDs = await users.findAll();
  if (!userIDs) throw new Error("users not found");

  userIDs.forEach(({ id: id }) => {
    billing.updateOrInsert({
      userID: id,
      status: "active",
      stripeSubscriptionID: undefined,
      renewalDate: 95617584000,
      paymentType: "coinpayments",
      planID: "7",
      cancelAtPeriodEnd: 0,
    });
  });
  console.log(`${userIDs.length} updated`);
} else if (all_not_subscribed) {
  const userIDs = await mongo
    .collection("users")
    .aggregate<UserModel>([
      {
        $lookup: {
          from: "billing",
          localField: "id",
          foreignField: "user_id",
          as: "billing",
          pipeline: [
            {
              $project: {
                status: 1,
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$billing",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "billing.status": { $ne: "active" },
        },
      },
    ])
    .toArray();
  console.log(userIDs);

  userIDs.forEach(({ id: id }) => {
    billing.updateOrInsert({
      userID: id,
      status: "active",
      stripeSubscriptionID: undefined,
      renewalDate: 95617584000,
      paymentType: "coinpayments",
      planID: "7",
      cancelAtPeriodEnd: 0,
    });
  });
  console.log(`${userIDs.length} updated`);
}
