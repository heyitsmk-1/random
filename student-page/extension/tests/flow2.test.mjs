/* The editor's flow 2 (the teacher decides, Claude writes little), end to end with Claude faked:
   page -> Logic -> Language -> Viết lại -> Soạn -> read-through with the phone preview -> export.
     CRM=<saved grading page.html> OUT=<dir> node tests/flow2.test.mjs
   Works for Task 2 essays, Week 1 and Task 1 (tests/task1_page.py makes fake Task 1 pages).
   The fake reply is built from the decisions the editor sends, so it always fits the page. */
import { createRequire } from "node:module";
import { readFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright");
const EXT = join(dirname(fileURLToPath(import.meta.url)), "..");
const { CRM, OUT = "/tmp/dau-flow2-test" } = process.env;
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
      usage: { input_tokens: 5000, output_tokens: 1, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) +
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }) +
    text.match(/[\s\S]{1,4000}/g).map(t => ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: t } })).join("") +
    ev("content_block_stop", { index: 0 }) +
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 1500 } }) + ev("message_stop", {});
}

/* ---------- the fake Claude: each part, from what the editor sent ---------- */
const words = (t, n) => t.trim().split(/\s+/).slice(0, n).join(" ");
function fakePart(part, payload) {
  const D = payload.decisions, S = Object.fromEntries(payload.sentences.map(s => [s.id, s]));
  const first = Object.values(S).find(s => s.paragraph > 0) || payload.sentences[0];
  const ASK = { q: "Chữ này nghĩa là gì nè em?", options: ["Nghĩa thứ nhất", "Nghĩa thứ hai"], answer: 0, right: "Đúng rồi, chữ này hợp nghĩa hơn nè", wrong: "Chưa đúng nha, mình xem lại nghĩa của chữ này" };
  if (part === "logic") return { logic: {
    summary: D.checklist.every(c => c.status === "ok") ? ["Logic của em chuẩn Framework hết rồi á"] : ["Em làm đúng Framework gần hết rồi nè", "Chỉ còn một chỗ cần sửa thôi"],
    points: D.checklist.map((c, i) => ({ line: `Điểm ${i + 1} của Framework` })),
    issues: [
      ...D.checklist.filter(c => c.status !== "ok").map(c => ({ point: c.point, title: "Số liệu chưa có năm", sids: [first.id], quote: words(first.original, 3), part: "Body 1",
        prompt_focus: payload.prompt_words || "", rule: "Theo Framework, số liệu phải đi kèm năm", ask: { ...ASK, q: "Đề bài hỏi về cái gì nè em?" }, missing: ["Câu của em còn thiếu năm nè", "Số liệu luôn đi kèm năm"],
        fix: "A corrected sentence with the year.", changes: [{ from: words(first.original, 2), to: "A corrected sentence", why: "Mình nói rõ hơn nha" }, { from: "", to: "with the year", why: "Số liệu luôn đi kèm năm" }],
        series: payload.chart_row || "", col: payload.chart_col || "" })),
      ...(D.topics || []).filter(t => !t.ok).map(t => ({ point: -1, title: t.tag, sids: [t.sid], quote: "", part: t.tag, prompt_focus: "", rule: "", ask: { q: "", options: [], answer: 0, right: "", wrong: "" },
        missing: ["Topic này em còn giữ nguyên từ của đề"], fix: "A better paraphrase.", changes: [], series: "", col: "" })),
    ],
  } };
  if (part === "ideas") return { ideas: {
    intro: ["Ý nào cũng có hướng rồi, mình đào sâu thêm nha"],
    paras: [...new Set(payload.sentences.map(s => s.paragraph))].map(k => ({ short: `Đoạn ${k + 1} nói gì` })),
    names: D.ideas.map(x => ({ tag: x.tag, short: "Ý " + words(S[x.sids[0]].original, 2), text: "Ý về " + words(S[x.sids[0]].original, 3), problem: x.status === "fix" ? "Chưa tới kết quả cuối" : "" })),
    tips: D.ideas.filter(x => x.status === "improve").map(x => ({ tag: x.tag, tip: "Thêm một ví dụ cụ thể nữa nha" })),
    details: D.ideas.filter(x => x.status === "fix").map(x => ({ tag: x.tag, title: "Ý cần sửa", sids: x.sids, chain: ["Nguyên nhân", "Kết quả", "Hệ quả"],
      mode: { replace: "replace", link: "bad_link", missing: "missing_end" }[x.fix_type] || "missing_end", bad_node: x.fix_type === "link" ? 1 : -1, gap_after: -1,
      ask: { q: "Rồi sao nữa nè?", options: ["Ảnh hưởng tới người đọc", "Không có gì"], answer: 0, right: "Đúng rồi nè", wrong: "Chưa đúng nha" },
      fix_intro: "Mình sửa chuỗi ý nha", fix_chain: ["Chính phủ tăng thuế", "Người dân chi tiêu ít", "Kinh tế chậm lại"], fix_label: "Hướng anh Khoa gợi ý", fix_en: "tax → spending → economy", outro: "Vậy là ý đủ rồi" })),
  } };
  if (part === "language") return { language: {
    phrases: { line: "Em dùng mấy cụm này hay ghê", groups: [{ label: "Cụm hay", items: payload.sentences.slice(0, 3).map(s => ({ text: words(s.original, 2), sid: s.id })) }] },
  } };
  // each systematic mistake split in two patterns: the first correction, then the rest
  if (part === "systemic") return { systemic: D.language.systemic.map(x => ({ tab: x.tab, title: x.name, count_line: "Lỗi này em mắc tới {n} chỗ lận á",
    ask: { q: "Mấy chỗ này có điểm gì giống nhau nè?", options: ["Một", "Hai", "Ba"], answer: 0 }, reason: "Em quen tay viết vậy á",
    patterns: [{ formula: "help + O + V0", rule: "Sau help là động từ nguyên mẫu nha", refs: x.refs.slice(0, 1) }, ...(x.refs.length > 1 ? [{ formula: "should + V0", rule: "Sau should cũng vậy", refs: x.refs.slice(1) }] : [])],
    example: { bad: "Bad one.", good: "Good one." }, better: x.refs.filter(r => r[0] === "n").map(r => ({ ref: r, text: "A better sentence." })) })) };
  if (part === "practice") return { practice: { intro: ["Luyện chút nha", "3 câu thôi á"], core: ["p1", "p2", "p3"],
    choose: [{ id: "p1", mistake: "s1", q: "Chọn câu đúng", sentence: "", options: ["The right one.", "A wrong one."], answer: 0, explain: "Câu đầu đúng" }],
    tap: [{ id: "p2", mistake: D.language.systemic.length > 1 ? "s2" : "s1", q: "Chạm vào chữ sai", sentence: "Prices rise sharply in 2001.", wrong: "rise", fix: "rose", explain: "Quá khứ" }],
    build: [{ id: "p3", mistake: "s1", vi: "Giá tăng năm 1998.", answer_words: ["Prices", "rose", "in 1998."], extra: ["rise"], explain: "Quá khứ" }] } };
  return {                                         // frame
    hello: [`Chào ${payload.call_name} nha`, "Mình xem bài của em nhé"],
    results: { score: [payload.total ? `Em được ${payload.total.score}/${payload.total.max} điểm nè` : `Overall của em là ${payload.overall || "?"} nè`, "Lần này mình tập trung vào mấy chỗ nhỏ"], criteria: "Đây là 4 điểm thành phần nè" },
    ...(D.no_rewrite ? {} : { rewrite: { target: D.rewrite.target, label: "Câu em đã viết", sids: D.rewrite.sids, intro: ["Giờ em viết lại câu này nha", "Nhớ mấy chỗ mình vừa xem"], task: "",
      flow: "idea → detail", starters: ["Notably, …"], phrases: ["by far"], checklist: ["Có năm cho số liệu"], model: "A model sentence." } }),
    takeaways: ["Ghi năm cho từng số liệu", "Đọc kỹ đề", "Dò lại bài trước khi nộp"],
    finish: { summary: ["Xong rồi nè", "Em làm tốt lắm á"], extra_prompt: "Em muốn luyện thêm {n} câu nữa không?", later: ["Để lần sau cũng được nha"], done: ["Hẹn gặp em tuần sau", "Cố lên nha : )"] },
  };
}
const FIELD = { logic: "logic", ideas: "ideas", language: "language", systemic: "systemic", practice: "practice", hello: "frame", suggestions: "suggest" };
/* the suggested systematic mistakes: the first three grammar fixes, as one group */
const fakeSuggest = items => ({ LR: [], GRA: items.filter(x => x.tab === "GRA").length >= 3 ? [{ name: "Gợi ý: chia động từ", refs: items.filter(x => x.tab === "GRA").slice(0, 3).map(x => x.id) }] : [] });

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true, ignoreHTTPSErrors: true, reducedMotion: "reduce" });
await ctx.route("https://dau.test/**", serve);
await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.fulfill({ status: 200, contentType: "text/css", body: "" }));
await ctx.addInitScript(() => { if (!localStorage.getItem("dau:settings")) localStorage.setItem("dau:settings", JSON.stringify({ apiKey: "sk-ant-test" })); });
const asked = [];
await ctx.route("https://api.anthropic.com/**", route => {
  const req = route.request(), cors = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" };
  if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: cors });
  const body = JSON.parse(req.postData());
  const blocks = body.messages[0].content;
  const part = FIELD[/only: (\w+)/.exec(blocks.at(-1).text)[1]];
  if (part === "suggest") {
    const items = JSON.parse(blocks[0].text.replace(/^[^[]*/, ""));
    asked.push({ part, body, items });
    return route.fulfill({ status: 200, headers: { ...cors, "content-type": "text/event-stream" }, body: sse(JSON.stringify(fakeSuggest(items))) });
  }
  // two cached blocks: the marked essay, then the teacher's decisions
  const payload = { ...JSON.parse(blocks[0].text.replace(/^[^{]*/, "")), ...JSON.parse(blocks[1].text.replace(/^[^{]*/, "")) };
  payload.chart_row = TASK1 ? TASK1.row : ""; payload.chart_col = TASK1 ? TASK1.col : "";
  const prompt = /Prompts?:\n- [^:]+: (.+)/.exec(body.system.map(b => b.text).join("\n"));
  payload.prompt_words = prompt && !TASK1 ? prompt[1].split(/\s+/).slice(2, 5).join(" ") : "";
  asked.push({ part, body, payload });
  return route.fulfill({ status: 200, headers: { ...cors, "content-type": "text/event-stream" }, body: sse(JSON.stringify(fakePart(part, payload))) });
});
let TASK1 = null;
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) errors.push("console: " + m.text()); });
page.on("dialog", d => d.accept());

try {
  await page.goto("https://dau.test/editor.html?html=/fixture/page.html");
  await page.locator("h1").first().waitFor();
  const W = await page.evaluate(async () => {
    const course = await (await fetch("/bundle/course.json")).json();
    const n = +/\d+/.exec(document.querySelector("#who").textContent.split("·")[1] || "0")[0];
    return course.weeks.find(w => w.week === n);
  });
  const KIND = W.task === 1 ? W.kind : W.kind === "paragraph+paraphrase" ? "week1" : "essay";
  if (W.task === 1 && W.chart.series) { const [row, cells] = Object.entries(W.chart.series)[0]; TASK1 = { row, col: W.chart.years ? String(W.chart.years[0]) : Object.keys(cells)[0] }; }
  if (W.task === 1 && W.kind === "task1-pie") { const charts = Object.keys(W.chart.series); TASK1 = { row: charts[0], col: Object.keys(W.chart.series[charts[0]])[0] }; }
  console.log(`     ${W.homework} · ${KIND}`);
  ok((await page.locator(".step-btn").allTextContents()).join("|") === "1 · Bài|2 · Logic|3 · Language|4 · Viết lại|5 · Soạn|6 · Xem lại|7 · Xuất", "new steps");
  // marked out of 100 (Week 1's "Scale 100 điểm"): read from the page, shown in the Bài step
  const totBox = page.locator('input[aria-label="Tổng điểm trên 100"]');
  const totVal = await totBox.count() ? await totBox.inputValue() : "";
  if (KIND === "week1" && await totBox.count()) ok(totVal === "70", `Week 1 with no bands: the score out of 100 read from the page (${totVal})`);
  await page.getByRole("button", { name: "Tiếp: Logic" }).click();

  /* Logic */
  const rows = page.locator(".card").first().locator(".check-row");
  const n = await rows.count();
  ok(n === W.framework.checklist.length, `the week's checklist (${n} points)`);
  // the teacher's own list: drop the second point, add one
  const second = await rows.nth(1).locator(".item-text").inputValue();
  await rows.nth(1).getByRole("button", { name: "Bỏ điểm này" }).click();
  await page.getByRole("button", { name: "+ Thêm điểm" }).click();
  await rows.last().locator(".item-text").fill("Có ví dụ cụ thể cho mỗi ý");
  ok(await rows.count() === n, "a point removed and one added");
  for (let i = 0; i < n; i++) await rows.nth(i).locator(".tri button").first().click();      // ✓
  await rows.nth(n - 1).locator(".tri button").nth(2).click();                                // last point ✗
  await rows.nth(n - 1).locator("input:not(.item-text)").fill(W.task === 1 ? "56% là năm 2010 không phải 2000" : "Ý 2 chưa tới kết quả cuối");
  await rows.nth(0).locator(".tri button").nth(1).click();                                    // first point ~
  await rows.nth(0).locator("input:not(.item-text)").fill("Câu mở bài hơi dài, cắt bớt nha");
  if (KIND !== "essay" && KIND !== "week1") ok(await page.locator(".card .essay").count() === 0, "Task 1: no idea tagging");
  if (KIND === "essay" || KIND === "week1") {
    const ideaRows = page.locator(".card").nth(1).locator(".idea-row");
    const ni = await ideaRows.count();
    ok(ni >= 2, `ideas found from the guessed tags (${ni})`);
    // tagging every sentence of Ý 1 is one idea, not one per sentence
    const sents = page.locator(".card").nth(1).locator(".essay .sent");
    const tagged = await sents.evaluateAll(els => els.map(e => e.querySelector(".tagchip") ? e.querySelector(".tagchip").textContent : ""));
    const at1 = tagged.indexOf("Ý 1");
    if (at1 >= 0 && tagged[at1 + 1] === "") { await sents.nth(at1 + 1).click(); ok(await ideaRows.count() === ni, "a second sentence tagged Ý 1 stays one idea"); }
    await ideaRows.nth(0).locator(".tri button").nth(2).click();                              // Ý 1 ✗
    const blocked = await page.locator(".idea-row .fix-types").count();
    ok(blocked === 1, "a ✗ idea asks how to fix it");
    await ideaRows.nth(0).locator(".fix-types button", { hasText: "Đổi hướng" }).click();
    await ideaRows.nth(0).locator("textarea").fill("chưa nói được kết quả cuối cùng");
    await ideaRows.nth(1).locator(".tri button").nth(1).click();                              // Ý 2 ~
  }
  if (KIND === "week1") {
    const tr = page.locator(".card").nth(2).locator(".check-row");
    ok(await tr.count() === 5, "Week 1: 5 paraphrase topics");
    await tr.nth(1).locator(".tri button").nth(1).click();
    await tr.nth(1).locator("input").fill("giữ nguyên từ của đề");
  }
  await page.screenshot({ path: join(OUT, `${KIND}-logic.png`), fullPage: true });
  await page.getByRole("button", { name: "Tiếp: Language" }).click();

  /* Language */
  const items = page.locator(".lang-item");
  const ni = await items.count();
  ok(ni > 0, `every correction and note listed (${ni})`);
  const grammar = page.locator(".card").filter({ has: page.locator("h2", { hasText: "Ngữ pháp" }) });
  const vocab = page.locator(".card").filter({ has: page.locator("h2", { hasText: "Từ vựng" }) });
  await vocab.locator(".sys input[type=checkbox]").check();
  const gItems = grammar.locator(".lang-item");
  const sysWanted = await gItems.count() >= 3;
  if (sysWanted) {
    ok(asked.some(a => a.part === "suggest") && asked.find(a => a.part === "suggest").body.model === "claude-sonnet-5-5", "systematic mistakes suggested (Sonnet) when the Logic step opened");
    // Claude's suggestion: one click puts the name in and the first three grammar fixes under it
    await grammar.locator(".suggest").waitFor({ timeout: 8000 });
    await grammar.locator(".suggest").scrollIntoViewIfNeeded();
    await page.screenshot({ path: join(OUT, `${KIND}-suggest.png`) });
    await grammar.getByRole("button", { name: "Dùng gợi ý" }).click();
    ok(await grammar.locator(".sys-name input").first().inputValue() === "Gợi ý: chia động từ" && await grammar.locator(".lang-item.sys-0").count() === 3 && await grammar.locator(".suggest").count() === 0,
      "the suggestion used: name and chips in place");
    // then the teacher changes it: renames it, adds a second one, moves the third fix there
    await grammar.locator(".sys-name input").first().fill("Chia thì của động từ");
    await grammar.locator(".sys-name input").first().press("Tab");
    await grammar.getByRole("button", { name: "+ Thêm lỗi hệ thống" }).click();
    await grammar.locator(".sys-name input").nth(1).fill("Mạo từ");
    await grammar.locator(".sys-name input").nth(1).press("Tab");
    await gItems.nth(2).locator(".sys-chip.c1").click();
    ok(await grammar.locator(".lang-item.sys-0").count() === 2 && await grammar.locator(".lang-item.sys-1").count() === 1, "fixes sorted into systematic mistakes 1 and 2");
  } else await grammar.locator(".sys input[type=checkbox]").check();
  // the last item hidden, a vocabulary fix praised, another marked as an upgrade
  await page.locator(".lang-item:not(.sys-0):not(.sys-1)").last().locator(".modes button", { hasText: "Ẩn" }).click();
  const vItems = vocab.locator(".lang-item");
  const nv = await vItems.count();
  if (nv >= 2) await vItems.nth(0).locator(".modes button", { hasText: "Khen" }).click();
  for (let k = 1; k < nv; k++) { const up = vItems.nth(k).locator("label", { hasText: "Nâng cấp" }).locator("input"); if (await up.count()) { await up.check(); break; } }
  // a comment dragged onto another fix moves there (only in the lesson)
  const src = page.locator(".lang-item:not(.skipped) .drag-comment").first();
  if (await src.count()) {
    const from = await src.locator("xpath=ancestor::div[contains(@class,'lang-item')][1]").getAttribute("data-ref");
    const text = (await src.textContent()).trim();
    const dest = page.locator(`.lang-item:not([data-ref="${from}"])`).first();
    const to = await dest.getAttribute("data-ref");
    await src.dragTo(dest);
    const moved = (await page.locator(`.lang-item[data-ref="${to}"]`).textContent()).includes(text.slice(0, 20));
    ok(moved, `a comment dragged from ${from} to ${to}`);
    // dragged back, only that comment goes home (the target keeps its own)
    const own = (await page.locator(`.lang-item[data-ref="${to}"] .drag-comment`).first().textContent()).trim();
    await page.locator(`.lang-item[data-ref="${to}"] .drag-comment`, { hasText: text.slice(0, 20) }).dragTo(page.locator(`.lang-item[data-ref="${from}"]`));
    const back = (await page.locator(`.lang-item[data-ref="${from}"]`).textContent()).includes(text.slice(0, 20)) && (own === text || (await page.locator(`.lang-item[data-ref="${to}"]`).textContent()).includes(own.slice(0, 20)));
    ok(moved && back && await page.getByRole("button", { name: "Trả nhận xét như CRM" }).count() === 0, "dragged back: each comment where the CRM has it");
  }
  await page.screenshot({ path: join(OUT, `${KIND}-language.png`), fullPage: true });
  await page.getByRole("button", { name: "Tiếp: Viết lại" }).click();

  /* Viết lại: Task 1 pages try a lesson without one (the teacher didn't assign it) */
  const noRw = KIND.startsWith("task1");
  if (noRw) {
    await page.locator("label", { hasText: "Không giao viết lại" }).locator("input").check();
    ok(await page.locator(".essay .sent").count() === 0, "no rewrite: the sentence picker is gone");
  } else {
    await page.locator(".essay .sent").nth(2).click();
    ok(await page.locator(".essay .sent.picked").count() === 1, "pick one sentence to rewrite");
  }
  await page.getByRole("button", { name: "Tiếp: Soạn" }).click();

  /* Soạn: Logic (and the ideas) were drafted when the teacher left the Logic step */
  ok(asked.some(a => a.part === "logic"), "Logic drafted early, before Soạn");
  ok(await page.locator(".blockers").count() === 0, "nothing left to decide: " + (await page.locator(".blockers").allTextContents()).join(" "));
  await page.locator("#draftBtn").click();
  await page.locator(".edit").waitFor({ timeout: 20000 }).catch(async e => { console.log("     draft: " + (await page.locator("#draftStatus").textContent())); throw e; });
  const parts = asked.filter(a => a.part !== "suggest").map(a => a.part).sort().join(",");
  const want = ["frame", "language", "logic", ...(KIND === "essay" || KIND === "week1" ? ["ideas"] : []), ...(sysWanted ? ["practice", "systemic"] : [])].sort().join(",");
  ok(parts === want, `parts asked: ${parts}`);
  const D = asked.find(a => a.part === "frame").payload.decisions;
  ok(D.checklist.filter(c => c.status === "fix").length === 1 && D.checklist.filter(c => c.status === "minor").length === 1 && D.language.items.length === ni && (noRw ? D.no_rewrite && !D.rewrite : D.rewrite.sids.length === 1), "the teacher's decisions are sent");
  ok(D.checklist.some(c => c.item === "Có ví dụ cụ thể cho mỗi ý") && !D.checklist.some(c => c.item === second), "the edited checklist is sent");
  ok(!noRw || !JSON.stringify(asked.find(a => a.part === "frame").body.output_config || {}).includes("starters"), "no rewrite: Claude isn't asked for one");
  ok(D.language.items.some(i => i.mode === "hide") && (nv < 2 || D.language.items.some(i => i.mode === "praise")), "Ẩn and Khen are sent");
  ok(!sysWanted || (D.language.systemic.length === 2 && D.language.systemic[0].refs.length === 2 && D.language.systemic[1].refs.length === 1), "two systematic mistakes sent with their fixes");
  ok(!D.language.groups && D.language.items.every(i => ["systemic", "list", "praise", "hide", "teach"].includes(i.mode)), "items: systemic / list / praise / hide / teach");
  if (KIND === "essay" || KIND === "week1") ok(D.ideas[0].status === "fix" && D.ideas[0].fix_type === "replace", "the fix type is sent");
  ok(!asked.some(a => /praise_candidates|framework_checklist/.test(JSON.stringify(a.body))), "no old-flow parts asked");
  ok(asked.filter(a => a.part !== "suggest").every(a => a.body.model === "claude-opus-5-5"), "model claude-opus-5-5");
  ok(asked.filter(a => a.part !== "suggest").every(a => a.body.messages[0].content.filter(b => b.cache_control).length === 2), "essay and decisions cached as two blocks");

  /* read-through */
  const mods = (await page.locator(".mod-btn").allTextContents()).map(t => t.replace(/\d+$/, "").trim());
  ok(mods.includes("Logic") && mods.includes("Language") && mods.includes("Viết lại") === !noRw && mods.includes("Chào & kết thúc"), "modules: " + mods.join(" · "));
  ok(mods.includes("Lỗi hệ thống") === sysWanted && mods.includes("Luyện tập") === sysWanted, "systematic mistake and practice only when named");
  const flags = (await page.locator(".form .problems li").allTextContents());
  console.log("     checks: " + (flags.join(" | ") || "none"));
  for (const [name, title] of [["Logic", "Logic"], ["Language", "Language"], ...(noRw ? [] : [["Viết lại", "Viết lại"]])]) {
    await page.locator(".mod-btn", { hasText: name }).first().click();
    const f = page.frameLocator("#pv");
    await f.locator("#app .content").waitFor({ state: "attached", timeout: 8000 });
    await page.waitForTimeout(500);
    ok((await f.locator("#app").textContent()).includes(title), `preview of ${name} opens on its screen`);
    await page.screenshot({ path: join(OUT, `${KIND}-edit-${name.replace(/\W+/g, "_")}.png`) });
  }
  if (sysWanted) {
    await page.locator(".mod-btn", { hasText: "Lỗi hệ thống" }).first().click();
    const f = page.frameLocator("#pv");
    await page.waitForTimeout(2500);
    const t = await f.locator("#app").textContent();
    ok(t.includes("Lỗi lớn nhất 1") && t.includes("Lỗi lớn nhất 2") && t.includes("Mạo từ"), "the Language map lists both systematic mistakes");
    await page.screenshot({ path: join(OUT, `${KIND}-edit-map.png`) });
  }
  const tabs = await page.frameLocator("#pv").locator(".tab b").allTextContents();
  ok(tabs.join(",") === "Logic,Language", "the page has two parts: " + tabs.join(","));

  /* a decision changed after Soạn: the page follows it with no Claude call (an item hidden) */
  const before = asked.length;
  await page.getByRole("button", { name: "3 · Language" }).click();
  const listed = page.locator(".lang-item:not(.skipped):not(.sys-0):not(.sys-1)").filter({ has: page.locator('.modes button[aria-pressed="true"]', { hasText: "Danh sách" }) }).first();
  const hidRef = await listed.count() ? await listed.getAttribute("data-ref") : null;
  if (hidRef) await listed.locator(".modes button", { hasText: "Ẩn" }).click();
  // and one Claude has to write about: the second systematic mistake renamed, so only it is redrafted
  if (sysWanted) {
    await grammar.locator(".sys-name input").nth(1).fill("Mạo từ the");
    await grammar.locator(".sys-name input").nth(1).press("Tab");
    await page.getByRole("button", { name: "5 · Soạn" }).click();
    const again = page.getByRole("button", { name: /Soạn lại 2 phần/ });
    ok(await again.count() === 1, "renamed: 2 parts (Lỗi hệ thống, Luyện tập) to redraft");
    await again.click();
    await page.locator(".edit").waitFor({ timeout: 20000 });
    ok(asked.slice(before).map(a => a.part).sort().join(",") === "practice,systemic", "only those parts redrafted: " + asked.slice(before).map(a => a.part).join(","));
  } else ok(asked.length === before, "no Claude call for a change the page can follow");

  /* export */
  await page.getByRole("button", { name: "7 · Xuất" }).click();
  ok(await page.getByText("Bài ôn dựng được.").count() === 1, "export: no blocking problems " + (await page.locator("#main .notice").allTextContents()).join(" | ").slice(0, 300));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải file HTML" }).click()]);
  const saved = join(OUT, `${KIND}.html`);
  await dl.saveAs(saved);
  const html = readFileSync(saved, "utf8");
  ok(/"flow": ?2/.test(html) && html.includes('"logic"') && html.includes('"language"'), "the page carries a flow-2 lesson");
  ok(noRw ? /"rewrite": ?null/.test(html) : /"rewrite": ?\{/.test(html), noRw ? "no rewrite in the lesson" : "the rewrite is in the lesson");
  const Lx = JSON.parse(/<script type="application\/json" id="lesson-data">([\s\S]*?)<\/script>/.exec(html)[1].replace(/<\\\//g, "</"));
  ok(!hidRef || !Lx.language.list.some(x => x.ref === hidRef), `hidden after Soạn (${hidRef}): not in the list`);
  ok(!sysWanted || Lx.mistakes.main.some(m => m.title === "Mạo từ the"), "the redrafted mistake carries its new name");
  ok(totVal ? Lx.total && String(Lx.total.score) === totVal && Lx.total.max === 100 : !Lx.total, totVal ? `the lesson carries ${totVal}/100` : "no score out of 100");
  ok(errors.length === 0, "no errors " + errors.join(" | "));
  console.log("     exported " + saved);
} finally {
  if (errors.length) console.log("     errors: " + errors.join(" | "));
  await browser.close();
}
console.log(failures ? `${failures} failed` : "all ok");
process.exit(failures ? 1 : 0);
