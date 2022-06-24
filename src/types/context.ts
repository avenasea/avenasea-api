import type { Mongo, DB, Context, RouterContext } from "../deps.ts";
import type { UserPayload } from "./jwt.ts";

export type StandardContext = RouterContext<
  any,
  any,
  {
    db: DB;
    mongo: Mongo.Database;
    [key: string]: unknown;
  }
>;

export type AuthorisedContext = RouterContext<
  any,
  any,
  {
    db: DB;
    mongo: Mongo.Database;
    user: UserPayload;
  }
>;
