import { config } from "https://deno.land/x/dotenv/mod.ts";
import { ats } from './ats.ts';

const ENV = config();

let text: string = "";
let html: string = "";

const emails = [
  "ettinger@gmail.com",
  "leo@finalresort.org",
];

const sites = ats;

const keywords = [
  "svelte",
  "vue",
  "deno",
];

const positive = [
  "javascript",
  "typescript",
];

const negative = [
  "react",
  "reactjs",
  "angular",
  "angularjs",
];

async function getSerps(q: string): Promise<any> {
  let txt: string = "";
  let htm: string = "";
  const res = await fetch(
    `https://api.scaleserp.com/search?api_key=74BEEFF70A2645618A2BB3845408B96A&q=${q}&gl=us&hl=en&time_period=last_week&num=20`,
  );
  const data = await res.json();

  console.log("fetching:", q);

  if (!data.organic_results?.length) return { txt, htm };

  htm += `
	<h1><a href="https://google.com/search?q=${q}" target="_new">${q}</a></h1>
	<ol>
`;

  txt += `
==========================
${q}
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

async function sendEmail(email: string, txt: string, htm: string) {
  const auth = btoa(`api:${ENV.MAILGUN_API_KEY}`);
  const form = new FormData();
  form.append("from", `Anthony Ettinger ${ENV.META_EMAIL}`);
  form.append("to", email);
  form.append("subject", `remote jobs`);
  form.append("text", txt);
  form.append("html", `<html>${htm}</html>`);

  const res = await fetch(
    "https://api.mailgun.net/v3/mg.startworkingremotely.com/messages",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
      },
      body: form,
    },
  );

  if (!res.ok) {
    console.error(await res.text());
  }

  return await res.json();
}

for (const site of sites) {
  for (const kw of keywords) {
    const neg = negative.map((n) => " -" + n).join("");
    const pos = positive.map((p) => " " + p).join("");
    const q = `${site} ${kw}${neg}${pos}`;
    const { txt, htm } = await getSerps(q);

    text += txt;
    html += htm;
  }
}

for (const email of emails) {
  await sendEmail(email, text, html);
}
