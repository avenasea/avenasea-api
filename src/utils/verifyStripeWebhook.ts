import { hmac } from "../deps.ts";

export default (whSecret: string, signature: string, body: string) => {
  const sigData: {
    [key: string]: string;
  } = {};

  signature.split(",").forEach((el) => {
    const newSplit = el.split("=");
    sigData[newSplit[0]] = newSplit[1];
  });

  const string = `${sigData.t}.${body}`;
  const hmacValid =
    hmac("sha256", whSecret, string, "utf8", "hex") === sigData.v1;
  const elapsed = Math.floor(Date.now() / 1000) - Number(sigData.t);
  return hmacValid && elapsed < 300;
};
