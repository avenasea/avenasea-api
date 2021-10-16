import type { RouterContext } from "https://deno.land/x/oak/mod.ts";
import { verify } from "https://deno.land/x/djwt/mod.ts";

export const validateJWT = async (
  { request, response }: RouterContext,
  next: VoidFunction,
) => {
  const auth = request.headers.get('Authorization');
  const matches = /Bearer\s*(.*)/.exec(auth);
	let jwt;

	if (matches.length > 1) {
		jwt = matches[1];
	}

  try {
    if (!jwt) {
      throw { error: "Missing JWT Token 😨" };
    }

    await verify(jwt, key)
      .then(async () => {
        console.log("Valid JWT Token! 😎");
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
