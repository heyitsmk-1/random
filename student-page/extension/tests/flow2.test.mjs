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
  if (part === "logic") return { logic: {
    summary: D.checklist.every(c => c.ok) ? ["Logic của em chuẩn Framework hết rồi á"] : ["Em làm đúng Framework gần hết rồi nè", "Chỉ còn một chỗ cần sửa thôi"],
    points: D.checklist.map((c, i) => ({ line: `Điểm ${i + 1} của Framework` })),
    issues: [
      ...D.checklist.filter(c => !c.ok).map(c => ({ point: c.point, title: "Số liệu chưa có năm", sids: [first.id], quote: words(first.original, 3), say: ["Chỗ này em nhớ ghi năm nha", "Số liệu luôn đi kèm năm"],
        fix: "A corrected sentence with the year.", series: payload.chart_row || "", col: payload.chart_col || "" })),
      ...(D.topics || []).filter(t => !t.ok).map(t => ({ point: -1, title: t.tag, sids: [t.sid], quote: "", say: ["Topic này em còn giữ nguyên từ của đề"], fix: "A better paraphrase.", series: "", col: "" })),
    ],
  } };
  if (part === "ideas") return { ideas: {
    intro: ["Ý có dấu ✗ em chạm vào để xem cách sửa nha"],
    names: D.ideas.map(x => ({ tag: x.tag, text: "Ý về " + words(S[x.sids[0]].original, 3) })),
    tips: D.ideas.filter(x => x.status === "improve").map(x => ({ tag: x.tag, tip: "Thêm một ví dụ cụ thể nữa nha" })),
    details: D.ideas.filter(x => x.status === "fix").map(x => ({ tag: x.tag, title: "Ý cần sửa", sids: x.sids, chain: ["Nguyên nhân", "Kết quả"], mode: "missing_end", bad_node: -1, gap_after: -1,
      ask: { q: "Rồi sao nữa nè?", options: ["Ảnh hưởng tới người đọc", "Không có gì"], answer: 0, right: "Đúng rồi nè", wrong: "Chưa đúng nha" },
      fix_intro: "Mình thêm mắt xích cuối nha", fix_chain: ["Ảnh hưởng tới xã hội"], fix_label: "", fix_en: "cause → effect → impact", outro: "Vậy là ý đủ rồi" })),
  } };
  if (part === "language") return { language: {
    intro: [D.language.systemic.length ? "Mình xem lỗi hay gặp nhất trước nha" : "Vocab và grammar của em đủ tốt rồi, chỉ có mấy chỗ nhỏ thôi nè", "Mình xem từng chỗ nha"],
    phrases: { line: "Em dùng mấy cụm này hay ghê", groups: [{ label: "Cụm hay", items: payload.sentences.slice(0, 3).map(s => ({ text: words(s.original, 2), sid: s.id })) }] },
    asks: D.language.items.filter(i => i.mode === "socratic").map(i => ({ ref: i.ref, q: "Chỗ tô vàng chưa ổn ở đâu nè em?", options: ["Sai từ", "Sai thì", "Thiếu chữ"], answer: 0 })),
  } };
  if (part === "systemic") return { systemic: D.language.systemic.map(x => ({ tab: x.tab, title: x.name, count_line: "Em mắc lỗi này {n} lần",
    ask: { q: "Mấy chỗ này có lỗi gì giống nhau?", options: ["Một", "Hai", "Ba"], answer: 0 }, reason: "Em quen tay viết vậy á", board: ["a → the"], rule: ["Quy tắc một", "Quy tắc hai", "Quy tắc ba"],
    example: { bad: "Bad one.", good: "Good one." }, better: x.refs.filter(r => r[0] === "n").map(r => ({ ref: r, text: "A better sentence." })) })) };
  if (part === "practice") return { practice: { intro: ["Luyện chút nha", "3 câu thôi á"], core: ["p1", "p2", "p3"],
    choose: [{ id: "p1", mistake: "s1", q: "Chọn câu đúng", sentence: "", options: ["The right one.", "A wrong one."], answer: 0, explain: "Câu đầu đúng" }],
    tap: [{ id: "p2", mistake: "s1", q: "Chạm vào chữ sai", sentence: "Prices rise sharply in 2001.", wrong: "rise", fix: "rose", explain: "Quá khứ" }],
    build: [{ id: "p3", mistake: "s1", vi: "Giá tăng năm 1998.", answer_words: ["Prices", "rose", "in 1998."], extra: ["rise"], explain: "Quá khứ" }] } };
  return {                                         // frame
    hello: [`Chào ${payload.call_name} nha`, "Mình xem bài của em nhé"],
    results: { score: [`Overall của em là ${payload.overall || "?"} nè`, "Lần này mình tập trung vào mấy chỗ nhỏ"], criteria: "Đây là 4 điểm thành phần nè" },
    rewrite: { target: D.rewrite.target, label: "Câu em đã viết", sids: D.rewrite.sids, intro: ["Giờ em viết lại câu này nha", "Nhớ mấy chỗ mình vừa xem"], task: "",
      flow: "idea → detail", starters: ["Notably, …"], phrases: ["by far"], checklist: ["Có năm cho số liệu"], model: "A model sentence." },
    takeaways: ["Ghi năm cho từng số liệu", "Đọc kỹ đề", "Dò lại bài trước khi nộp"],
    finish: { summary: ["Xong rồi nè", "Em làm tốt lắm á"], extra_prompt: "Em muốn luyện thêm {n} câu nữa không?", later: ["Để lần sau cũng được nha"], done: ["Hẹn gặp em tuần sau", "Cố lên nha : )"] },
  };
}
const FIELD = { logic: "logic", ideas: "ideas", language: "language", systemic: "systemic", practice: "practice", hello: "frame" };

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
  const part = FIELD[/only: (\w+)/.exec(body.messages[0].content.at(-1).text)[1]];
  const payload = JSON.parse(body.messages[0].content[0].text.replace(/^[^{]*/, ""));
  payload.chart_row = TASK1 ? TASK1.row : ""; payload.chart_col = TASK1 ? TASK1.col : "";
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
  await page.getByRole("button", { name: "Tiếp: Logic" }).click();

  /* Logic */
  const rows = page.locator(".card").first().locator(".check-row");
  const n = await rows.count();
  ok(n === W.framework.checklist.length, `the week's checklist (${n} points)`);
  for (let i = 0; i < n; i++) await rows.nth(i).locator(".tri button").first().click();      // ✓
  await rows.nth(n - 1).locator(".tri button").nth(1).click();                                // last point ✗
  await rows.nth(n - 1).locator("input").fill(W.task === 1 ? "56% là năm 2010 không phải 2000" : "Ý 2 chưa tới kết quả cuối");
  if (KIND !== "essay" && KIND !== "week1") ok(await page.locator(".card .essay").count() === 0, "Task 1: no idea tagging");
  if (KIND === "essay" || KIND === "week1") {
    const ideaRows = page.locator(".card").nth(1).locator(".check-row");
    const ni = await ideaRows.count();
    ok(ni >= 2, `ideas found from the guessed tags (${ni})`);
    await ideaRows.nth(0).locator(".tri button").nth(2).click();                              // Ý 1 ✗
    await ideaRows.nth(0).locator("input").fill("chưa nói được kết quả cuối cùng");
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
    await grammar.locator(".sys input:not([type])").fill("Chia thì của động từ");
    await grammar.locator(".sys input:not([type])").press("Tab");
    await gItems.nth(0).locator("label.inline input").check();
    await gItems.nth(1).locator("label.inline input").check();
    await gItems.nth(2).locator(".modes button", { hasText: "Socratic" }).click();
  } else {
    await grammar.locator(".sys input[type=checkbox]").check();
    await page.locator(".lang-item").first().locator(".modes button", { hasText: "Socratic" }).click();
  }
  if (ni > 1) await page.locator(".lang-item").last().locator(".modes button", { hasText: "Bỏ qua" }).click();
  await page.screenshot({ path: join(OUT, `${KIND}-language.png`), fullPage: true });
  await page.getByRole("button", { name: "Tiếp: Viết lại" }).click();

  /* Viết lại */
  await page.locator(".essay .sent").nth(2).click();
  ok(await page.locator(".essay .sent.picked").count() === 1, "pick one sentence to rewrite");
  await page.getByRole("button", { name: "Tiếp: Soạn" }).click();

  /* Soạn */
  ok(await page.locator(".blockers").count() === 0, "nothing left to decide: " + (await page.locator(".blockers").allTextContents()).join(" "));
  await page.getByRole("button", { name: "Soạn", exact: true }).click();
  await page.locator(".edit").waitFor({ timeout: 20000 });
  const parts = asked.map(a => a.part).sort().join(",");
  const want = ["frame", "language", "logic", ...(KIND === "essay" || KIND === "week1" ? ["ideas"] : []), ...(sysWanted ? ["practice", "systemic"] : [])].sort().join(",");
  ok(parts === want, `parts asked: ${parts}`);
  const D = asked[0].payload.decisions;
  ok(D.checklist.filter(c => c.ok === false).length === 1 && D.language.items.length === ni && D.rewrite.sids.length === 1, "the teacher's decisions are sent");
  ok(!asked.some(a => /praise_candidates|framework_checklist/.test(JSON.stringify(a.body))), "no old-flow parts asked");
  ok(asked.every(a => a.body.model === "claude-opus-5-5"), "model claude-opus-5-5");

  /* read-through */
  const mods = (await page.locator(".mod-btn").allTextContents()).map(t => t.replace(/\d+$/, "").trim());
  ok(mods.includes("Logic") && mods.includes("Language") && mods.includes("Viết lại") && mods.includes("Chào & kết thúc"), "modules: " + mods.join(" · "));
  ok(mods.includes("Lỗi hệ thống") === sysWanted && mods.includes("Luyện tập") === sysWanted, "systematic mistake and practice only when named");
  const flags = (await page.locator(".form .problems li").allTextContents());
  console.log("     checks: " + (flags.join(" | ") || "none"));
  for (const [name, title] of [["Logic", "Logic"], ["Language", "Language"], ["Viết lại", "Viết lại"]]) {
    await page.locator(".mod-btn", { hasText: name }).first().click();
    const f = page.frameLocator("#pv");
    await f.locator("#app .content").waitFor({ state: "attached", timeout: 8000 });
    await page.waitForTimeout(500);
    ok((await f.locator("#app").textContent()).includes(title), `preview of ${name} opens on its screen`);
    await page.screenshot({ path: join(OUT, `${KIND}-edit-${name.replace(/\W+/g, "_")}.png`) });
  }
  const tabs = await page.frameLocator("#pv").locator(".tab b").allTextContents();
  ok(tabs.join(",") === "Logic,Language", "the page has two parts: " + tabs.join(","));

  /* export */
  await page.getByRole("button", { name: "7 · Xuất" }).click();
  ok(await page.getByText("Bài ôn dựng được.").count() === 1, "export: no blocking problems " + (await page.locator("#main .notice").allTextContents()).join(" | ").slice(0, 300));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Tải file HTML" }).click()]);
  const saved = join(OUT, `${KIND}.html`);
  await dl.saveAs(saved);
  const html = readFileSync(saved, "utf8");
  ok(/"flow": ?2/.test(html) && html.includes('"logic"') && html.includes('"language"'), "the page carries a flow-2 lesson");
  ok(errors.length === 0, "no errors " + errors.join(" | "));
  console.log("     exported " + saved);
} finally {
  await browser.close();
}
console.log(failures ? `${failures} failed` : "all ok");
process.exit(failures ? 1 : 0);
