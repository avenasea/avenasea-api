import type { Mongo, Context, RouterContext } from "../deps.ts";
import type { UserPayload } from "./jwt.ts";
import type { sendErrorFn } from "../middleware/sendError.ts";

export type StandardContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    [key: string]: unknown;
    sendError: sendErrorFn;
  }
>;

export type AuthorisedContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    user: UserPayload;
    sendError: sendErrorFn;
  }
>;

export type OptionallyAuthorisedContext = RouterContext<
  any,
  any,
  {
    mongo: Mongo.Database;
    user: UserPayload | undefined;
    sendError: sendErrorFn;
  }
>;
