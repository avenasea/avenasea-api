import type { Mongo, Context, RouterContext } from "../deps.ts";
import type { UserPayload } from "./jwt.ts";

export type StandardContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    [key: string]: unknown;
  }
>;

export type AuthorisedContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    user: UserPayload;
  }
>;

export type OptionallyAuthorisedContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    user: UserPayload | undefined;
  }
>;
