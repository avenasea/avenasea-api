import { Application, config, oakCors } from "./src/deps.ts";
import searches from "./src/routes/searches.ts";
import users from "./src/routes/users.ts";
import index from "./src/routes/index.ts";
import stats from "./src/routes/stats.ts";
import jobs from "./src/routes/jobs.ts";
import payments from "./src/routes/payments.ts";
import affiliates from "./src/routes/affiliates.ts";
import { DB, MongoClient } from "./src/db.ts";

const client = new MongoClient();

config({ export: true });
//console.log(config());
const env = Deno.env.toObject();
const port = parseInt(env.PORT);
const app = new Application();

//Db
app.use(async (ctx, next) => {
  const db = new DB("database.sqlite");
  const mongo = await client.connect("mongodb://127.0.0.1:27017");
  ctx.state.db = db;
  ctx.state.mongo = mongo;
  await next();
  ctx.state.db.close();
  client.close();
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
app.use(affiliates.routes());
app.use(affiliates.allowedMethods());

console.log(`Listening on http://localhost:${port}/api/1`);
await app.listen({ port });
