import { Oak } from "../deps.ts";

/**
 * Sends formatted error with message
 *
 * Will use default status message for error code if `msg` is undefined
 *
 * @example
 * ```
 * return context.state.sendError(404, "item not found");
 * ```
 * Response:
 * ```
 * Status Code: 404
 * { "message": "item not found" }
 * ```
 */
export type sendErrorFn = (status: Oak.Status, msg?: string) => void;

/**
 * Injects the sendError function into `context.state`
 */
export default () => async (ctx: any, next: any) => {
  const sendError: sendErrorFn = (status: Oak.Status, msg?: string) => {
    ctx.response.status = status;
    ctx.response.body = {
      message: msg || Oak.STATUS_TEXT.get(status),
    };
  };
  ctx.state.sendError = sendError;
  await next();
};
