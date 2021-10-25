import type { RouterContext } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";

const keyData = await Deno.readTextFile("jwk.json");

const key = await crypto.subtle.importKey(
  "jwk",
  JSON.parse(keyData),
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"]
);

export const JwtConfig = {
  secretKey: key,
};

export const validateJWT = async (
  { request, response, state }: RouterContext,
  next: VoidFunction
) => {
  const auth = request.headers.get("Authorization");
  if (!auth) return;
  const matches = /Bearer\s*(.*)/.exec(auth);
  let jwt;

  if (matches && matches.length > 1) {
    jwt = matches[1];
  }

  try {
    if (!jwt) {
      throw { error: "Missing JWT Token 😨" };
    }

    await verify(jwt, key)
      .then(async (payload) => {
        console.log("Valid JWT Token! 😎");
        state.user = payload;
        await next(); // The next() will continue with the excecution
      })
      .catch((e) => {
        console.log(e);
        response.body = { error: e.toString() };
        response.status = 401;
      });
  } catch (error) {
    console.error(error);
    response.body = error;
    response.status = 500;
  }
};
