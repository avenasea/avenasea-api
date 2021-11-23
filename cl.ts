import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import { pooledMap } from "https://deno.land/std/async/mod.ts";
import puppeteer from 'https://deno.land/x/puppeteer/mod.ts';
import { parse } from "https://deno.land/std/flags/mod.ts";
import cities from './cities.js';

const args = parse(Deno.args);
const { query, remote } = args;

if (!query) {
	console.error('Please provide a query');
	Deno.exit(1);
}

const results = [];
const UA = 'Mozilla/5.0 (X11; Linux x86_64; rv:94.0) Gecko/20100101 Firefox/94.0';
console.log(`Searching ${cities.length} cities....`);
const requests: Request[] = cities.map(city => {
	return `https://${city}.craigslist.org/search/sof?query=${encodeURIComponent(query)}&${remote ? 'is_telecommuting=1' : ''}&employment_type=2&employment_type=3`;
});
const pool = pooledMap(200, requests, (url) => {
	return getWithFetch(url);
});

async function getWithFetch(url, retry = 1) {
	if (retry > 1) {
		console.log('attempt ', retry);
	}

	const client = Deno.createHttpClient({
		proxy: {
			url: 'http://p.webshare.io',
			basicAuth: {
				username: 'dmdgluqz-US-rotate',
				password: '8rxcagjln8n36to4'
			}
		}
	});

	const res = await fetch(url, {
		client,
		headers: {
			'User-Agent': UA
		}
	});

	let body = res.ok && await res.text();

	if (!body && retry < 10) {
		console.log(`body, trying again...: ${url}`);
		({ body, url } = await getWithFetch(url, ++retry));
		console.log('retry found body: ', body.length);
	}
	return { body, url };
}

async function getWithPuppeteer(url) {
	console.log(url);
	const browser = await puppeteer.launch({
		devtools: false,
		headless: false,
		ignoreHTTPSErrors: true,
		//userDataDir: '/tmp',
		args: [
			'--proxy-server=p.webshare.io:80',
			'--no-sandbox',
			'--disable-dev-shm-usage',
			'--disable-gpu',
			'--single-process',
			'--disable-setuid-sandbox',
			'--no-zygote',
			'--shm-size=4gb',
			'--disable-infobars',
			'--ignore-certifcate-errors',
			'--ignore-certifcate-errors-spki-list',
			'--window-position=0,0'
			`--user-agent="${UA}"`,
		]
	}).catch(console.error);
	const page = await browser.newPage().catch(console.error);

	await page.authenticate({
		username: 'dmdgluqz-US-rotate',
		password: '8rxcagjln8n36to4'
	}).catch(console.error);

	//await page.setViewport({ width: 800, height: 600 });
	await page.goto(url, { waitUntil: 'domcontentloaded' }).catch(console.error);

	const body = await page.content().catch(console.error);
	//console.log(body);

	await browser.close();
	return { body, url };
}

for await (const data of pool) {
	if (!data.body) {
		console.log('missing body: ', data.url);
		continue;
	}
	//console.log('found body: ', data.body.length);
	const doc = new DOMParser().parseFromString(data.body, "text/html");
	const links = [...doc.querySelectorAll('a.result-title')];

	for (const link of links) {
		const title = link.innerText;
		const url = link.getAttribute('href');
		const urls = [];

		const exists = results.some(item => item.title === title);

		if (exists) {
			const entry = results.find(item => item.title === title);
			if (entry) {
				console.log('found existing entry!');
			}

			if (!entry.urls.some(u => u === url)) {
				entry.urls.push(url);
			}
		}

		if (!exists) {
			urls.push(url);
			results.push({ title, urls });
		}
	}
}

console.log(results);
console.log('Found ', results.length, ' results');
