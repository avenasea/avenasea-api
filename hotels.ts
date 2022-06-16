import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { readCSVObjects } from "https://deno.land/x/csv/mod.ts";
// deno run -A ./bin/csvToSchema.ts --path test.csv

const { path } = parse(Deno.args);

const f = await Deno.open(path || "./docs/hotel_info.csv");
const hotels = [];

for await (const row of readCSVObjects(f)) {
  console.log(row);
  const schema: any = {};
  const name = row["hotel_name"];
  schema.name = name;
  schema.lat = row["latitude"];
  schema.lon = row["longitude"];
  schema.chain_id = row["chain_id"];
  schema.hotel_id = row["hotel_id"];
  hotels.push(schema);
}

Deno.writeTextFileSync("./hotels.json", JSON.stringify(hotels));

const results = [];
const UAs = [
  "Mozilla/5.0 (X11; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:99.0) Gecko/20100101 Firefox/99.0",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.75 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.4 Safari/605.1.15",
  "Mozilla/5.0 (X11; Linux x86_64; rv:99.0) Gecko/20100101 Firefox/99.0",
  "Mozilla/5.0 (Windows NT 10.0; rv:91.0) Gecko/20100101 Firefox/91.0",
];
console.log(`Searching ${hotels.length} hotels....`);
const requests: Request[] = hotels.map((h) => {
  const { lat, lon } = h;

  return {
    data: h,
    url: `https://nominatim.openstreetmap.org/reverse.php?lat=${lat}&lon=${lon}&zoom=18&format=jsonv2`,
  };
});
const pool = pooledMap(2, requests, (d) => {
  return getWithFetch(d);
});

async function getWithFetch(d, retry = 1) {
  let { url, data } = d;
  if (retry > 1) {
    console.log("attempt ", retry);
  }

  const client = Deno.createHttpClient({
    proxy: {
      url: "http://p.webshare.io",
      basicAuth: {
        username: "dmdgluqz-US-rotate",
        password: "8rxcagjln8n36to4",
      },
    },
  });

  let res;

  try {
    const UA = UAs[~~(Math.random() * UAs.length)];

    res = await fetch(url, {
      client,
      headers: {
        "User-Agent": UA,
      },
    });
  } catch (err) {
    console.error(err);
  }

  let body = res?.ok && (await res.json());

  if (!body && retry < 10) {
    console.log(`body, trying again...: ${url}`);
    ({ body, url, data } = await getWithFetch(d, ++retry));
    console.log("retry found body: ", body.length);
  }
  return { body, url, data };
}

for await (const data of pool) {
  if (!data.body) {
    console.log("missing body: ", data.url);
    continue;
  }

  results.push(data);
}

console.log("Found ", results.length, " results");
Deno.writeTextFileSync("./hotels_address.json", JSON.stringify(results));
