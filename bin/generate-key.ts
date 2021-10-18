const key = await crypto.subtle.generateKey(
  { name: "HMAC", hash: "SHA-512" },
  true,
  ["sign", "verify"],
);

let result = await crypto.subtle.exportKey('raw', key);
let data = new Uint8Array(result);
Deno.writeFile('../api.key', data)
