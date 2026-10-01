/* Loads the unpacked extension in Chromium, opens a saved grading page at its real address
   (admin.ielts1984.vn is faked, nothing goes to the CRM), clicks "Tạo bài ôn Đậu" and checks
   the editor opens on that essay.
     CRM=<saved grading page.html> OUT=<dir> node tests/extension.test.mjs */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, mkdtempSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const EXT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { CRM, OUT = "/tmp/dau-ext-test" } = process.env;
mkdirSync(OUT, { recursive: true });
let failures = 0;
const ok = (c, what) => { console.log((c ? "ok   " : "FAIL ") + what); if (!c) failures++; };

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "dau-")), {
  channel: "chromium", headless: true, viewport: { width: 1400, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
try {
  const crmCalls = [];
  await ctx.route("https://admin.ielts1984.vn/**", r => {
    crmCalls.push(r.request().method() + " " + r.request().url());
    if (r.request().url().includes("/writing/")) return r.fulfill({ contentType: "text/html", body: readFileSync(CRM) });
    return r.fulfill({ status: 204, body: "" });
  });
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  let [sw] = ctx.serviceWorkers();
  if (!sw) sw = await ctx.waitForEvent("serviceworker");
  ok(/^chrome-extension:\/\//.test(sw.url()), "extension loaded " + sw.url());

  const page = await ctx.newPage();
  await page.goto("https://admin.ielts1984.vn/writing/12345", { waitUntil: "domcontentloaded" });
  const btn = page.locator("#dau-make-review");
  await btn.waitFor({ timeout: 10000 });
  await page.waitForLoadState("load"); await page.waitForTimeout(800);   // the content script runs at document_idle
  ok(await btn.textContent() === "Tạo bài ôn Đậu", "button on the grading page");
  const htmlBefore = await page.evaluate(() => document.body.innerHTML.length);
  const [editor] = await Promise.all([ctx.waitForEvent("page"), btn.click()]);
  await editor.waitForLoadState();
  ok(/\/editor\.html\?page=page-\d+$/.test(editor.url()), "editor opens " + editor.url());
  await editor.locator("h1").first().waitFor({ timeout: 10000 });
  const h1 = await editor.locator("h1").first().textContent();
  ok(h1 && h1 !== "Soạn bài ôn cho học viên", "editor shows the student: " + h1);
  ok(/Week \d/.test(await editor.locator("#who").textContent()), "homework detected: " + await editor.locator("#who").textContent());
  await editor.screenshot({ path: join(OUT, "ext-editor.png") });
  ok(await page.evaluate(() => document.body.innerHTML.length) === htmlBefore, "grading page unchanged");
  ok(crmCalls.every(c => c.startsWith("GET ")), "only GET requests to the CRM: " + crmCalls.filter(c => !c.startsWith("GET ")).join(", "));
  await page.screenshot({ path: join(OUT, "ext-crm.png") });

  // the draft key follows the CRM writing id
  const keys = await editor.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
  await editor.waitForTimeout(600);
  const keys2 = await editor.evaluate(async () => Object.keys(await chrome.storage.local.get(null)));
  ok(keys2.includes("draft:w12345"), "draft saved under the writing id " + JSON.stringify(keys2));

  // options page
  const opt = await ctx.newPage();
  await opt.goto(sw.url().replace("background.js", "options.html"));
  ok(await opt.locator("#teacher").inputValue() === "anh Khoa", "options: default teacher");
  await opt.fill("#teacher", "cô Test"); await opt.click("#save");
  const s = await opt.evaluate(async () => (await chrome.storage.local.get("settings")).settings);
  ok(s.teacher === "cô Test" && s.zalo === "https://zalo.me/0838002910", "options save");
  void keys;
} finally {
  await ctx.close();
}
console.log(failures ? `${failures} FAILED` : "all ok");
process.exit(failures ? 1 : 0);
