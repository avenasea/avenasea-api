import {
  DOMParser,
  Element,
} from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import { parse } from "https://deno.land/std/flags/mod.ts";
import { config } from "https://deno.land/x/dotenv/mod.ts";
import { db } from "../src/db.ts";
import cities from "./cities.js";

const ENV = config();
const args = parse(Deno.args);
const UA =
  "Mozilla/5.0 (X11; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0";

const sites = [
  "inurl:lever.co",
  "inurl:workable.com",
  "inurl:greenhouse.io",
  "inurl:jobvite.com",
  "inurl:recruiterbox.com",
  "inurl:angel.co/company+inurl:/jobs",
  "inurl:linkedin.com/jobs/view/",
  "inurl:nodesk.co/remote-jobs",
  "inurl:recruitee.com/o",
  "inurl:breezy.hr/p/",
  "inurl:icims.com/jobs",
  "inurl:workatastartup.com/jobs/",
  "inurl:stackoverflow.com/jobs/",
  "inurl:jobs.github.com/position/",
  "inurl:taleo.net/careersection/+inurl:jobdetail.ftl",
  "inurl:jobs.us.pwc.com/job/",
  "inurl:jobs.smartrecruiters.com/",
  "inurl:careers.jobscore.com/careers/+inurl:/jobs/",
  "inurl:jobs.gohire.io/",
  "inurl:join.com/jobs/",
];

async function getSerps(q: string): Promise<any> {
  let txt: string = "";
  let htm: string = "";

  const res = await fetch(
    `https://api.scaleserp.com/search?api_key=${ENV.SCALESERP_API_KEY}&q=${q}&gl=us&hl=en&time_period=last_week&num=20`,
  );
  if (!res.ok) {
    console.error(await res.text());
    return {};
  }
  const data = await res.json();

  console.log("fetching:", q);

  if (!data.organic_results?.length) return { txt, htm };

  const [orig, host, skip, query] = q.match(
    /^inurl:([^\s\/]+)((?!\s).)*\s*(.+)/,
  );

  htm += `
	<h4 title="${query}">${host}</h4>
	<ol>
`;

  txt += `
==========================
${host}
==========================`;

  data.organic_results.map((item: any) => {
    const { title, link, snippet } = item;
    txt += `
${title}
	${link}
	${snippet}
--------------------`;

    htm += `
	<li><a href="${link}" target="_new">${title}</a><p>${snippet}</p></li>
`;
  });

  htm += "</ol>";

  return { txt, htm };
}

async function getCraigslist(q: string): Promise<any> {
  let txt: string = "";
  let htm: string = "";
  const remote = true;
  const results = [];
  const UA =
    "Mozilla/5.0 (X11; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0";
  console.log(`Searching ${cities.length} cities....`);
  const requests: Request[] = cities.map((city) => {
    return `https://${city}.craigslist.org/search/sof?query=${
      encodeURIComponent(q)
    }&${
      remote ? "is_telecommuting=1" : ""
    }&employment_type=2&employment_type=3`;
  });
  const pool = pooledMap(100, requests, (url) => {
    try {
      return getWithFetch(url).catch(console.error);
    } catch (err) {
      console.error(err);
      return Promise.resolve({});
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
    const links = [...doc.querySelectorAll("a.result-title")];
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

          if (!entry.urls.some((u) => u === url)) {
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

  htm += `<h4 title="${q}">Craigslist</h4>`;
  txt += `Craigslist: ${q}
	====================================
	`;

  for (const result of results) {
    if (!result) continue;
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

async function getWithFetch(url, retry = 1) {
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
    console.error(error);
    return Promise.resolve();
  }

  let res;
  try {
    res = await fetch(url, {
      client,
      headers: {
        "User-Agent": UA,
      },
    }).catch(console.error);
  } catch (err) {
    console.error(err);
    return Promise.resolve();
  }

  if (!res.ok) {
    console.error(await res.text());
    return Promise.resolve();
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

async function sendEmail(
  email: string,
  name: string,
  txt: string,
  htm: string,
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
    },
  ).catch(console.error);

  if (!res.ok) {
    console.error(await res.text());
  }

  return await res.json();
}

const users = await db.queryEntries("SELECT * FROM users");
console.log(users);

for (const user of users) {
  // todo: check for if account active or paid

  if (args.email && user.email !== args.email) continue;

  const searches = await db.queryEntries(
    "SELECT * from searches WHERE user_id = ?",
    [user.id],
  );

  for (const search of searches) {
    let text: string = "";
    let html: string = "";

    const positive = await db.queryEntries(
      "SELECT * from positive WHERE search_id = ?",
      [search.id],
    );
    const negative = await db.queryEntries(
      "SELECT * from negative WHERE search_id = ?",
      [search.id],
    );

    for (const site of sites) {
      const neg = negative.map((n) => " -" + n.word).join("");
      const pos = positive.map((p) => " " + p.word).join("");

      if (!pos.length) continue;

      const q = `${site}${neg}${pos}`.trim();
      const { txt, htm } = await getSerps(q);
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
      const { txt, htm } = await getCraigslist(q);
      console.log("craigslist found: ", txt);

      text += txt;
      html += htm;
    }

    await sendEmail(user.email, search.name, text, html).catch(console.error);
  }
}
