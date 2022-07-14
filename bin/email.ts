import { DOMParser } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { config, DB } from "../src/deps.ts";
import cities from "./cities.js";
import { ats } from "../ats.ts";
import {
  QueryParameter,
  RowObject,
} from "https://deno.land/x/sqlite@v3.2.1/src/query.ts";

const ENV = config();
const args = parse(Deno.args);
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
const sites = ats;

interface WhateverResult {
  title: string;
  urls: string[];
}

interface FetchResult {
  url: string;
  body: string;
}

interface CraigsResult {
  txt: string;
  htm: string;
}

async function getSerps(q: string, search: any, user: any): Promise<any> {
  let txt: string = "";
  let htm: string = "";
  let data: any = {};

  const client = Deno.createHttpClient({
    proxy: {
      url: "http://p.webshare.io",
      basicAuth: {
        username: "dmdgluqz-US-rotate",
        password: "8rxcagjln8n36to4",
      },
    },
  });

  try {
    const UA = UAs[~~(Math.random() * UAs.length)];
    const res = await fetch(
      `https://api.scaleserp.com/search?api_key=${ENV.SCALESERP_API_KEY}&q=${q}&gl=us&hl=en&time_period=last_week&num=20`,
      {
        // client,
        headers: {
          "User-Agent": UA,
        },
      }
    );
    if (!res.ok) {
      console.error(await res.text());
      return {};
    }

    data = await res.json();
    console.log("fetching:", q);

    if (!data.organic_results?.length) return { txt, htm };
  } catch (err) {
    console.error(err);
    return {};
  }

  const qmatchres = q.match(/^inurl:([^\s\/]+)((?!\s).)*\s*(.+)/);

  if (qmatchres) {
    const [orig, host, skip, query] = qmatchres;
    htm += `
	<h4 title="${query}">${host}</h4>
	<ol>
`;

    txt += `
==========================
${host}
==========================`;
  }

  for (const item of data.organic_results) {
    const { title, link, snippet } = item;
    insertSearch(title, link, search, user);

    txt += `
${title}
	${link}
	${snippet}
--------------------`;

    htm += `
	<li><a href="${link}" target="_new">${title}</a><p>${snippet}</p></li>
`;
  }

  htm += "</ol>";

  return { txt, htm };
}

async function getCraigslist(
  q: string,
  search: any,
  user: any
): Promise<CraigsResult> {
  let txt = "";
  let htm = "";
  const remote = true;
  const results: WhateverResult[] = [];
  console.log(`Searching ${cities.length} cities....`);
  const requests: string[] = cities.map((city) => {
    return `https://${city}.craigslist.org/search/sof?query=${encodeURIComponent(
      q
    )}&${
      remote ? "is_telecommuting=1" : ""
    }&employment_type=2&employment_type=3`;
  });
  const pool: any = pooledMap(100, requests, (url) => {
    try {
      return getWithFetch(url).catch(console.error);
    } catch (err) {
      console.error(err);
      return Promise.resolve({ body: "", url });
    }
  });

  console.log("fetching:", q);

  for await (const data of pool) {
    if (!data?.body) {
      console.log("missing body: ", data?.url);
      continue;
    }
    //console.log('found body: ', data.body.length);
    const doc = new DOMParser().parseFromString(data.body, "text/html");
    if (!doc) continue;
    const links: any = [...doc.querySelectorAll("a.result-title")];
    console.log(`found ${links.length} links`);

    for (const link of links) {
      if (!link?.innerText || !link?.getAttribute) continue;
      try {
        const title = link.innerText;
        const url = link.getAttribute("href");
        const urls = [];

        const exists = results.some((item) => item.title === title);

        if (exists) {
          const entry = results.find((item) => item.title === title);
          if (entry) {
            console.log("found existing entry!");
          }

          if (entry && !entry.urls.some((u) => u === url)) {
            entry.urls.push(url);
          }
        } else {
          urls.push(url);
          console.log("pushing result: ", title);
          results.push({ title, urls });
        }
      } catch (err) {
        console.error(err);
        continue;
      }
    }
  }

  console.log(`Craigslist found ${results.length} results`);
  console.log(results);

  if (!results.length) {
    return { txt, htm };
  }

  htm += `<h4 title="${q}">Craigslist</h4>`;
  txt += `Craigslist: ${q}
	====================================
	`;

  for (const result of results) {
    if (!result) continue;
    // todo insert into search_history here
    const { title, urls } = result;

    if (title.length && urls.length) {
      for (const url of urls) {
        insertSearch(title, url, search, user);
      }
    }

    console.log("htm: ", htm);
    htm += `
			<h4 title="${q}">${result?.title}</h4>
			<ol>
		`;

    txt += `
		==========================
		${result?.title}
		==========================`;

    result?.urls?.map((url: string) => {
      txt += `
			${url}
		--------------------`;

      htm += `
					<li><a href="${url}" target="_new">${result?.title}</a></li>
				`;
    });

    htm += "</ol>";
  }

  console.log("HEREEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEEeeeeeeee", txt);
  return { txt, htm };
}

async function getWithFetch(url: string, retry = 1): Promise<FetchResult> {
  if (retry > 1) {
    console.log("attempt ", retry);
  }

  let client;

  try {
    client = Deno.createHttpClient({
      proxy: {
        url: "http://p.webshare.io",
        basicAuth: {
          username: "dmdgluqz-US-rotate",
          password: "8rxcagjln8n36to4",
        },
      },
    });
  } catch (err) {
    console.error(err);
    return Promise.resolve({ body: "", url });
  }

  let res: Response;
  try {
    const UA = UAs[~~(Math.random() * UAs.length)];

    res = <Response>await fetch(url, {
      client,
      headers: {
        "User-Agent": UA,
      },
    }).catch(console.error);
  } catch (err) {
    console.error(err);
    return Promise.resolve({ body: "", url });
  }

  if (!res.ok) {
    console.error(await res.text());
    return Promise.resolve({ body: "", url });
  }

  let body = res.ok && (await res.text());

  if (!body && retry < 2) {
    console.log(`body, trying again...: ${url}`);
    ({ body, url } = await getWithFetch(url, ++retry));
    console.log("retry found body: ", body.length);
    return { body, url };
  }

  return { body, url };
}

function insertSearch(title: string, url: string, search: any, user: any) {
  const db = new DB("database.sqlite");
  // await db.queryObject("PRAGMA busy_timeout = 30000");

  console.log("inserting search: ", url);
  db.queryObject(
    "INSERT INTO search_history (id, user_id, search_id, title, url, created_at) VALUES (?, ?, ?, ?, ?, ?)",
    crypto.randomUUID(),
    user.id,
    search.id,
    title.trim(),
    url.trim(),
    new Date().toISOString()
  );

  db.close();
}

async function sendEmail(
  email: string,
  name: string,
  txt: string,
  htm: string
) {
  const auth = btoa(`api:${ENV.MAILGUN_API_KEY}`);
  const form = new FormData();
  form.append("from", `Grazily ${ENV.META_EMAIL}`);
  form.append("to", email);
  form.append("subject", `remote jobs: ${name}`);
  form.append("text", txt);
  form.append("html", `<html>${htm}</html>`);

  const res = await fetch(
    `https://api.mailgun.net/v3/${ENV.MAILGUN_DOMAIN}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: form,
    }
  ).catch(console.error);

  if (res && !res.ok) {
    console.error(await res.text());
  }

  if (res) {
    return await res.json();
  } else {
    return Promise.resolve(null);
  }
}

let users = [];

const db = new DB("database.sqlite");
db.queryObject("PRAGMA busy_timeout = 30000");

if (args.email) {
  users = db.queryObject("SELECT * FROM users WHERE email = ?", args.email);
} else {
  users = db.queryObject("SELECT * FROM users");
}

db.close();
console.log(users);

for (const user of users) {
  // todo: check for if account active or paid

  if (args.email && user.email !== args.email) continue;

  const db = new DB("database.sqlite");
  db.queryObject("PRAGMA busy_timeout = 30000");

  const searches = db.queryObject(
    "SELECT * from searches WHERE user_id = ? AND type = 'job'",
    user.id as QueryParameter
  );

  db.close();
  for (const search of searches as RowObject[]) {
    let text: string = "";
    let html: string = "";

    const db = new DB("database.sqlite");
    db.queryObject("PRAGMA busy_timeout = 30000");

    const positive = db.queryObject(
      "SELECT * from positive WHERE search_id = ?",
      search.id as QueryParameter
    );
    const negative = db.queryObject(
      "SELECT * from negative WHERE search_id = ?",
      search.id as QueryParameter
    );

    db.close();
    for (const site of sites) {
      const neg = negative.map((n) => " -" + n.word).join("");
      const pos = positive.map((p) => " " + p.word).join("");

      if (!pos.length) continue;

      const q = `${site}${neg}${pos}`.trim();
      const { txt, htm } = await getSerps(q, search, user);
      if (!htm || !txt) continue;
      console.log(user.email, search.name, q);

      text += txt;
      html += htm;
    }

    const neg = negative.map((n) => " -" + n.word).join("");
    const pos = positive.map((p) => " " + p.word).join("");

    if (pos.length) {
      // todo: remove me
      //const q = `${neg}${pos}`.trim();
      const q = `${pos}`.trim();
      const { txt, htm } = await getCraigslist(q, search, user);
      console.log("craigslist found: ", txt);

      text += txt;
      html += htm;
    }

    // skip empty emails
    if (text.trim().length && html.trim().length) {
      await sendEmail(
        <string>user.email,
        <string>search.name,
        text,
        html
      ).catch(console.error);
    }
  }
}
