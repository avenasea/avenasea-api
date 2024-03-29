import "./global.ts";
import type {
  RouterContext,
  Context,
} from "https://deno.land/x/oak@v10.4.0/mod.ts";
import * as Oak from "https://deno.land/x/oak@v10.4.0/mod.ts";
import {
  verify,
  create,
  getNumericDate,
  Payload,
} from "https://deno.land/x/djwt@v2.4/mod.ts";
import * as bcrypt from "https://deno.land/x/bcrypt@v0.3.0/mod.ts";
import { config } from "https://deno.land/x/dotenv@v3.2.0/mod.ts";
import { oakCors } from "https://deno.land/x/cors@v1.2.2/mod.ts";
import Stripe from "https://esm.sh/stripe@8.209.0?no-check";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";
import { Database as MongoDatabase } from "https://deno.land/x/mongo@v0.30.0/mod.ts";
import * as Mongo from "https://deno.land/x/mongo@v0.30.0/mod.ts";

const { Application, Router } = Oak;

export {
  Application,
  verify,
  bcrypt,
  create,
  getNumericDate,
  Router,
  config,
  oakCors,
  Stripe,
  hmac,
  Mongo,
  MongoDatabase,
  Oak,
};

export type { Payload, RouterContext, Context };
