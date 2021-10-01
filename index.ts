import { Application, Router } from "https://deno.land/x/oak/mod.ts";
import { oakCors } from "https://deno.land/x/cors/mod.ts";
import subscriptions from "./src/routes/subscriptions.ts";
import users from "./src/routes/users.ts";
import index from "./src/routes/index.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";

config();
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
});

app.use(oakCors());
app.use(subscriptions.routes());
app.use(subscriptions.allowedMethods());
app.use(users.routes());
app.use(users.allowedMethods());
app.use(index.routes());
app.use(index.allowedMethods());

await app.listen({ port: 8051 });
