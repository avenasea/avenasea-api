import { Application, config, oakCors, Mongo, DB } from "./src/deps.ts";
import searches from "./src/routes/searches.ts";
import users from "./src/routes/users.ts";
import index from "./src/routes/index.ts";
import stats from "./src/routes/stats.ts";
import jobs from "./src/routes/jobs.ts";
import contracts from "./src/routes/contracts.ts";
// import formatError from "./src/utils/formatError.ts";

import payments from "./src/routes/payments.ts";
//import affiliates from "./src/routes/affiliates.ts";

const client = new Mongo.MongoClient();

config({ export: true });
//console.log(config());
const env = Deno.env.toObject();
const port = parseInt(env.PORT);
const app = new Application();

//Db
const db = new DB("database.sqlite");
await client.connect(env.MONGO_CONNECTION_STRING);
const mongoDB: Mongo.Database = client.database(env.MONGO_DB_NAME);

app.use(async (ctx, next) => {
  ctx.state.db = db;
  ctx.state.mongo = mongoDB;
  await next();
});

// Logger
app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

// Timing
app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

app.use(oakCors());
app.use(searches.routes());
app.use(searches.allowedMethods());
app.use(jobs.routes());
app.use(jobs.allowedMethods());
app.use(users.routes());
app.use(users.allowedMethods());
app.use(index.routes());
app.use(index.allowedMethods());
app.use(stats.routes());
app.use(stats.allowedMethods());
app.use(payments.routes());
app.use(payments.allowedMethods());
app.use(contracts.routes());
app.use(contracts.allowedMethods());
//app.use(affiliates.routes());
//app.use(affiliates.allowedMethods());

console.log(`Listening on http://localhost:${port}/api/1`);
await app.listen({ port });
