/* The editor on the other homework types, with Claude faked: Week 1 (one paragraph + paraphrasing)
   and Task 1 (Weeks 7-10: pie, line, table, map).
     CRM=<saved grading page.html> OUT=<dir> node tests/kinds.test.mjs
   For Task 1, make a fake page first: python3 tests/task1_page.py <any saved page> <week> <out.html>.
   The fake reply is written here from the page and the week, so no saved lesson is needed. */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const EXT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { CRM, OUT = "/tmp/dau-kinds-test" } = process.env;
if (!CRM) { console.error("set CRM"); process.exit(2); }
if (!existsSync(join(EXT, "vendor/anthropic.mjs"))) { console.error("run tools/build_extension.py first"); process.exit(2); }
mkdirSync(OUT, { recursive: true });

let failures = 0;
const ok = (cond, what) => { console.log((cond ? "ok   " : "FAIL ") + what); if (!cond) failures++; };

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png" };
async function serve(route) {
  const url = new URL(route.request().url());
  if (url.pathname === "/fixture/page.html") return route.fulfill({ contentType: "text/html", body: readFileSync(CRM) });
  const f = join(EXT, decodeURIComponent(url.pathname));
  if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
  return route.fulfill({ contentType: TYPES[extname(f)] || "application/octet-stream", body: readFileSync(f) });
}
function sse(text) {
  const ev = (type, data) => `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
  return ev("message_start", { message: { id: "msg_test", type: "message", role: "assistant", model: "claude-opus-5-5", content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 9000, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) +
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    text.match(/[\s\S]{1,4000}/g).map(t => ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: t } })).join("") +
    ev("content_block_stop", { index: 0 }) +
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 4000 } }) + ev("message_stop", {});
}

/* ---------- the fake reply, from the page and the week ---------- */
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ignoreHTTPSErrors: true, reducedMotion: "reduce" });
await ctx.route("https://dau.test/**", serve);
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
await ctx.addInitScript(() => { if (!localStorage.getItem("dau:settings")) localStorage.setItem("dau:settings", JSON.stringify({ apiKey: "sk-ant-test" })); });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
page.on("dialog", d => d.accept());

await page.goto("https://dau.test/editor.html?flow=1&html=/fixture/page.html");
await page.locator("h1").first().waitFor();
const { P, W } = await page.evaluate(async () => {
  const { extractPage } = await import("/lib/extract.js");
  const html = await (await fetch("/fixture/page.html")).text();
  const course = await (await fetch("/bundle/course.json")).json();
  const P = extractPage(html);
  const n = +/Week (\d+)/.exec(P.homework)[1];
  return { P, W: course.weeks.find(w => w.week === n) };
});
const T1 = W.task === 1, KIND = T1 ? W.kind.replace("task1-", "") : "week1";
console.log(`     ${P.homework} · ${W.kind} · ${Object.keys(P.corrections).length} corrections`);
const sents = P.essay.paragraphs.flatMap(p => p.sentences).map(s => ({ id: s.id, text: s.segs.map(g => typeof g === "string" ? g : P.corrections[g.c].orig).join("") }));
const sidWith = t => (sents.find(s => s.text.includes(t)) || {}).id;
const cids = Object.keys(P.corrections);

// her data, checked against the chart: one right, one wrong, and one marked wrong although it is right (the check must catch it)
const DATA = {
  pie: [["accounted for 21%", true, "", "Ashby", "Personal service"], ["professional work was 20%", false, "professional work was 14%", "The UK", "Professional work"], ["Only 10% were unemployed", false, "Only 9% were unemployed", "The UK", "Unemployed"]],
  line: [["a peak of $3 in 1998", true, "", "Japan", "1998"], ["at $1.5 in 2004", false, "at $1.2 in 2004", "USA", "2004"], ["from $2 in 1996", false, "from $2.5 in 1996", "Japan", "1996"]],
  table: [["from 59% to 56%", true, "", "Football", "1990"], ["falling to 25% in 2010", false, "falling to 26% in 2010", "Golf", "2010"], ["to 24% in 2010", false, "to 22% in 2010", "Rugby", "2010"]],
  map: [["outdoor seating area", true, "", "West", "Future"], ["four small offices", true, "", "South side", "Now"]],
};
const LINK_WORDS = ["Overall", "while", "slightly", "doubled", "dropped", "rose", "a peak of", "throughout", "stayed", "accounted for", "made up", "will be extended", "will become", "turned into"];
const links = LINK_WORDS.map(t => ({ text: t, sid: sidWith(t) })).filter(x => x.sid).slice(0, 4);
const mainCids = cids.slice(0, Math.min(3, cids.length)), restCids = cids.slice(mainCids.length);
const fake = {
  structure: { call_name: "Thử", framework: { intro: ["Mình xem khung bài trước nha"], reveal_intro: ["Giờ mình mở từng phần"], ok: false,
    verdict: ["Overview còn thiếu một đặc điểm chính"], focus: "overview đủ ý",
    parts: [
      { label: "Introduction · paraphrase đề", tone: "mint", sids: [sents[0].id], summary: "Em paraphrase đề ổn", short: "", ideas: [] },
      { label: "Overview · " + (KIND === "map" ? "Main changes" : "Trends / Differences"), tone: "sky", sids: P.essay.paragraphs[1].sentences.map(s => s.id), summary: "Có ý chính nhưng chưa đủ", short: "",
        ideas: P.essay.paragraphs[1].sentences.map((s, k) => ({ tag: KIND === "map" ? "Main changes" : k ? "Differences" : "Trends", sid: s.id, text: "Ý chính " + (k + 1), short: "" })) },
      { label: "Body 1", tone: "orange", sids: P.essay.paragraphs[2].sentences.map(s => s.id), summary: "Số liệu khá rõ", short: "", ideas: [] },
      { label: "Body 2", tone: "orange", sids: P.essay.paragraphs[3].sentences.map(s => s.id), summary: "Còn một số sai", short: "", ideas: [] },
    ] } },
  t1: { t1: {
    overview: { intro: ["Overview cần nêu đặc điểm chính", "Không cần số liệu"], sids: P.essay.paragraphs[1].sentences.map(s => s.id),
      features: ((W.chart || {}).main_features || ["The building is extended", "The entrance moves"]).slice(0, 3).map((f, k) => ({ type: KIND === "map" ? "change" : k % 2 ? "difference" : "trend", text: f, caught: k < 2, sid: k < 2 ? P.essay.paragraphs[1].sentences[0].id : "", note: k < 2 ? "em có nêu" : "em chưa nêu" })),
      lines: ["Em bắt được hai ý chính rồi", "Thêm ý thứ ba nữa là đủ"], model: "Overall, the most noticeable feature is the main trend, while one category changed the most." },
    data: { intro: "Giờ mình soát số liệu với biểu đồ nha", verdict: ["Số liệu phần lớn đúng", "Soát kỹ hơn trước khi nộp nha"],
      items: (DATA[KIND] || []).map(([quote, okd, fix, series, col]) => ({ sid: sidWith(quote) || sents[2].id, quote, ok: okd, fix, note: okd ? "Chỗ này em ghi đúng" : "Chỗ này lệch với biểu đồ", series, col })) } } },
  ideas: { ideas: { intro: ["Mình xem đoạn văn của em nha", "Đề nè"], prompt_focus: "",
    overview: [{ tag: "Ý 1", text: "Giá cao giúp ăn ít đồ béo", status: "improve", note: "thiếu kết quả" }, { tag: "Ý 2", text: "Thuế tăng ngân sách", status: "ok", note: "rõ ràng" }],
    details: [{ tag: "Ý 1", title: "Giá cao", sids: [sents[2] && sents[2].id].filter(Boolean), chain: ["Giá cao", "Ăn ít đồ béo"], mode: "missing_end", bad_node: -1, gap_after: -1,
      ask: { q: "Rồi sao nữa?", options: ["Khỏe hơn", "Nghèo hơn"], answer: 0, right: "Đúng rồi nè", wrong: "Chưa đúng nha" },
      fix_intro: "Mình thêm kết quả nha", fix_chain: ["Giá cao", "Ăn ít đồ béo", "Khỏe hơn"], fix_label: "", fix_en: "high price → less junk food → healthier", outro: "Vậy là đủ ý rồi" }] } },
  paraphrase: { paraphrase: { intro: ["Exercise 2 là paraphrase đề", "Không cần thesis"],
    items: sents.filter(s => /^Topic \d/.test(s.text)).map((s, k) => ({ topic: "Topic " + (k + 1), sid: s.id, qtype: k === 2 ? "two-views" : k >= 3 ? "fact" : "opinion",
      checks: [{ rule: "Giữ đúng nghĩa đề", ok: true }, { rule: "Không có thesis", ok: true }, { rule: "Thay từ đồng nghĩa", ok: k !== 1 }],
      line: k === 1 ? "Chỗ này em còn giữ nguyên từ của đề" : "Topic này em làm ổn", fix: k === 1 ? "Being overweight is becoming increasingly common." : "" })),
    outro: "Paraphrase xong rồi" } },
  reading: { prompt_check: { intro: "", items: [] },
    linking: { intro: ["Giờ mình xem cách em tả xu hướng"], count: links.length, result: ["Em dùng khá đa dạng"], groups: [{ label: "Xu hướng", items: links }], suggestions_intro: "", suggestions: [] } },
  mistakes: { mistakes: { groups: [
      { id: "g1", title: "Thì của động từ", tab: "GRA", cids: mainCids, nids: [], role: "main", count_line: `Em sai ${mainCids.length} chỗ`, ask: { q: "Chỗ này dùng thì gì?", options: ["Quá khứ", "Hiện tại"], answer: 0 },
        reason: "Năm cụ thể nên dùng quá khứ", board: ["V-ed: quá khứ"], rule: ["Có năm trong quá khứ", "Dùng V-ed"], example: { bad: "It rise in 1998.", good: "It rose in 1998." } },
      ...(restCids.length ? [{ id: "o1", title: "Lỗi khác", tab: "LR", cids: restCids, nids: [], role: "other", count_line: "", ask: { q: "", options: [], answer: 0 }, reason: "", board: [], rule: [], example: { bad: "", good: "" } }] : []),
    ], lr_intro: ["Giờ qua từ vựng nha"], gra_intro: ["Giờ qua ngữ pháp nha"], note_fixes: [] } },
  practice: { practice: { intro: ["Luyện chút nha", "Mỗi câu một lỗi"], core: ["p1", "p2", "p3"],
    choose: [{ id: "p1", mistake: "g1", q: "Chọn câu đúng", sentence: "", options: ["Prices rose in 1998.", "Prices rise in 1998."], answer: 0, explain: "Năm 1998 là quá khứ" }],
    tap: [{ id: "p2", mistake: "g1", q: "Chạm vào chữ sai", sentence: "Sales rise sharply in 2001.", wrong: "rise", fix: "rose", explain: "Quá khứ nên dùng rose" }],
    build: [{ id: "p3", mistake: "g1", vi: "Giá tăng vào năm 1998.", answer_words: ["Prices", "rose", "in 1998."], extra: ["rise"], explain: "Quá khứ của rise là rose" }] } },
  frame: { hello: ["Chào Thử nha", "Mình xem bài của em nhé"], results: { score: [], criteria: "" },
    rewrite: T1 ? { target: "overview", label: "Overview em đã viết", sids: P.essay.paragraphs[1].sentences.map(s => s.id), intro: ["Giờ em viết lại overview nha"], task: "",
        flow: "main trend → biggest difference", starters: ["Overall,"], phrases: ["by far"], checklist: ["Có xu hướng chính", "Không có số liệu"], model: "Overall, the main trend was clear." }
      : { target: "paraphrase", label: "Topic 2 em đã viết", sids: [sidWith("Topic 2")], intro: ["Giờ em paraphrase lại topic 2 nha"], task: "",
        flow: "overweight → increasingly common", starters: ["It is becoming"], phrases: ["increasingly common"], checklist: ["Không có thesis"], model: "Being overweight is becoming increasingly common." },
    praise_candidates: T1 ? [{ at: "overview", line: "Overview của em gọn ghê", evidence: "(test)" }, { at: "data", line: "Em chọn số liệu hay nè", evidence: "(test)" }]
      : [{ at: "paraphrase", line: "Paraphrase của em tự nhiên ghê", evidence: "(test)" }, { at: "idea:Ý 2", line: "Ý 2 em viết rõ ràng", evidence: "(test)" }],
    takeaway_candidates: ["Soát số liệu", "Overview không có số", "Đọc kỹ đề"],
    finish: { summary: ["Xong phần luyện tập rồi"], extra_prompt: "Luyện thêm {n} câu nha", later: ["Để lần sau cũng được"], done: ["Hẹn gặp em tuần sau"] } },
};
const FIRST = { call_name: "structure", ideas: "ideas", prompt_check: "reading", mistakes: "mistakes", practice: "practice", hello: "frame", t1: "t1", paraphrase: "paraphrase" };
const asked = [];
await ctx.route("https://api.anthropic.com/**", route => {
  const req = route.request(), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const body = JSON.parse(req.postData());
  const part = FIRST[/only: (\w+)/.exec(body.messages[0].content.at(-1).text)[1]];
  asked.push({ part, system: JSON.stringify(body.system) });
  return route.fulfill({ status: 200, headers: { ...cors, "content-type": "text/event-stream" }, body: sse(JSON.stringify(fake[part])) });
});

try {
  /* 1. page */
  ok(+(await page.locator("label:has-text('Tuần') select").inputValue()) === W.week, "week detected: " + W.week);
  ok(await page.locator(".notice.bad", { hasText: "chưa làm được" }).count() === 0, "this week is supported");
  await page.getByRole("button", { name: "Tiếp: Framework" }).click();

  /* 2. tags for this homework type */
  const tagBtns = (await page.locator(".palette button").allTextContents()).map(t => t.trim());
  const want = T1 ? ["Introduction", ...(KIND === "map" ? ["Main changes"] : KIND === "pie" ? ["Differences"] : ["Trends", "Differences"]), "Body 1", "Body 2"] : ["Topic sentence", "Ý 1", "Ý 2"];
  ok(want.every(t => tagBtns.includes(t)) && !tagBtns.includes("Câu chủ đề 1"), "tags for " + W.kind + ": " + tagBtns.join(", "));
  const chips = (await page.locator(".tagchip").allTextContents()).map(t => t.trim());
  ok(T1 ? chips.includes("Introduction") && chips.includes("Body 1") && chips.includes("Body 2") : chips.includes("Topic sentence"), "pre-tagged: " + [...new Set(chips)].join(", "));
  await page.getByRole("button", { name: "Chọn phần viết lại" }).click();
  await page.locator(".sent").nth(1).click();
  const rwOpts = await page.locator("select option").allTextContents();
  ok(T1 ? rwOpts.includes("Overview") : rwOpts.includes("Paraphrase một topic"), "rewrite targets fit the homework");
  await page.screenshot({ path: join(OUT, `${KIND}-framework.png`), fullPage: true });
  await page.getByRole("button", { name: "Tiếp: Soạn nháp" }).click();

  /* 3. draft: the parts for this type */
  await page.getByRole("button", { name: "Soạn nháp" }).click();
  await page.locator(".edit").waitFor({ timeout: 20000 });
  const parts = [...new Set(asked.map(a => a.part))].sort().join(",");
  ok(parts === (T1 ? "frame,mistakes,practice,reading,structure,t1" : "frame,ideas,mistakes,paraphrase,practice"), "parts asked: " + parts);
  ok(T1 ? /trend|comparison/i.test(asked[0].system) && asked[0].system.includes(String(Object.keys(W.chart.series || { x: 1 })[0] || "")) : /paraphrase/i.test(asked[0].system), "the course block explains this homework type");

  /* 4. edit */
  const mods = (await page.locator(".mod-btn").allTextContents()).map(t => t.replace(/\d+$/, "").trim());
  ok(T1 ? mods.includes("Overview & data") && mods.includes("Framework") && mods.includes("Linking") && !mods.includes("Phát triển ý") && !mods.includes("Paraphrase")
    : mods.includes("Paraphrase") && mods.includes("Phát triển ý") && !mods.includes("Framework") && !mods.includes("Linking") && !mods.includes("Overview & data"), "modules: " + mods.join(" · "));
  ok(!mods.includes("Kết quả"), "no scores on the page: no results module");
  const rvLabels = await page.locator(".sub.rv").allTextContents();
  ok(T1 ? rvLabels.some(t => /Overview: các đặc điểm/.test(t)) && rvLabels.some(t => /Số liệu: đúng\/sai/.test(t)) : rvLabels.filter(t => /Paraphrase · Topic/.test(t)).length === 5, "review cards for this type");
  if (T1 && KIND !== "map") {
    const flags = (await page.locator(".sub.rv").allTextContents()).join(" | ");
    ok(/Đánh dấu sai, nhưng số [\d.]+ khớp biểu đồ/.test(flags), "a right number marked wrong is caught against the chart: " + flags.slice(0, 200));
    // (the mis-marked one's "fix" is off too: that one may be flagged twice, the others not at all)
    ok(!/Đánh dấu đúng, nhưng/.test(flags) && (flags.match(/Số sửa không khớp biểu đồ/g) || []).length <= 1, "the right ones and the other fixes agree with the chart");
  }
  await page.screenshot({ path: join(OUT, `${KIND}-review.png`), fullPage: true });

  // every module renders, and the preview opens on its screen
  const PV_TITLE = { "Overview & data": "Overview", Paraphrase: "Topic 1/5", Framework: null, Linking: T1 ? "Language of" : null, "Phát triển ý": "Em phát triển ý" };
  for (const name of mods.filter(m => m !== "Cần duyệt")) {
    await page.locator(".mod-btn", { hasText: name }).first().click();
    const f = page.frameLocator("#pv");
    await f.locator("#app .content").waitFor({ state: "attached", timeout: 8000 });
    await page.waitForTimeout(400);
    if (PV_TITLE[name]) ok((await f.locator("#app .content").textContent()).includes(PV_TITLE[name]), `preview of ${name} opens on its screen`);
    await page.screenshot({ path: join(OUT, `${KIND}-mod-${name.replace(/\W+/g, "_")}.png`) });
  }
  if (T1 && KIND !== "map") {
    // fix the mis-marked item: the flag goes away
    await page.locator(".mod-btn", { hasText: "Overview & data" }).click();
    const card = page.locator(".form [data-path='t1.data.items.2.ok']");
    await card.locator("input[type=checkbox]").check();
    await page.waitForTimeout(200);
    ok(!(await page.locator(".form").textContent()).includes("Đánh dấu sai, nhưng"), "ticking it right clears the flag");
  }

  // approve everything still open, then export
  await page.locator(".mod-btn", { hasText: "Cần duyệt" }).click();
  for (let n = 0; n < 60; n++) {
    const btn = page.getByRole("button", { name: "✓ Duyệt" }).first();
    if (!(await btn.count())) break;
    await btn.click();
  }
  await page.locator(".mod-btn", { hasText: "Lời khen" }).click();
  for (const box of await page.locator(".form input[type=checkbox]").all()) if (!(await box.isChecked()) && (await page.locator(".form input[type=checkbox]:checked").count()) < 2) await box.check();
  const praiseOpts = await page.locator(".form select").first().locator("option").allTextContents();
  ok(T1 ? praiseOpts.includes("Overview") && !praiseOpts.includes("Kết quả") : praiseOpts.includes("Paraphrase") && !praiseOpts.includes("Framework"), "praise places for this type: " + praiseOpts.join(", "));
  const dp = page.getByRole("button", { name: "Duyệt lời khen" });
  if (await dp.count()) await dp.click();

  await page.getByRole("button", { name: "5 · Xuất" }).click();
  ok(await page.getByText("Bài ôn dựng được.").count() === 1, "export: no blocking problems " + (await page.locator("#main .notice").allTextContents()).join(" | ").slice(0, 300));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải file HTML" }).click()]);
  const saved = join(OUT, `${KIND}.html`);
  await dl.saveAs(saved);
  const html = readFileSync(saved, "utf8");
  ok(T1 ? html.includes('"t1"') && html.includes('"chart"') : html.includes('"paraphrase"') && html.includes(JSON.stringify(W.prompts.find(p => p.id === "ex2-1").prompt).slice(1, 40)), "the page carries the lesson for this type");
  ok(errors.length === 0, "no errors " + errors.join(" | "));
  console.log("     exported " + saved);
} finally {
  await browser.close();
}
console.log(failures ? `${failures} failed` : "all ok");
process.exit(failures ? 1 : 0);
