import { parse } from "https://deno.land/std/flags/mod.ts";
import { readCSVObjects } from "https://deno.land/x/csv/mod.ts";
import AsyncProxyFetcher, {
  RequestData,
} from "./src/utils/asyncProxyFetcher.ts";
// deno run -A ./bin/csvToSchema.ts --path test.csv

const { path } = parse(Deno.args);

const f = await Deno.open(path || "./docs/hotel_info.csv");
const existing = JSON.parse(await Deno.readTextFile("./hotels_address.json"));
const hotels = [];

// Save on exit
Deno.addSignalListener("SIGINT", () => {
  console.log("saving");
  Deno.writeTextFileSync("./hotels_address.json", JSON.stringify(results));
  Deno.exit();
});

for await (const row of readCSVObjects(f)) {
  if (
    existing.some((e: any) => e.data.name == row["hotel_name"] && !e.body.error)
  ) {
    console.log(`${row["hotel_name"]} exists`);
  } else {
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
}

//Deno.writeTextFileSync("./hotels.json", JSON.stringify(hotels));

const results = [...existing];
console.log(`Searching ${hotels.length} hotels....`);
const requests: RequestData[] = hotels.map((h) => {
  const { lat, lon } = h;

  return {
    url: `https://nominatim.openstreetmap.org/reverse.php?lat=${lat}&lon=${lon}&zoom=18&format=jsonv2`,
    otherData: {
      data: h,
    },
  };
});

const asyncProxyFetcher = new AsyncProxyFetcher({
  proxy: {
    url: "http://p.webshare.io",
    basicAuth: {
      username: "dmdgluqz-US-rotate",
      password: "8rxcagjln8n36to4",
    },
  },
});

console.time("timer");
for await (const response of asyncProxyFetcher.fetchAll(requests)) {
  console.log(response);

  const index = results.findIndex(
    (d) => d.data.name == response.otherData.data.name
  );
  if (index > -1) {
    console.log("updating existing entry");
    results[index].body = response.body;
  } else {
    results.push({
      body: response.body,
      url: response.url,
      data: response.otherData.data,
    });
  }
  console.log(`${results.length} so far`);
}
console.timeEnd("timer");

console.log("Found ", results.length, " results");
Deno.writeTextFileSync("./hotels_address.json", JSON.stringify(results));
