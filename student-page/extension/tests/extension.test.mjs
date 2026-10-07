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

/* BAI_GOC=<the same page saved with the "Bài gốc" tab open>: the fake page switches views like the CRM
   (Bài gốc shows her essay as sent; Bài sửa của giáo viên brings the editors back) */
const { BAI_GOC } = process.env;
function crmPage() {
  const html = readFileSync(CRM, "utf8");
  if (!BAI_GOC) return html;
  const goc = readFileSync(BAI_GOC, "utf8");
  const m = /<div class="text-sm leading-loose xl:text-base whitespace-pre-line">[\s\S]*?<\/div>/.exec(goc);
  const fake = `<template id="fake-goc"><div class="fake-goc">${m ? m[0] : ""}</div></template><script>
    document.addEventListener("click", e => {
      const t = (e.target.textContent || "").trim(), ms = document.querySelector("#main-scroll");
      if (t === "Bài gốc") setTimeout(() => { if (!ms.querySelector(".fake-goc")) ms.prepend(document.getElementById("fake-goc").content.cloneNode(true)); }, 250);
      if (t === "Bài sửa của giáo viên") setTimeout(() => ms.querySelectorAll(".fake-goc").forEach(n => n.remove()), 250);
    }, true);<\/script>`;
  return html.replace("</body>", fake + "</body>");
}

const ctx = await chromium.launchPersistentContext(mkdtempSync(join(tmpdir(), "dau-")), {
  channel: "chromium", headless: true, viewport: { width: 1400, height: 900 },
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
});
try {
  const crmCalls = [];
  await ctx.route("https://admin.ielts1984.vn/**", r => {
    crmCalls.push(r.request().method() + " " + r.request().url());
    if (r.request().url().includes("/writing/")) return r.fulfill({ contentType: "text/html", body: crmPage() });
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
  if (BAI_GOC) {
    // her sentences come from Bài gốc: none of the teacher's typing in them
    const d = await editor.evaluate(async () => (await chrome.storage.local.get("draft:w12345"))["draft:w12345"]);
    const P = (d.lesson || d).page, C = P.corrections;
    const text = P.essay.paragraphs.flatMap(p => p.sentences).map(s => s.segs.map(g => typeof g === "string" ? g : C[g.c].orig).join("")).join(" ");
    ok(text.length > 200 && !/=>|COMMENT|\(\(|\)\)/.test(text), "Bài gốc read: her sentences without the teacher's typing");
    ok(await page.evaluate(() => !document.querySelector(".fake-goc")), "back on Bài sửa của giáo viên");
  }

  // options page
  const opt = await ctx.newPage();
  await opt.goto(sw.url().replace("background.js", "options.html"));
  ok(await opt.locator("#teacher").inputValue() === "anh Khoa", "options: default teacher");
  await opt.fill("#teacher", "cô Test"); await opt.click("#save");
  const s = await opt.evaluate(async () => (await chrome.storage.local.get("settings")).settings);
  ok(s.teacher === "cô Test" && s.zalo === "https://zalo.me/0838002910", "options save");
  void keys;

  // the phone preview runs the student page's inline script inside the extension (the bug: Chrome
  // blocks inline scripts on extension pages, so the preview stayed blank)
  const probe = '<!doctype html><body><div id="x">waiting</div><script>try { localStorage.getItem("a"); } catch (e) {} document.getElementById("x").textContent = "ran";<\/script>';
  await editor.evaluate(async html => {
    const { showInPreview } = await import("/lib/preview.js");
    const f = document.createElement("iframe"); f.id = "probe"; document.body.append(f);
    await showInPreview(f, html);
  }, probe);
  await editor.waitForTimeout(400);
  const pf = editor.frames().find(f => /preview\.html/.test(f.url()));
  ok(pf && await pf.evaluate(() => document.getElementById("x").textContent) === "ran", "preview frame runs inline scripts (sandboxed page)");
  if (process.env.LESSON) {
    // a whole student page, built and shown the way the editor does it
    const lesson = JSON.parse(readFileSync(process.env.LESSON, "utf8"));
    await editor.evaluate(async ({ lesson, crm }) => {
      const { extractPage } = await import("/lib/extract.js");
      const { buildPage } = await import("/lib/build.js");
      const { showInPreview } = await import("/lib/preview.js");
      const get = async (f, t) => { const r = await fetch("bundle/" + f); return t ? r.text() : r.json(); };
      const [template, assets, quotes, course] = await Promise.all([get("template.html", 1), get("assets.json"), get("quotes.json"), get("course.json")]);
      const page = extractPage(crm);
      const full = { ...lesson, essay: page.essay, corrections: page.corrections, task_comments: page.task_comments, scores: page.scores, word_count: page.word_count, __preview: true };
      const { html } = await buildPage(full, { template, assets, quotes: quotes.quotes, course });
      await showInPreview(document.getElementById("probe"), html);
    }, { lesson, crm: readFileSync(CRM, "utf8") });
    await editor.waitForTimeout(1500);
    const lf = editor.frames().find(f => /preview\.html/.test(f.url()));
    const line = lf ? await lf.evaluate(() => (document.getElementById("dauLine") || {}).textContent || "") : "";
    ok(line.length > 3, "a whole student page plays in the preview: " + line.slice(0, 50));
    await editor.screenshot({ path: join(OUT, "ext-preview.png") });
  }
} finally {
  await ctx.close();
}
console.log(failures ? `${failures} FAILED` : "all ok");
process.exit(failures ? 1 : 0);
