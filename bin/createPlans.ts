import { Stripe, config, Mongo } from "../src/deps.ts";
import { PlanModel } from "../src/models/mongo/plans.ts";

const ENV = config();

const mongo: Mongo.Database = await new Mongo.MongoClient().connect(
  ENV.MONGO_CONNECTION_STRING
);

const stripe = new Stripe(ENV.STRIPE_SK, {
  apiVersion: "2020-08-27",
  httpClient: Stripe.createFetchHttpClient(),
});

// check plans have correct data
const plans: Array<PlanModel & { _id: string }> = [
  {
    _id: "1",
    id: "1",
    name: "1 job search profile",
    cost: 5, // 5 dollars
    billing_frequency: "monthly",
    stripe_price_id: "price_1KeMTWR4iswjenYSbX9AzSSE", // will be filled in automatically if using createStripeProducts()
    job_search_profiles: 1,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    _id: "2",
    id: "2",
    name: "5 job search profiles",
    cost: 20,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KZg6IR4iswjenYSyWyfsq1s",
    job_search_profiles: 5,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    _id: "3",
    id: "3",
    name: "Lifetime membership: unlimited job search profiles",
    cost: 400,
    billing_frequency: "once",
    stripe_price_id: "price_1KbmReR4iswjenYSbh2dgx4X",
    job_search_profiles: -1,
    candidate_search_profiles: 0,
    type: "jobseeker",
  },
  {
    _id: "4",
    id: "4",
    name: "1 candidate search profile",
    cost: 50,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KbmLnR4iswjenYSWeZs57Ow",
    job_search_profiles: 0,
    candidate_search_profiles: 1,
    type: "recruiter",
  },
  {
    _id: "5",
    id: "5",
    name: "5 candidate search profiles",
    cost: 200,
    billing_frequency: "monthly",
    stripe_price_id: "price_1KeIOJR4iswjenYSzLq1ru9F",
    job_search_profiles: 0,
    candidate_search_profiles: 5,
    type: "recruiter",
  },
  {
    _id: "6",
    id: "6",
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
  const stripePrices = await stripe.prices.list({
    limit: 100,
  });
  const createdPlans = await Promise.all(
    plans.map(async (plan) => {
      const existing = stripePrices.data.find(
        (price: any) => price.product == plan.id
      );
      if (existing) {
        plan.stripe_price_id = existing.id;
        return plan;
      }
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

const addToDB = (plansToAdd: Array<PlanModel>) => {
  mongo.collection("plans").insertMany(plansToAdd);
};

// Creates products in stripe then adds them to the db
// The functions can be run seperately
// const plansToAdd = await createStripeProducts();
// console.log(plansToAdd);
addToDB(plans);
console.log(await mongo.collection("plans").find().toArray());
