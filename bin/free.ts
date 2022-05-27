import { parse } from "https://deno.land/std/flags/mod.ts";
import { DB, MongoClient } from "./src/db.ts";
import Users from "../src/models/users.ts";
import Billing from "../src/models/billing.ts";

// deno run -A --unstable ./bin/free.ts --email test@test.com
// or
// deno run -A --unstable ./bin/free.ts --all
// or
// deno run -A --unstable ./bin/free.ts --all_not_subscribed

const { email, all, all_not_subscribed } = parse(Deno.args);
const db = new DB('database.sqlite');
const client = new MongoClient();
const mongo = await client.connect("mongodb://127.0.0.1:27017");
const users = new Users(db, mongo);
const billing = new Billing(db, mongo);

if (email) {
  const user: any = await users.findByEmail(email);
  if (!user) throw "user not found";

  await billing.updateOrInsert({
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
  const userIDs: any = db.query("SELECT id FROM users");

  userIDs.forEach(async ([id]: any) => {
    await billing.updateOrInsert({
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
  const userIDs: any = db.query(`SELECT id
    FROM users u
    WHERE NOT EXISTS (SELECT user_id FROM billing b WHERE u.id = b.user_id AND b.status LIKE 'active');
  `);

  userIDs.forEach(async ([id]: any) => {
    await billing.updateOrInsert({
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
