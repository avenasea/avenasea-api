import { parse } from "https://deno.land/std/flags/mod.ts";
import { readCSVObjects } from "https://deno.land/x/csv/mod.ts";

interface HotelItem {
  body: Record<any, any>;
  url: string;
  data: Record<any, any>;
}

let { path, outPath } = parse(Deno.args);

path = path || "./docs/hotel_info.csv";
outPath = outPath || "./hotels_address.json";

const f = await Deno.open(path);
let existing: HotelItem[] = [];
await Deno.readTextFile(outPath)
  .then((val) => (existing = JSON.parse(val)))
  .catch((err) => {
    if (err.name == "NotFound") console.log(`creating new file ${outPath}`);
  });
const results = [...existing];
console.log(`existing length ${results.length}`);

const isLatitude = (num: number) => isFinite(num) && Math.abs(num) <= 90;
const isLongitude = (num: number) => isFinite(num) && Math.abs(num) <= 180;
const getCorrectLatLong = (data: any) => {
  let lat;
  let lon;
  if (
    !isLatitude(data["latitude"]) &&
    isLatitude(data["longitude"]) &&
    isLongitude(data["wifi"])
  ) {
    lat = data["longitude"];
    lon = data["wifi"];
  } else {
    lat = data["latitude"];
    lon = data["longitude"];
  }
  return { lat, lon };
};

const countInterval = setInterval(
  () => console.log(`checked ${count} items`),
  1000
);

let count = 0;
for await (const row of readCSVObjects(f)) {
  count += 1;
  const { lat, lon } = getCorrectLatLong(row);

  if (existing.some((e: HotelItem) => e.data?.name == row["title"]) == false) {
    const schema: HotelItem["data"] = {};
    const name = row["title"];
    schema.name = name;
    schema.lat = lat;
    schema.lon = lon;

    schema.orig = row;
    results.push({
      body: { error: true },
      url: `https://nominatim.openstreetmap.org/reverse.php?lat=${schema.lat}&lon=${schema.lon}&zoom=18&format=jsonv2`,
      data: schema,
    });
  }
}

clearInterval(countInterval);
console.log(`checked ${count} items`);
console.log(`saving ${results.length} HotelItems`);

Deno.writeTextFileSync(outPath, JSON.stringify(results));
