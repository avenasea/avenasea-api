import { parse } from "https://deno.land/std/flags/mod.ts";
import { db } from "../src/db.ts";
import Users from "../src/models/users.ts";
import Billing from "../src/models/billing.ts";

// deno run -A --unstable ./bin/free.ts --email test@test.com
// or
// deno run -A --unstable ./bin/free.ts --all
// or
// deno run -A --unstable ./bin/free.ts --all_not_subscribed

const { email, all, all_not_subscribed } = parse(Deno.args);

if (email) {
  const user: any = await Users.findByEmail(email);
  if (!user) throw "user not found";
	console.log(user);

  await Billing.updateOrInsert({
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
    await Billing.updateOrInsert({
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
    await Billing.updateOrInsert({
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
