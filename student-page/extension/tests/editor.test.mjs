/* End-to-end test of the editor, with Claude and Netlify faked (no real calls).
     CRM=<saved grading page.html> LESSON=<a lesson.json for the same essay> OUT=<dir> node tests/editor.test.mjs
   The lesson is turned back into the shape Claude returns, so the fake reply fits the page.
   Needs `python3 tools/build_extension.py` first (bundle/ and vendor/). */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const EXT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { CRM, LESSON, OUT = "/tmp/dau-editor-test" } = process.env;
if (!CRM || !LESSON) { console.error("set CRM and LESSON"); process.exit(2); }
if (!existsSync(join(EXT, "vendor/anthropic.mjs"))) { console.error("run tools/build_extension.py first"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, what) => { console.log((cond ? "ok   " : "FAIL ") + what); if (!cond) failures++; };

/* ---------- the fake Claude reply ---------- */
function draftFromLesson(L) {
  let firstGra = true;
  const blankAsk = { q: "", options: [], answer: 0 };
  return {
    call_name: L.student, hello: L.hello, results: L.results,
    framework: { intro: L.framework.intro, reveal_intro: L.framework.reveal_intro, ok: L.framework.ok, verdict: L.framework.verdict,
      parts: L.framework.parts.map(p => ({ label: p.label, tone: p.tone, sids: p.sids, summary: p.summary, short: p.short || "", ideas: p.ideas || [] })) },
    prompt_check: L.prompt_check ? { intro: L.prompt_check.intro, items: L.prompt_check.items.map(it => ({ sid: it.sid, focus: it.focus, prompt_focus: it.prompt_focus,
      ask: it.ask || null, line: it.line || "", fix: it.fix || "", fix_line: it.fix_line || "" })) } : null,
    ideas: { intro: L.ideas.intro, prompt_focus: L.ideas.prompt_focus || "", overview: L.ideas.overview,
      details: L.ideas.details.map(d => ({ tag: d.tag, title: d.title, sids: d.sids, chain: d.chain,
        mode: d.replace ? "replace" : d.gap_after != null ? "gap" : d.bad_node != null ? "bad_link" : "missing_end",
        bad_node: d.bad_node ?? null, gap_after: d.gap_after ?? null, ask: d.ask, fix_intro: d.fix_intro, fix_chain: d.fix_chain,
        fix_label: d.replace || d.fix_label || "", fix_en: d.fix_en, outro: d.outro })) },
    linking: L.linking,
    mistakes: {
      groups: [
        ...L.mistakes.main.map(m => ({ id: m.id, title: m.title, tab: m.tab, cids: m.cids,
          role: m.tab === "GRA" ? (firstGra ? (firstGra = false, "main") : "optional") : m.core ? "core" : "optional",
          count_line: m.count_line, ask: m.ask, reason: m.reason, board: m.board, rule: m.rule, example: m.example })),
        ...L.mistakes.others.map((o, i) => ({ id: "o" + i, title: o.label, tab: o.tag, cids: o.cids, role: "other", count_line: "", ask: blankAsk,
          reason: "", board: [], rule: [], example: { bad: "", good: "" } })),
      ],
      lr_intro: L.mistakes.lr_intro, gra_intro: L.mistakes.gra_intro,
    },
    practice: { intro: L.practice.intro, core: L.practice.core, items: L.practice.items.map(it => ({
      id: it.id, mistake: it.mistake, type: it.type, q: it.q || "", sentence: it.sentence ?? null,
      options: it.type === "choose" ? it.options : null, answer_index: it.type === "choose" ? it.answer : null,
      wrong: it.wrong ?? null, fix: it.fix ?? null, vi: it.vi ?? null,
      answer_words: it.type === "build" ? it.answer : null, extra: it.extra ?? null, explain: it.explain })) },
    rewrite: L.rewrite,
    praise_candidates: [...(L.praise || []).map(p => ({ ...p, evidence: "(test)" })), { at: "linking", line: "Linking của em đa dạng ghê", evidence: "(test)" }],
    takeaway_candidates: [...L.finish.takeaways, "Đọc kỹ đề trước khi viết", "Mỗi ý cần kết quả cuối"],
    finish: { summary: L.finish.summary, extra_prompt: L.finish.extra_prompt, later: L.finish.later, done: L.finish.done },
  };
}
function sse(text) {
  const ev = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  const chunks = text.match(/[\s\S]{1,4000}/g);
  return ev("message_start", { message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 12000, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) +
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    chunks.map(t => ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: t } })).join("") +
    ev("content_block_stop", { index: 0 }) +
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 9000 } }) +
    ev("message_stop", {});
}

/* ---------- the fake Netlify ---------- */
const NET = { sites: {}, deploys: {}, calls: [], dropFromList: null };
const sha1 = b => createHash("sha1").update(b).digest("hex");
async function netlify(route) {
  const req = route.request(), url = new URL(req.url()), p = url.pathname.replace("/api/v1", ""), m = req.method();
  NET.calls.push(`${m} ${p}`);
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(body) });
  if (m === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
  if (req.headers().authorization !== "Bearer nfp_test") return json(401, { message: "Unauthorized" });
  let r;
  if (m === "POST" && p === "/sites") { const id = "site1"; NET.sites[id] = { id, ssl_url: "https://calm-otter-123.netlify.app", files: {}, published_deploy: null }; return json(201, NET.sites[id]); }
  if ((r = p.match(/^\/sites\/(\w+)$/)) && m === "GET") return NET.sites[r[1]] ? json(200, NET.sites[r[1]]) : json(404, {});
  if ((r = p.match(/^\/sites\/(\w+)\/files$/))) {
    const pg = +url.searchParams.get("page") || 1;
    const all = Object.entries(NET.sites[r[1]].files).filter(([k]) => k !== NET.dropFromList).map(([path, sha]) => ({ id: path, path, sha }));
    return json(200, all.slice((pg - 1) * 100, pg * 100));
  }
  if ((r = p.match(/^\/sites\/(\w+)\/deploys$/)) && m === "POST") {
    const files = JSON.parse(req.postData()).files, site = NET.sites[r[1]], id = "d" + (Object.keys(NET.deploys).length + 1);
    const have = new Set(Object.values(site.files));
    NET.deploys[id] = { id, site: r[1], files, got: {}, required: [...new Set(Object.values(files).filter(s => !have.has(s)))] };
    return json(200, { id, required: NET.deploys[id].required });
  }
  if ((r = p.match(/^\/deploys\/(\w+)\/files(\/.*)$/)) && m === "PUT") {
    const d = NET.deploys[r[1]], body = req.postDataBuffer();
    if (sha1(body) !== d.files[decodeURI(r[2])]) return json(422, { message: "sha mismatch" });
    d.got[sha1(body)] = body.toString("utf8");
    return json(200, {});
  }
  if ((r = p.match(/^\/deploys\/(\w+)$/)) && m === "GET") {
    const d = NET.deploys[r[1]];
    const ready = d.required.every(s => s in d.got);
    if (ready) { const site = NET.sites[d.site]; site.files = d.files; site.published_deploy = { id: d.id }; site.bodies = { ...(site.bodies || {}), ...d.got }; }
    return json(200, { id: d.id, state: ready ? "ready" : "uploading" });
  }
  return json(404, { message: "not faked: " + m + " " + p });
}

/* ---------- serve the extension ---------- */
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
async function serve(route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/fixture/page.html") return route.fulfill({ contentType: "text/html", body: readFileSync(CRM) });
  const f = join(EXT, decodeURIComponent(url.pathname));
  if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ contentType: TYPES[extname(f)] || "application/octet-stream", body: readFileSync(f) });
}

const lesson = JSON.parse(readFileSync(LESSON, "utf8"));
const draftText = JSON.stringify(draftFromLesson(lesson));
let claudeMode = "ok", claudeBody = null;
async function claude(route) {
  const req = route.request(), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  claudeBody = JSON.parse(req.postData());
  if (claudeMode === "401") return route.fulfill({ status: 401, headers: cors, contentType: "application/json",
    body: JSON.stringify({ type: "error", error: { type: "authentication_error", message: "invalid x-api-key" } }) });
  return route.fulfill({ status: 200, headers: { ...cors, "content-type": "text/event-stream" }, body: sse(draftText) });
}

async function setup(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ignoreHTTPSErrors: true, reducedMotion: "reduce" });
  await ctx.route("https://dau.test/**", serve);
  await ctx.route("https://api.anthropic.com/**", claude);
  await ctx.route("https://api.netlify.com/**", netlify);
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
  await ctx.addInitScript(() => {
    if (!localStorage.getItem("dau:settings")) localStorage.setItem("dau:settings", JSON.stringify({ apiKey: "sk-ant-test", netlifyToken: "nfp_test" }));
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
  page.on("dialog", d => d.accept());
  return { ctx, page, errors };
}
const frameReady = async page => {
  const f = page.frameLocator("#pv");
  try { await f.locator("#app .content").waitFor({ state: "attached", timeout: 8000 }); }
  catch (e) { console.log("preview:", (await page.locator("#pv").getAttribute("srcdoc") || "(none)").slice(0, 300)); throw e; }
  return f;
};

const browser = await chromium.launch();
try {
  /* 1. start screen */
  {
    const { page, errors } = await setup(browser);
    await page.goto("https://dau.test/editor.html");
    await page.getByText("Soạn bài ôn cho học viên").waitFor();
    await page.screenshot({ path: join(OUT, "01-start.png") });
    ok(errors.length === 0, "start screen, no errors " + errors.join(" | "));
    await page.context().close();
  }

  /* 2. the whole flow */
  const { ctx, page, errors } = await setup(browser);
  await page.goto("https://dau.test/editor.html?html=/fixture/page.html");
  await page.locator("h1").first().waitFor();
  const weekSel = await page.locator("label:has-text('Tuần') select").inputValue();
  ok(weekSel === String(/Week (\d+)/.exec(lesson.homework)[1]), `week detected from the homework title (${weekSel})`);
  ok(await page.locator("label:has-text('Đậu gọi em là') input").inputValue() === lesson.student, "call name = " + lesson.student);
  await page.screenshot({ path: join(OUT, "02-page.png"), fullPage: true });

  await page.getByRole("button", { name: "Tiếp: Framework" }).click();
  const tagsBefore = await page.locator(".sent.tagged").count();
  ok(tagsBefore > 3, `intro, topic sentences and conclusion pre-tagged (${tagsBefore})`);
  await page.getByRole("button", { name: "Ý 1", exact: true }).click();
  await page.locator(".sent:not(.tagged)").first().click();
  ok(await page.locator(".tagchip", { hasText: "Ý 1" }).count() === 1, "tag a sentence as Ý 1");
  await page.locator(".tri button[data-v=yes]").first().click();
  await page.locator(".tri button[data-v=no]").nth(1).click();
  await page.getByRole("button", { name: "Chọn phần viết lại" }).click();
  await page.locator(".sent").nth(4).click();
  ok(await page.locator(".sent.picked").count() === 1, "pick a rewrite sentence");
  await page.screenshot({ path: join(OUT, "03-framework.png"), fullPage: true });
  await page.getByRole("button", { name: "Tiếp: Soạn nháp" }).click();

  await page.getByRole("button", { name: "Soạn nháp" }).click();
  await page.locator(".edit").waitFor({ timeout: 15000 });
  ok(claudeBody && claudeBody.model === "claude-opus-5-5" && claudeBody.stream === true, "one streaming call to claude-opus-5-5");
  ok(claudeBody.output_config?.format?.type === "json_schema", "structured output (json_schema)");
  ok(claudeBody.system?.some(b => b.cache_control?.type === "ephemeral"), "course block is cached");
  const um = claudeBody.messages[0].content;
  ok(/"tag": "Ý 1"/.test(um) && /"ok": true/.test(um) && /"rewrite_target"/.test(um), "tags, checklist and rewrite target are sent");
  ok(!/sk-ant-test/.test(JSON.stringify(claudeBody)), "API key not in the body");

  let f = await frameReady(page);
  ok(await page.locator(".mod-btn .count").count() > 5, "AI lines are counted per module");
  await page.screenshot({ path: join(OUT, "04-edit-hello.png") });

  // edit a line: lint, then it becomes the teacher's
  const hello0 = page.locator(".form .lines input").first();
  await hello0.fill("Chào em.");
  ok(/dấu chấm/.test(await page.locator(".form .lines .lint").first().textContent()), "voice lint flags a full stop");
  await hello0.fill("Chào " + lesson.student + " nha");
  ok((await page.locator(".form .lines .lint").first().textContent()) === "", "lint clears");
  await page.waitForTimeout(900);
  f = await frameReady(page);
  ok((await f.locator("#dauLine").textContent()).includes("Chào " + lesson.student + " nha"), "preview shows the edited line");

  // every module renders with a preview
  for (const name of ["Kết quả", "Framework", "Phát triển ý", "Linking", "Từ vựng & ngữ pháp", "Luyện tập", "Viết lại", "Lời khen", "Kết thúc"]) {
    await page.locator(".mod-btn", { hasText: name }).click();
    await frameReady(page);
    await page.waitForTimeout(250);
    await page.screenshot({ path: join(OUT, `05-${name.replace(/\W+/g, "_")}.png`) });
  }
  ok(errors.length === 0, "all modules render " + errors.join(" | "));

  // drag a correction into another group
  await page.locator(".mod-btn", { hasText: "Từ vựng & ngữ pháp" }).click();
  const groups = page.locator(".form .sub");
  const before0 = await groups.nth(0).locator(".cchip").count(), before1 = await groups.nth(1).locator(".cchip").count();
  await groups.nth(1).locator(".cchip").first().dragTo(groups.nth(0).locator(".chips"));
  ok(await groups.nth(0).locator(".cchip").count() === before0 + 1 && await groups.nth(1).locator(".cchip").count() === before1 - 1, "drag a correction between groups");
  await page.screenshot({ path: join(OUT, "06-drag.png") });

  // approve everything
  for (const b of await page.locator(".mod-btn").all()) {
    await b.click();
    const a = page.getByRole("button", { name: "Duyệt cả phần này" });
    if (await a.count()) await a.click();
  }
  // praise: keep 2, approve
  await page.locator(".mod-btn", { hasText: "Lời khen" }).click();
  const boxes = page.locator(".form .pick input[type=checkbox]");
  while (await page.locator(".form .pick input[type=checkbox]:checked").count() > 2) await page.locator(".form .pick input[type=checkbox]:checked").last().click();
  while (await page.locator(".form .pick input[type=checkbox]:checked").count() < 2) await page.locator(".form .pick input[type=checkbox]:not(:checked)").first().click();
  await page.getByRole("button", { name: "Duyệt lời khen" }).click();
  ok(await page.getByText("Đã duyệt lời khen").count() === 1, "praise approved");
  ok(await boxes.count() >= 2, `praise candidates listed (${await boxes.count()}, lesson had ${(lesson.praise || []).length})`);
  ok(await page.locator(".mod-btn .count").count() === 0, "nothing left unapproved");

  /* export */
  await page.getByRole("button", { name: "5 · Xuất" }).click();
  ok(await page.getByText("Bài ôn dựng được.").count() === 1, "export: no blocking problems");
  await page.screenshot({ path: join(OUT, "07-export.png"), fullPage: true });
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải file HTML" }).click()]);
  const saved = join(OUT, "exported.html");
  await dl.saveAs(saved);
  ok(/^Dau-on-bai-.+-Writing-Week-\d+\.html$/.test(dl.suggestedFilename()), "file name " + dl.suggestedFilename());
  const html = readFileSync(saved, "utf8");
  ok(!html.includes("__candidates") && !html.includes("__mistake_roles") && !html.includes("sk-ant"), "no editor-only data or keys in the page");

  /* publish twice: the second deploy keeps the first page */
  await page.getByRole("button", { name: "Đăng link" }).click();
  await page.getByText("Đã đăng:").waitFor({ timeout: 8000 });
  const link1 = await page.locator("#pubStatus a").getAttribute("href");
  await page.getByRole("button", { name: "Đăng link" }).click();
  await page.waitForFunction(prev => { const a = document.querySelector("#pubStatus a"); return a && a.href !== prev; }, link1, { timeout: 8000 });
  const link2 = await page.locator("#pubStatus a").getAttribute("href");
  const site = NET.sites.site1, p1 = new URL(link1).pathname + "index.html", p2 = new URL(link2).pathname + "index.html";
  ok(/^https:\/\/calm-otter-123\.netlify\.app\/r\/[a-z2-9]{10}\/$/.test(link1) && link1 !== link2, `two unguessable links (${link1}, ${link2})`);
  ok(p1 in site.files && p2 in site.files && "/robots.txt" in site.files && "/_headers" in site.files, "second deploy keeps the first page");
  ok(NET.deploys.d2.required.length <= 1 && NET.deploys.d1.required.length === 4, "second deploy uploads at most the new page (same content = same hash = nothing to upload)");
  ok(site.bodies[site.files[p2]]?.includes("<!doctype html>"), "second page is served");
  ok(site.bodies[site.files[p1]].includes('name="robots" content="noindex'), "page is noindex");
  ok(NET.calls.filter(c => c === "POST /sites").length === 1, "one site, created once");
  await page.screenshot({ path: join(OUT, "08-published.png") });

  // a page missing from the site's list: refuse to deploy
  NET.dropFromList = p1;
  const nDeploys = Object.keys(NET.deploys).length;
  await page.getByRole("button", { name: "Đăng link" }).click();
  await page.locator("#pubStatus .notice.bad").waitFor({ timeout: 8000 });
  ok(Object.keys(NET.deploys).length === nDeploys, "refuses to deploy when an old page is missing");
  NET.dropFromList = null;

  /* reload: the draft is still there */
  await page.goto("https://dau.test/editor.html?html=/fixture/page.html");
  await page.locator(".step-btn[aria-current=step]").waitFor();
  ok((await page.locator(".step-btn[aria-current=step]").textContent()).includes("Xuất"), "reload resumes the saved draft: " + await page.locator(".step-btn[aria-current=step]").textContent());
  ok(errors.length === 0, "no page errors " + errors.join(" | "));
  await ctx.close();

  /* 3. a wrong API key */
  {
    claudeMode = "401";
    const { page, errors } = await setup(browser);
    await page.goto("https://dau.test/editor.html?html=/fixture/page.html");
    await page.getByRole("button", { name: "3 · Nháp" }).click();
    await page.getByRole("button", { name: "Soạn nháp" }).click();
    await page.locator("#draftStatus .notice.bad").waitFor({ timeout: 15000 });
    ok(/API key không đúng/.test(await page.locator("#draftStatus").textContent()), "wrong key: clear message");
    ok(errors.filter(e => !/401/.test(e)).length === 0, "wrong key: no page errors " + errors.join(" | "));
    await page.context().close();
  }
} finally {
  await browser.close();
}
console.log(failures ? `${failures} FAILED` : "all ok");
process.exit(failures ? 1 : 0);
