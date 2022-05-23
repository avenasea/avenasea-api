import { hmac } from "../deps.ts";

export default (whSecret: string, signature: string, body: string) => {
  return hmac("sha512", whSecret, body, "utf8", "hex") === signature;
};
