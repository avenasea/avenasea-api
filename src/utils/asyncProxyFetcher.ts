// deno-lint-ignore-file no-async-promise-executor
import { pooledMap } from "https://deno.land/std/async/mod.ts";

export interface RequestData {
  url: string;
  otherData?: Record<any, any>; // optional passthrough data
}

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

export default class AsyncProxyFetcher {
  private poolLimit: number;
  private proxy: {
    url: string;
    basicAuth: {
      username: string;
      password: string;
    };
  };

  constructor(options: {
    poolLimit?: number;
    proxy: {
      url: string;
      basicAuth: {
        username: string;
        password: string;
      };
    };
  }) {
    this.poolLimit = options.poolLimit || 25;
    this.proxy = options.proxy;
  }

  public fetchAll(requests: RequestData[]) {
    return pooledMap(this.poolLimit, requests, (requestData) => {
      return new Promise<{ body: any; url: string; otherData: any }>(
        async (resolve) => {
          const url = requestData.url;

          const client = Deno.createHttpClient({
            proxy: this.proxy,
          });

          try {
            const UA = UAs[~~(Math.random() * UAs.length)];

            const res = await fetch(url, {
              client,
              headers: {
                "User-Agent": UA,
              },
            });
            let body = res?.ok && (await res.json());

            if (!body) {
              body = { error: true };
            }
            resolve({ body, url, otherData: requestData.otherData });
          } catch (err) {
            console.error(err);
          }
        }
      );
    });
  }
}
