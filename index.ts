import { Application, config, oakCors, Mongo } from "./src/deps.ts";
import searches from "./src/routes/searches.ts";
import users from "./src/routes/users.ts";
import index from "./src/routes/index.ts";
import stats from "./src/routes/stats.ts";
import jobs from "./src/routes/jobs.ts";
import sendError from "./src/middleware/sendError.ts";
import contracts from "./src/routes/contracts.ts";

import payments from "./src/routes/payments.ts";
//import affiliates from "./src/routes/affiliates.ts";

config({ export: true });
//console.log(config());
const env = Deno.env.toObject();
const port = parseInt(env.PORT);
const app = new Application();

//Db
const mongoDB: Mongo.Database = await new Mongo.MongoClient().connect(
  env.MONGO_CONNECTION_STRING
);

app.use(async (ctx, next) => {
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

app.use(sendError());
app.use(
  oakCors({
    origin: true, // TODO: secure for production
    credentials: true,
  })
);
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
