// deno-lint-ignore-file no-async-promise-executor
import { config } from "../../src/deps.ts";
const ENV = config();

interface emailData {
  from?: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export default (data: emailData) =>
  new Promise<void>(async (resolve, reject) => {
    const auth = btoa(`api:${ENV.MAILGUN_API_KEY}`);
    const form = new FormData();
    form.append("from", `${ENV.HOST_PATH} ${data.from || ENV.META_EMAIL}`);
    form.append("to", data.to);
    form.append("subject", data.subject);
    form.append("text", data.text);
    form.append("html", `<html>${data.html}</html>`);

    const res = await fetch(
      `https://api.mailgun.net/v3/${ENV.MAILGUN_DOMAIN}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
        },
        body: form,
      }
    );

    if (!res.ok) {
      reject(await res.text());
    }

    resolve();
  });
