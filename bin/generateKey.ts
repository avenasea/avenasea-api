// deno run --allow-write generateKey.ts

const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

const result = await crypto.subtle.exportKey("jwk", key);

await Deno.writeTextFile("./newKey.json", JSON.stringify(result));
console.log("New key written to ./newKey.json");
