const rawKey = Deno.readFileSync("./api.key");

/*
Import an AES secret key from an ArrayBuffer containing the raw bytes.
Takes an ArrayBuffer string containing the bytes, and returns a Promise
that will resolve to a CryptoKey representing the secret key.
*/
const key = await crypto.subtle.importKey(
  "raw",
  rawKey,
  "SHA-512",
  true,
  ["encrypt", "decrypt"],
);

console.log(key);
