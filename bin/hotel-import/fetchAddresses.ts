import { parse } from "https://deno.land/std/flags/mod.ts";
import AsyncProxyFetcher, {
  RequestData,
} from "../../src/utils/asyncProxyFetcher.ts";

let { outPath } = parse(Deno.args);

outPath = outPath || "./hotels_address.json";

const results = [...JSON.parse(await Deno.readTextFile(outPath))];
console.log(results.length);

// Save on exit
Deno.addSignalListener("SIGINT", () => {
  console.log("saving");
  Deno.writeTextFileSync(outPath, JSON.stringify(results));
  Deno.exit();
});

const requests: RequestData[] = [];
results.forEach((h) => {
  if (!h?.body?.error || !h.data.lat || !h.data.lon) return;

  requests.push({
    url: `https://nominatim.openstreetmap.org/reverse.php?lat=${h.data.lat}&lon=${h.data.lon}&zoom=18&format=jsonv2`,
    otherData: {
      data: h.data,
    },
  });
});
console.log(`Searching ${requests.length} hotels....`);

const asyncProxyFetcher = new AsyncProxyFetcher({
  proxy: {
    url: "http://p.webshare.io",
    basicAuth: {
      username: "dmdgluqz-US-rotate",
      password: "8rxcagjln8n36to4",
    },
  },
});

setInterval(() => {
  console.log("saving");
  Deno.writeTextFileSync(outPath, JSON.stringify(results));
}, 60000);

console.time("timer");
try {
  for await (const response of asyncProxyFetcher.fetchAll(requests)) {
    console.log(response);

    const index = results.findIndex(
      (d) =>
        d.data?.name == response.otherData.data.name &&
        d.data?.lat == response.otherData.data.lat &&
        d.data?.lon == response.otherData.data.lon
    );
    if (index > -1) {
      console.log("updating existing entry");
      results[index].body = response.body;
    } else {
      results.push();
    }
    console.log(`${results.filter((r) => !r.body?.error).length} so far`);
  }
  console.timeEnd("timer");
} catch (error) {
  console.error(error);
}

console.log("Found ", results.length, " results");
Deno.writeTextFileSync(outPath, JSON.stringify(results));
