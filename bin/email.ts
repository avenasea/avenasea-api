import { config } from "https://deno.land/x/dotenv/mod.ts";
import { db } from "../src/db.ts";

const ENV = config();

const sites = [
  "inurl:lever.co",
  "inurl:workable.com",
  "inurl:greenhouse.io",
  "inurl:jobvite.com",
  "inurl:recruiterbox.com",
  "angel.co/company+inurl:/jobs",
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
  // return { txt, htm };

  const res = await fetch(
    `https://api.scaleserp.com/search?api_key=${ENV.SCALESERP_API_KEY}&q=${q}&gl=us&hl=en&time_period=last_week&num=20`,
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
  );

  if (!res.ok) {
    console.error(await res.text());
  }

  return await res.json();
}

const users = await db.queryEntries("SELECT * FROM users");
console.log(users);

for (const user of users) {
  // todo: check for if account active or paid
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

      const q = `${site}${neg}${pos}`;
      const { txt, htm } = await getSerps(q);
      console.log(user.email, search.name, q);

      text += txt;
      html += htm;
    }

    await sendEmail(user.email, search.name, text, html);
  }
}

// for (const email of emails) {
//   await sendEmail(email, text, html);
// }
