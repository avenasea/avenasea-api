import { Application, config, oakCors } from "./src/deps.ts";
import { db } from "./src/db.ts";
import searches from "./src/routes/searches.ts";
import users from "./src/routes/users.ts";
import index from "./src/routes/index.ts";
import stats from "./src/routes/stats.ts";
import jobs from "./src/routes/jobs.ts";
import payments from "./src/routes/payments.ts";
import affiliates from "./src/routes/affiliates.ts";

config({ export: true });
//console.log(config());
const env = Deno.env.toObject();
const port = parseInt(env.PORT);
const app = new Application();

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
  db.close();
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
