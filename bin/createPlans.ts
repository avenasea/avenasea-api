import { db } from "../src/db.ts";
import { Stripe, config } from "../src/deps.ts";

const ENV = config();

const stripe = new Stripe(ENV.STRIPE_SK, {
  apiVersion: "2020-08-27",
  httpClient: Stripe.createFetchHttpClient(),
});

interface plan {
  id: number;
  name: string;
  cost: number;
  billing_frequency: "monthly" | "once";
  stripe_price_id: string;
  job_search_profiles: number;
  candidate_search_profiles: number;
  type: "jobseeker" | "recruiter";
}

// check plans have correct data
const plans: Array<plan> = [
  {
    id: 1,
    name: "1 job search profile",
    cost: 5, // 5 dollars
    billing_frequency: "monthly",
    stripe_price_id: "price_1KeMTWR4iswjenYSbX9AzSSE", // will be filled in automatically if using createStripeProducts()
    job_search_profiles: 1,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    id: 2,
    name: "5 job search profiles",
    cost: 20,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KZg6IR4iswjenYSyWyfsq1s",
    job_search_profiles: 5,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    id: 3,
    name: "Lifetime membership: unlimited job search profiles",
    cost: 400,
    billing_frequency: "once",
    stripe_price_id: "price_1KbmReR4iswjenYSbh2dgx4X",
    job_search_profiles: -1,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    id: 4,
    name: "1 candidate search profile",
    cost: 50,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KbmLnR4iswjenYSWeZs57Ow",
    job_search_profiles: 0,
    candidate_search_profiles: 1,
    type: "recruiter",
  },
  {
    id: 5,
    name: "5 candidate search profiles",
    cost: 200,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KeIOJR4iswjenYSzLq1ru9F",
    job_search_profiles: 0,
    candidate_search_profiles: 5,
    type: "recruiter",
  },
  {
    id: 6,
    name: "Lifetime membership: unlimited candidate search profiles",
    cost: 4000,
    billing_frequency: "once",
    stripe_price_id: "price_1KeIPcR4iswjenYSZjMJPXzn",
    job_search_profiles: 0,
    candidate_search_profiles: -1,
    type: "recruiter",
  },
];

const createStripeProducts = async () => {
  const createdPlans = await Promise.all(
    plans.map(async (plan) => {
      const product = await stripe.products.create({
        id: plan.id,
        name: plan.name,
      });
      const priceData: any = {
        unit_amount: plan.cost * 100,
        currency: "usd",
        product: product.id,
      };
      if (plan.billing_frequency == "monthly")
        priceData.recurring = { interval: "month" };
      const price = await stripe.prices.create(priceData);
      plan.stripe_price_id = price.id;
      return plan;
    })
  );
  console.log(`${createdPlans.length} products created`);
  return createdPlans;
};

const addToDB = (plansToAdd: Array<plan>) => {
  for (const plan of plansToAdd) {
    db.query(
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
      ) VALUES (?,?,?,?,?,?,?,?)`,
      Object.values(plan)
    );
  }
};

// Creates products in stripe then adds them to the db
// The functions can be run seperately
const plansToAdd = await createStripeProducts();
console.log(plansToAdd);
addToDB(plansToAdd);
console.log(db.query("SELECT * FROM plans"));
