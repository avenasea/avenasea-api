import { parse } from "https://deno.land/std/flags/mod.ts";
import { DB, Mongo, config } from "../src/deps.ts";
import Users from "../src/models/users.ts";
import Billing from "../src/models/billing.ts";

// deno run -A --unstable ./bin/free.ts --email test@test.com
// or
// deno run -A --unstable ./bin/free.ts --all
// or
// deno run -A --unstable ./bin/free.ts --all_not_subscribed

const { email, all, all_not_subscribed } = parse(Deno.args);
const ENV = config();
const db = new DB("database.sqlite");
const client = new Mongo.MongoClient();
const mongo = await client.connect(ENV.MONGO_CONNECTION_STRING);
const users = new Users(db, mongo);
const billing = new Billing(db, mongo);

if (email) {
  const user: any = users.findByEmail(email);
  if (!user) throw "user not found";

  billing.updateOrInsert({
    userID: user.id,
    status: "active",
    stripeSubscriptionID: null,
    renewalDate: "95617584000",
    paymentType: "coinpayments",
    planID: "7",
    cancelAtPeriodEnd: false,
  });
  console.log("user updated");
} else if (all) {
  const userIDs: any = db.queryObject("SELECT id FROM users");

  userIDs.forEach(([id]: any) => {
    billing.updateOrInsert({
      userID: id,
      status: "active",
      stripeSubscriptionID: null,
      renewalDate: "95617584000",
      paymentType: "coinpayments",
      planID: "7",
      cancelAtPeriodEnd: false,
    });
  });
  console.log(`${userIDs.length} updated`);
} else if (all_not_subscribed) {
  const userIDs: any = db.queryObject(`SELECT id
    FROM users u
    WHERE NOT EXISTS (SELECT user_id FROM billing b WHERE u.id = b.user_id AND b.status LIKE 'active');
  `);

  userIDs.forEach(([id]: any) => {
    billing.updateOrInsert({
      userID: id,
      status: "active",
      stripeSubscriptionID: null,
      renewalDate: "95617584000",
      paymentType: "coinpayments",
      planID: "7",
      cancelAtPeriodEnd: false,
    });
  });
  console.log(`${userIDs.length} updated`);
}
