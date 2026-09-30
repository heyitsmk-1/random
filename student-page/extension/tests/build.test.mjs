/* The page built in the browser (lib/build.js) must be byte for byte what build.py makes.
     node tests/build.test.mjs          (every data/lesson-*.json; needs the bundle built) */
import { createRequire } from "node:module";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const EXT = join(dirname(fileURLToPath(import.meta.url)), ".."), ROOT = join(EXT, "..");
const lessons = readdirSync(join(ROOT, "data")).filter(f => /^lesson-.*\.json$/.test(f));
if (!lessons.length || !existsSync(join(EXT, "bundle/assets.json"))) { console.error("needs data/lesson-*.json and a built bundle"); process.exit(2); }

const browser = await chromium.launch();
const page = await (await browser.newContext({ ignoreHTTPSErrors: true })).newPage();
await page.route("https://dau.test/**", r => {
  const f = join(EXT, new URL(r.request().url()).pathname);
  return existsSync(f) ? r.fulfill({ contentType: extname(f) === ".js" ? "text/javascript" : "text/html", body: readFileSync(f) }) : r.fulfill({ status: 404, body: "" });
});
await page.goto("https://dau.test/options.html");        // any page: a secure origin for crypto.subtle
let failures = 0;
for (const f of lessons) {
  const name = f.slice(7, -5);
  execFileSync("python3", ["build.py", join("data", f)], { cwd: ROOT, stdio: "pipe" });
  const want = readFileSync(join(ROOT, "dist", name + ".html"), "utf8");
  const L = JSON.parse(readFileSync(join(ROOT, "data", f), "utf8"));
  const P = JSON.parse(readFileSync(join(ROOT, "data", L.page), "utf8"));
  delete L.page;
  for (const k of ["scores", "essay", "corrections", "task_comments"]) L[k] = P[k];
  if (!("word_count" in L)) L.word_count = P.word_count;
  const got = await page.evaluate(async lesson => {
    const { buildPage } = await import("/lib/build.js");
    const get = async p => (await fetch("/bundle/" + p)).text();
    const { html, problems } = await buildPage(lesson, { template: await get("template.html"), assets: JSON.parse(await get("assets.json")), quotes: JSON.parse(await get("quotes.json")).quotes });
    return { html, problems };
  }, L);
  const same = got.html === want;
  let where = "";
  if (!same) { let i = 0; while (got.html[i] === want[i]) i++; where = ` first difference at ${i}: py …${want.slice(i - 40, i + 40)}… js …${got.html.slice(i - 40, i + 40)}…`; }
  console.log((same ? "ok   " : "FAIL ") + name + (got.problems.length ? " problems: " + got.problems.join("; ") : "") + where);
  if (!same) failures++;
}
await browser.close();
console.log(failures ? `${failures} FAILED` : "all ok");
process.exit(failures ? 1 : 0);
