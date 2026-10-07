/* Đậu's lesson editor.
   New lessons (flow 2): page -> Logic (the week's checklist, ideas) -> Language (the systematic mistake,
   then every correction: Dạy / Socratic / Khen / Bỏ qua) -> Viết lại (exact sentences) -> one Claude pass
   (lib/draft2.js) -> a short read-through with the phone preview -> export. The teacher decides; Claude
   only writes Đậu's words around the decisions.
   Drafts started before (and ?flow=1): page -> framework tagging -> Claude draft -> edit -> export. */
import { extractPage } from "./lib/extract.js";
import { buildPage, checkLesson } from "./lib/build.js";
import { showInPreview } from "./lib/preview.js";
import { draftLesson, draftToLesson, mergeParts, draftGroup, redraftPractice, partsFor, PARTS, MODEL } from "./lib/draft.js";
import { getSettings, setSettings, takePage, saveDraft, loadDraft, listDrafts, saveLog, studentCode } from "./lib/store.js";
import { publishPage } from "./lib/netlify.js";
import { reviewUnits, checks, checks2, lint, isVoice } from "./lib/review.js";
import { draftLesson2, toLesson2, partsFor2, PARTS2, suggestSystemic } from "./lib/draft2.js";
import { buildRecord } from "./lib/telemetry.js";

/* ---------- tiny DOM helper ---------- */
function h(tag, attrs, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
    else if (k === "html") e.innerHTML = v;
    else if (k === "value") e.value = v;
    else if (k === "checked") e.checked = !!v;
    else e.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat(Infinity)) if (k != null && k !== false) e.append(k instanceof Node ? k : String(k));
  return e;
}
const $ = s => document.querySelector(s);

/* ---------- state ---------- */
const S = {
  key: null,              // autosave key (the CRM writing id)
  step: "page",
  page: null,             // extracted page
  meta: {},               // homework, week, track, prompt, essay_type, overall, student_full, call_name
  tags: {},               // sid -> "intro" | "ts1" | "i1" | ... (the teacher's framework tagging)
  checklist: [],          // [{ item, ok: true | "minor" | false | null, note }]: ✓ / ~ (a small fix) / ✗
  notes: "",
  rewriteTarget: null,    // { target, sids } or null (Claude chooses)
  lesson: null,
  src: {},                // path -> "ai" | "teacher" | "page"
  ok: {},                 // approved paths (a path approves everything under it)
  mod: "hello",
  usage: null,
  flow: 2,                // 2 = the teacher-decides layout; undefined = a draft from before it
  d2: null,               // flow 2 decisions: { ideas, topics, lang: { LR, GRA, items } }
};
let BUNDLE = null, SETTINGS = null, COURSE = null;

const STEPS = [["page", "1 · Bài"], ["framework", "2 · Framework"], ["draft", "3 · Nháp"], ["edit", "4 · Chỉnh sửa"], ["export", "5 · Xuất"]];
const STEPS2 = [["page", "1 · Bài"], ["logic", "2 · Logic"], ["language", "3 · Language"], ["rewrite", "4 · Viết lại"], ["draft", "5 · Soạn"], ["edit", "6 · Xem lại"], ["export", "7 · Xuất"]];
const isFlow2 = () => S.flow === 2;
const curSteps = () => isFlow2() ? STEPS2 : STEPS;
/* what the teacher tags, by homework type (Task 1 keeps the English words) */
const TAGS_T2 = [["intro", "Mở bài"], ["ts1", "Câu chủ đề 1"], ["i1", "Ý 1"], ["i2", "Ý 2"], ["ts2", "Câu chủ đề 2"], ["i3", "Ý 3"], ["i4", "Ý 4"], ["concl", "Kết bài"]];
const curWeek = () => COURSE.weeks.find(x => x.week === S.meta.week) || {};
function tagsFor(w = curWeek()) {
  if (w.task === 1) {
    const k = (w.kind || "").replace("task1-", "");
    const ov = k === "map" ? [["change", "Main changes"]] : k === "pie" ? [["diff", "Differences"]] : [["trends", "Trends"], ["diff", "Differences"]];
    return [["intro", "Introduction"], ...ov, ["b1", "Body 1"], ["b2", "Body 2"]];
  }
  if (w.kind === "paragraph+paraphrase") return [["ts", "Topic sentence"], ["i1", "Ý 1"], ["i2", "Ý 2"]];
  return TAGS_T2;
}
function targetsFor(w = curWeek()) {
  if (w.task === 1) return [["idea", "Một ý / một câu"], ["overview", "Overview"], ["paragraph", "Một đoạn thân bài"]];
  if (w.kind === "paragraph+paraphrase") return [["paraphrase", "Paraphrase một topic"], ["paragraph", "Đoạn văn (Exercise 1)"]];
  return [["idea", "Một ý phát triển"], ["paragraph", "Một đoạn thân bài"], ["skeleton", "Mở bài + câu chủ đề"]];
}

/* ---------- paths ---------- */
const split = p => p === "" ? [] : p.split(".").map(x => /^\d+$/.test(x) ? +x : x);
const getP = (obj, p) => split(p).reduce((o, k) => o == null ? undefined : o[k], obj);
function setP(obj, p, v) {
  const ks = split(p); let o = obj;
  ks.slice(0, -1).forEach((k, i) => { if (o[k] == null) o[k] = typeof ks[i + 1] === "number" ? [] : {}; o = o[k]; });
  o[ks[ks.length - 1]] = v;
}
function srcOf(p) {
  for (let q = p; ; q = q.includes(".") ? q.slice(0, q.lastIndexOf(".")) : "") {
    if (S.src[q]) return S.src[q];
    if (q === "") return "teacher";
  }
}
function approved(p) {
  for (let q = p; ; q = q.includes(".") ? q.slice(0, q.lastIndexOf(".")) : "") {
    if (S.ok[q]) return true;
    if (q === "") return false;
  }
}
/* What needs the teacher (lib/review.js): Claude's text is approved by default, except the review
   units (cards that judge her work or teach content) and fields that fail an automatic check.
   Socratic questions are approved unless the teacher changes them. */
const isAsk = p => /(^|\.)ask(\.|$)/.test(p);
const aiOpen = p => srcOf(p) === "ai" && !approved(p) && !isAsk(p);
let RV = null;                                       // review units + flags, recomputed after every change
function review() {
  // flow 2: nothing to approve card by card; only what the automatic checks catch
  if (!RV && S.lesson) RV = isFlow2() ? { units: [], flags: checks2(S.lesson, { checkLesson }) }
    : { units: reviewUnits(S.lesson, { checklist: S.checklist }), flags: checks(S.lesson, { prompt: S.lesson.prompt, checkLesson }) };
  return RV || { units: [], flags: [] };
}
const under = (p, r) => !!p && (p === r || p.startsWith(r + "."));
const inUnit = p => review().units.some(u => u.roots.some(r => under(p, r)));
const pending = p => aiOpen(p) && (inUnit(p) || review().flags.some(f => !f.fixOnly && f.path === p));
function unitOpen(u) {
  return u.roots.some(r => { const v = getP(S.lesson, r); return (v !== null && typeof v === "object" ? leaves(v, r) : [r]).some(aiOpen); });
}
const flagOpen = f => f.fixOnly || aiOpen(f.path);
/** everything still waiting for the teacher: [{ kind: "unit"|"flag"|"praise", module, u?, f?, flags? }] */
function openItems() {
  if (!S.lesson) return [];
  const { units, flags } = review();
  const open = units.filter(unitOpen);
  const items = open.map(u => ({ kind: "unit", u, module: u.module, flags: flags.filter(f => flagOpen(f) && u.roots.some(r => under(f.path, r))) }));
  for (const f of flags) if (flagOpen(f) && !open.some(u => u.roots.some(r => under(f.path, r)))) items.push({ kind: "flag", f, module: f.module });
  if (S.lesson.praise_status === "draft") items.push({ kind: "praise", module: "praise" });
  return items;
}
function approveItems(items) {
  const keys = [];
  for (const x of items) {
    const ks = x.kind === "unit" ? x.u.roots : x.kind === "flag" && !x.f.fixOnly ? [x.f.path] : [];
    for (const k of ks) if (!S.ok[k]) { S.ok[k] = true; keys.push(k); }
  }
  touch(); renderEdit();
  if (keys.length) {
    logEvent("approve", { items: items.map(itemLabel) });
    showUndo("Đã duyệt: " + (items.length === 1 ? itemLabel(items[0]) : `${items.length} mục`), () => { keys.forEach(k => { delete S.ok[k]; }); logEvent("undo", { items: items.map(itemLabel) }); });
  }
}
const itemLabel = x => x.kind === "unit" ? x.u.label : x.kind === "flag" ? x.f.msg.slice(0, 60) : "Lời khen";
/* "Hoàn tác" for 10 seconds after an approval */
let undoTimer = null;
function showUndo(text, undo) {
  clearTimeout(undoTimer);
  document.querySelectorAll(".undo-bar").forEach(e => e.remove());
  const bar = h("div", { class: "undo-bar", role: "status" }, h("span", {}, text),
    h("button", { class: "btn small", type: "button", onclick: () => { undo(); bar.remove(); touch(); renderEdit(); } }, "Hoàn tác"));
  document.body.append(bar);
  undoTimer = setTimeout(() => bar.remove(), 10000);
}
/* keep approvals and sources with their items when an array is reordered: order[newIndex] = oldIndex */
function reorderKeys(path, order) {
  for (const map of [S.ok, S.src]) {
    const moved = {};
    for (const k of Object.keys(map)) {
      if (!k.startsWith(path + ".")) continue;
      const m = /^(\d+)(.*)$/.exec(k.slice(path.length + 1));
      if (!m) continue;
      const ni = order.indexOf(+m[1]);
      if (ni >= 0) moved[`${path}.${ni}${m[2]}`] = map[k];
      delete map[k];
    }
    Object.assign(map, moved);
  }
}
function leaves(obj, base, out = []) {
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") out.push(base);
  else if (Array.isArray(obj)) obj.forEach((x, i) => leaves(x, base ? `${base}.${i}` : String(i), out));
  else if (obj && typeof obj === "object") for (const [k, v] of Object.entries(obj)) if (!k.startsWith("__")) leaves(v, base ? `${base}.${k}` : k, out);
  return out;
}

/* ---------- saving ---------- */
let saveTimer = null;
async function flush() {
  clearTimeout(saveTimer); saveTimer = null;
  if (!S.key) return;
  await saveDraft(S.key, snapshot());
  $("#saved").textContent = "Đã lưu " + new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}
function touch() {
  RV = null;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(flush, 400);
}
// don't lose the last few keystrokes when the tab closes
addEventListener("pagehide", () => { if (saveTimer) flush(); });
document.addEventListener("visibilitychange", () => { if (document.hidden && saveTimer) flush(); });
const snapshot = () => ({ flow: S.flow, d2: S.d2, page: S.page, meta: S.meta, tags: S.tags, checklist: S.checklist, notes: S.notes, rewriteTarget: S.rewriteTarget, lesson: S.lesson, partial: S.partial, partSig: S.partSig, suggest: S.suggest, src: S.src, ok: S.ok, usage: S.usage, step: S.step,
  aiDraft: S.aiDraft, events: S.events, draftAt: S.draftAt });

/* ---------- the editing log (lib/telemetry.js) ---------- */
function logEvent(type, data = {}) {
  if (!S.aiDraft) return;
  (S.events = S.events || []).push({ t: Math.round((Date.now() - (S.draftAt || Date.now())) / 1000), type, ...data });
}
async function recordLesson(how) {
  if (!S.aiDraft) return;                          // only lessons Claude drafted
  try {
    const full = S.meta.student_full || S.lesson.student || "";
    const code = await studentCode(full || S.key);
    const record = buildRecord({ key: S.key, code, names: [full, S.meta.call_name, S.lesson.student], meta: S.meta, ai: S.aiDraft, final: S.lesson,
      events: S.events || [], usage: S.usage, draftAt: S.draftAt, how, page: S.page });
    await saveLog(S.key, record);
  } catch (e) { console.warn("nhật ký:", e); }  // the log must never block an export
}
function restore(snap) {
  S.flow = undefined; S.d2 = null; S.partSig = {}; S.suggest = null; Object.assign(S, snap);
  if (S.suggest && S.suggest.status === "running") S.suggest = null;   // the tab closed mid-call: ask again
}

/* ---------- boot ---------- */
async function loadBundle() {
  const get = async (f, as) => { const r = await fetch("bundle/" + f); if (!r.ok) throw new Error("thiếu bundle/" + f); return as === "text" ? r.text() : r.json(); };
  const [template, assets, quotes, course] = await Promise.all([get("template.html", "text"), get("assets.json"), get("quotes.json"), get("course.json")]);
  return { template, assets, quotes: quotes.quotes, course };
}

async function boot() {
  try { BUNDLE = await loadBundle(); } catch (e) { $("#main").replaceChildren(h("div", { class: "notice bad" }, "Extension thiếu file: " + e.message + ". Cài lại bản zip đầy đủ nha.")); return; }
  COURSE = BUNDLE.course;
  SETTINGS = await getSettings();
  const q = new URLSearchParams(location.search);
  $("#openJson").addEventListener("change", e => openLessonFile(e.target.files[0]));
  const pageId = q.get("page");
  if (pageId) {
    const got = await takePage(pageId);
    if (!got) return startScreen("Không tìm thấy bài chấm. Bấm lại nút Tạo bài ôn trên trang chấm nha.");
    return openPageHtml(got.html, got.url);
  }
  if (q.get("html")) {           // tests, or a saved page served next to the editor
    const r = await fetch(q.get("html")); return openPageHtml(await r.text(), q.get("html"));
  }
  if (q.get("lesson")) { const r = await fetch(q.get("lesson")); return openLesson(await r.json(), q.get("lesson")); }
  startScreen();
}

async function startScreen(msg) {
  S.step = "start";
  renderSteps();
  const drafts = (await listDrafts()).sort((a, b) => b.at - a.at);
  $("#main").replaceChildren(h("div", { class: "panel" },
    msg ? h("div", { class: "notice bad" }, msg) : null,
    h("div", { class: "card" },
      h("h1", {}, "Soạn bài ôn cho học viên"),
      h("p", {}, "Mở một bài chấm trên admin.ielts1984.vn rồi bấm nút cam ", h("b", {}, "Tạo bài ôn Đậu"), " ở góc dưới bên phải."),
      h("div", { class: "row" },
        h("label", { class: "btn" }, "Mở trang chấm đã lưu (.html)", h("input", { type: "file", accept: ".html,text/html", hidden: true, onchange: async e => { const f = e.target.files[0]; if (f) openPageHtml(await f.text(), f.name); } })),
        h("label", { class: "btn" }, "Mở bài ôn (.json)", h("input", { type: "file", accept: ".json", hidden: true, onchange: e => openLessonFile(e.target.files[0]) })))),
    drafts.length ? h("div", { class: "card" }, h("h2", {}, "Đang soạn dở"),
      drafts.map(d => h("div", { class: "row" },
        h("button", { class: "btn link", type: "button", onclick: () => { restore(d.lesson); S.key = d.key; go(S.step === "start" ? "page" : S.step || "page"); } },
          (d.lesson.meta && (d.lesson.meta.call_name || d.lesson.meta.student_full)) || d.key, " · ", (d.lesson.meta && d.lesson.meta.homework) || ""),
        h("span", { class: "small muted" }, new Date(d.at).toLocaleString("vi-VN"))))) : null));
}

function weekOf(homework) { const m = /Week (\d+)/i.exec(homework || ""); return m ? +m[1] : null; }
function callName(full) {
  const w = (full || "").trim().split(/\s+/).filter(Boolean);
  if (!w.length) return "";
  return w.length >= 3 && /^(Anh|Vy|Nhi|My|Linh)$/i.test(w[w.length - 1]) ? w.slice(-2).join(" ") : w[w.length - 1];
}

async function openPageHtml(html, url) {
  let page;
  try { page = extractPage(html); } catch (e) { return startScreen("Không đọc được trang chấm này: " + e.message); }
  if (!page.essay.paragraphs.length) return startScreen("Trang này chưa có bài viết đã chấm.");
  const m = /writing\/(\d+)/.exec(url || "");
  const key = m ? "w" + m[1] : "local-" + (page.student_full || "") + "-" + (page.homework || "");
  const existing = await loadDraft(key);
  if (existing && existing.lesson && existing.lesson.page && confirm("Bài này đang soạn dở. Tiếp tục bản đang soạn? (Bấm Hủy để soạn lại từ đầu)")) {
    restore(existing.lesson); S.key = key; return go(S.step || "page");
  }
  S.key = key; S.page = page; S.lesson = null; S.partial = {}; S.partSig = {}; S.suggest = null; S.src = {}; S.ok = {}; S.tags = {}; S.usage = null;
  S.flow = new URLSearchParams(location.search).get("flow") === "1" ? undefined : 2; S.d2 = null; S.rewriteTarget = null;
  const week = weekOf(page.homework);
  setWeek(week);
  S.meta.student_full = page.student_full || "";
  S.meta.call_name = callName(page.student_full);
  S.meta.overall = page.overall ? (/\./.test(page.overall) ? page.overall : page.overall + ".0") : "";
  S.meta.homework = page.homework || (week ? "Writing Week " + week : "");
  if (isFlow2()) autoTags2(); else autoTags();
  touch();
  go("page");
}

function setWeek(week) {
  const w = COURSE.weeks.find(x => x.week === week);
  S.meta.week = week;
  S.meta.track = w && w.tracks ? w.tracks[0].id : null;
  S.meta.essay_type = w ? w.essay_type : "";
  S.meta.prompt = w ? w.prompts[0].prompt : "";
  S.checklist = checklistFor(week).map(item => ({ item, ok: null, note: "" }));
}
/* the week's framework points: the teacher's own list if saved ("Lưu làm mặc định"), else the course's */
function checklistFor(week) {
  const w = COURSE.weeks.find(x => x.week === week), mine = ((SETTINGS && SETTINGS.checklists) || {})[week];
  return mine && mine.length ? [...mine] : w ? [...(w.framework.checklist || [])] : [];
}
const checkStatus = c => c.ok === true ? "ok" : c.ok === "minor" ? "minor" : c.ok === false ? "fix" : null;

/* obvious tags: first paragraph = intro, last = conclusion, first sentence of each body = topic sentence */
function autoTags() {
  const ps = S.page.essay.paragraphs, w = curWeek();
  S.tags = {};
  if (w.task === 1) {
    // Task 1: intro, then the overview paragraph (when there are 4), then the two bodies
    const ov = tagsFor(w).filter(t => !["intro", "b1", "b2"].includes(t[0])).map(t => t[0]);
    ps.forEach((p, i) => {
      if (i === 0) p.sentences.forEach(s => { S.tags[s.id] = "intro"; });
      else if (ps.length >= 4 && i === 1) p.sentences.forEach((s, k) => { S.tags[s.id] = ov[Math.min(k, ov.length - 1)]; });
      else if (i === ps.length - 2) p.sentences.forEach(s => { S.tags[s.id] = "b1"; });
      else if (i === ps.length - 1) p.sentences.forEach(s => { S.tags[s.id] = "b2"; });
    });
    return;
  }
  if (w.kind === "paragraph+paraphrase") {
    // Week 1: the first paragraph with more than one sentence is Exercise 1
    const para = ps.find(p => p.sentences.length > 1);
    if (para) S.tags[para.sentences[0].id] = "ts";
    return;
  }
  ps.forEach((p, i) => {
    if (i === 0) p.sentences.forEach(s => { S.tags[s.id] = "intro"; });
    else if (i === ps.length - 1 && ps.length > 2) p.sentences.forEach(s => { S.tags[s.id] = "concl"; });
    else if (p.sentences[0]) S.tags[p.sentences[0].id] = i === 1 ? "ts1" : "ts2";
  });
}

async function openLessonFile(f) {
  if (!f) return;
  try { openLesson(JSON.parse(await f.text()), f.name); } catch (e) { alert("File này không phải bài ôn: " + e.message); }
}
function openLesson(obj, name) {
  if (obj && obj.lesson && obj.meta) { restore(obj); S.key = S.key || "file-" + (obj.meta.call_name || name); return go("edit"); }
  // a plain lesson (e.g. built by build.py, with the page data merged in)
  if (!obj || !obj.essay) return alert("File này thiếu bài viết của học viên (essay).");
  S.page = { essay: obj.essay, corrections: obj.corrections, task_comments: obj.task_comments, scores: obj.scores, word_count: obj.word_count };
  S.lesson = obj; S.src = { "": "teacher", essay: "page", corrections: "page", task_comments: "page", scores: "page", word_count: "page" }; S.ok = {};
  S.flow = obj.flow === 2 ? 2 : undefined;
  S.meta = { homework: obj.homework, week: weekOf(obj.homework), call_name: obj.student, prompt: obj.prompt, essay_type: obj.essay_type, overall: obj.overall };
  S.key = "file-" + (obj.student || name) + "-" + (obj.homework || "");
  touch(); go("edit");
}

/* ---------- steps ---------- */
function stepAllowed(id) {
  if (!S.page) return false;
  if (id === "edit" || id === "export") return !!S.lesson;
  return true;
}
function renderSteps() {
  $("#steps").replaceChildren(...curSteps().map(([id, label]) =>
    h("button", { class: "step-btn", type: "button", "aria-current": S.step === id ? "step" : null, disabled: !stepAllowed(id), onclick: () => go(id) }, label)));
  $("#who").textContent = S.meta && S.meta.call_name ? `${S.meta.call_name} · ${S.meta.homework || ""}` : "";
}
function go(step) {
  const from = S.step;
  S.step = step;
  if (isFlow2() && S.page) {
    if (step === "logic" || step === "language") startSuggest();
    if (from === "logic" && step !== "logic") startEarly();
  }
  if (step === "edit" || step === "export" || step === "draft") syncLesson();   // decisions changed since the draft: follow them
  renderSteps(); touch();
  ({ page: renderPage, framework: renderFramework, draft: isFlow2() ? renderDraft2 : renderDraft, edit: renderEdit, export: renderExport,
    logic: renderLogic, language: renderLanguage, rewrite: renderRewrite })[step]();
  window.scrollTo(0, 0);
}

/* what a draft cost: the input split into new / read from the cache / written to the cache (they are
   billed differently), and the total in dollars ($ per million tokens: Claude Opus 5.5 by default) */
const PRICES = { "claude-opus-5-5": { in: 4, out: 20, read: 0.2, write: 5 }, "claude-sonnet-5-5": { in: 2, out: 10, read: 0.2, write: 2.5 } };
const costOf = (u, model) => { const p = PRICES[model] || PRICES["claude-opus-5-5"];
  return ((u.input_tokens || 0) * p.in + (u.cache_read_input_tokens || 0) * p.read + (u.cache_creation_input_tokens || 0) * p.write + (u.output_tokens || 0) * p.out) / 1e6; };
function usageLine(u) {
  const fresh = u.input_tokens || 0, read = u.cache_read_input_tokens || 0, write = u.cache_creation_input_tokens || 0;
  const n = x => x.toLocaleString("vi-VN");
  const others = Object.entries(u.other || {}), extra = others.reduce((t, [m, x]) => t + costOf(x, m), 0);
  const total = costOf(u, u.model) + extra;
  return `Các lần soạn bài này: ${n(fresh + read + write)} token vào (${n(fresh)} mới · ${n(read)} đọc lại từ cache · ${n(write)} lưu vào cache), ${n(u.output_tokens || 0)} token ra (${u.model || MODEL})` +
    (others.length ? ` · gợi ý lỗi hệ thống: khoảng $${extra.toFixed(3)} (${others.map(([m]) => m).join(", ")})` : "") + ` · tổng khoảng $${total.toFixed(2)}.`;
}

/* ---------- 1. the page ---------- */
function renderPage() {
  const P = S.page, w = COURSE.weeks.find(x => x.week === S.meta.week);
  const C = P.corrections;
  $("#main").replaceChildren(h("div", { class: "panel" },
    h("div", { class: "card" },
      h("h1", {}, S.meta.student_full || "Học viên"),
      h("div", { class: "grid2" },
        field("Đậu gọi em là", h("input", { value: S.meta.call_name, oninput: e => { S.meta.call_name = e.target.value; renderSteps(); touch(); } })),
        field("Tuần", h("select", { onchange: e => { setWeek(+e.target.value); go("page"); } },
          COURSE.weeks.map(x => h("option", { value: x.week, selected: x.week === S.meta.week ? true : null }, `Week ${x.week} · ${x.essay_type}`)))),
        w && w.tracks ? field("Cách lập luận", h("select", { onchange: e => { S.meta.track = e.target.value; touch(); } },
          w.tracks.map(t => h("option", { value: t.id, selected: t.id === S.meta.track ? true : null }, t.label)))) : null,
        field("Điểm", h("div", {}, Object.entries(P.scores || {}).map(([k, v]) => `${k} ${v}`).join(" · "), S.meta.overall ? ` · Overall ${S.meta.overall}` : "")),
        field("Số chữ", h("div", {}, String(P.word_count))),
        field("Chỗ sửa · nhận xét", h("div", {}, `${Object.keys(C).length} chỗ sửa · ${P.task_comments.length} nhận xét`))),
      field("Đề bài", h("textarea", { value: S.meta.prompt, oninput: e => { S.meta.prompt = e.target.value; touch(); } })),
      P.teacher_comment ? h("p", {}, h("b", {}, "Nhận xét chung: "), P.teacher_comment) : null,
      w && !w.supported ? h("div", { class: "notice bad" }, `Week ${w.week} (${w.essay_type}) chưa làm được bài ôn tự động (tuần này chưa được bật trong file khóa học).`) : null,
      !w ? h("div", { class: "notice bad" }, "Không nhận ra tuần của bài này. Chọn tuần ở trên nha.") : null,
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", disabled: !(w && w.supported), onclick: () => go(isFlow2() ? "logic" : "framework") }, isFlow2() ? "Tiếp: Logic" : "Tiếp: Framework"))),
    h("details", { class: "card essay" }, h("summary", {}, "Xem bài của em (bản sửa)"), essayView({}))));
}
const field = (label, input) => h("label", {}, label, input);

function sentText(s, mode) {
  const C = S.page.corrections;
  return s.segs.map(g => typeof g === "string" ? g : (mode === "fix" ? C[g.c].fix : C[g.c].orig)).join("");
}
function essayView({ onClick, mark }) {
  return S.page.essay.paragraphs.map(p => h("p", {}, p.sentences.map(s => {
    const tag = S.tags[s.id], t = tagsFor().find(x => x[0] === tag);
    return [h("span", { class: "sent" + (tag ? " tagged" : "") + (mark && mark(s.id) ? " picked" : ""), "data-sid": s.id, onclick: onClick ? () => onClick(s.id) : null },
      t ? h("span", { class: "tagchip" }, t[1]) : null, sentText(s, "fix")), " "];
  })));
}

/* ---------- 2. framework ---------- */
let activeTag = "i1", pickRewrite = false;
function renderFramework() {
  const w = COURSE.weeks.find(x => x.week === S.meta.week);
  if (!tagsFor(w).some(t => t[0] === activeTag)) activeTag = tagsFor(w)[1][0];
  const rt = S.rewriteTarget;
  const essay = h("div", { class: "essay" }, essayView({
    onClick: sid => {
      if (pickRewrite) {
        S.rewriteTarget = S.rewriteTarget || { target: targetsFor()[0][0], sids: [] };
        const l = S.rewriteTarget.sids;
        l.includes(sid) ? l.splice(l.indexOf(sid), 1) : l.push(sid);
      } else S.tags[sid] = S.tags[sid] === activeTag ? undefined : activeTag;
      touch(); renderFramework();
    },
    mark: sid => pickRewrite && rt && rt.sids.includes(sid),
  }));
  $("#main").replaceChildren(h("div", { class: "panel" },
    h("div", { class: "card" },
      h("h1", {}, "Framework"),
      h("p", { class: "muted" }, w && w.task === 1 ? "Chạm vào câu để gắn nhãn: Introduction, overview (Trends / Differences / Main changes) và hai đoạn Body. Đã gợi ý sẵn theo đoạn, anh sửa lại cho đúng."
        : w && w.kind === "paragraph+paraphrase" ? "Exercise 1: gắn Topic sentence và câu nêu Ý 1, Ý 2. Exercise 2 (các dòng Topic 1…5) không cần gắn."
        : "Chạm vào câu để gắn nhãn. Chỉ cần gắn câu nêu ý (Ý 1 đến Ý 4); các câu phát triển theo sau tự hiểu là của ý đó. Mở bài, câu chủ đề và kết bài đã được gợi ý sẵn."),
      h("div", { class: "palette" },
        tagsFor().map(([id, label]) => h("button", { class: "btn small", type: "button", "aria-pressed": String(!pickRewrite && activeTag === id), onclick: () => { activeTag = id; pickRewrite = false; renderFramework(); } }, label)),
        h("button", { class: "btn small", type: "button", "aria-pressed": String(pickRewrite), onclick: () => { pickRewrite = !pickRewrite; renderFramework(); } }, "Chọn phần viết lại")),
      pickRewrite ? h("div", { class: "notice" }, "Đang chọn câu cho phần viết lại. Chạm để thêm hoặc bỏ.",
        h("div", { class: "row" }, "Viết lại: ", h("select", { onchange: e => { S.rewriteTarget = { ...(S.rewriteTarget || { sids: [] }), target: e.target.value }; touch(); } },
          targetsFor().map(([v, l]) => h("option", { value: v, selected: rt && rt.target === v ? true : null }, l))),
          h("button", { class: "btn small", type: "button", onclick: () => { S.rewriteTarget = null; touch(); renderFramework(); } }, "Để Claude chọn"))) : null,
      essay),
    h("div", { class: "card" },
      h("h2", {}, `Checklist ${w ? w.essay_type : ""}`),
      h("p", { class: "muted small" }, "✓ đạt · ✗ chưa đạt · để trống nếu không chắc. Claude dựa vào đây để nhận xét phần Framework."),
      S.checklist.map((c, i) => h("div", { class: "check-row" },
        h("div", { class: "tri" }, [["yes", "✓", true], ["no", "✗", false]].map(([v, t, val]) =>
          h("button", { type: "button", "data-v": v, "aria-pressed": String(c.ok === val), "aria-label": t, onclick: () => { c.ok = c.ok === val ? null : val; touch(); renderFramework(); } }, t))),
        h("div", {}, c.item),
        h("input", { placeholder: "ghi chú", value: c.note, oninput: e => { c.note = e.target.value; touch(); } }))),
      field("Ghi chú thêm cho Claude (không bắt buộc)", h("textarea", { value: S.notes, oninput: e => { S.notes = e.target.value; touch(); } })),
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => go("draft") }, "Tiếp: Soạn nháp")))));
}

/* ---------- 3. draft with Claude ---------- */
let drafting = null;
function renderDraft() {
  const tagged = Object.values(S.tags).filter(t => t && t[0] === "i").length;
  const hasKey = !!SETTINGS.apiKey;
  const status = h("div", { id: "draftStatus" });
  $("#main").replaceChildren(h("div", { class: "panel" }, h("div", { class: "card" },
    h("h1", {}, "Soạn nháp với Claude"),
    h("p", {}, "Claude đọc bài chấm, nhận xét của anh, nhãn framework và checklist, rồi soạn toàn bộ bài ôn. Mọi dòng Claude viết đều được đánh dấu ", h("span", { class: "src ai" }, "AI"), " cho tới khi anh duyệt hoặc sửa."),
    h("ul", {},
      h("li", {}, `${Object.keys(S.page.corrections).length} chỗ sửa, ${S.page.task_comments.length} nhận xét`),
      curWeek().task === 1 || curWeek().kind === "paragraph+paraphrase" ? null : h("li", {}, `${tagged} ý đã gắn nhãn`, tagged < 4 ? h("span", { class: "warn" }, " (nên gắn đủ Ý 1 đến Ý 4)") : null),
      h("li", {}, `Checklist: ${S.checklist.filter(c => c.ok === true).length} ✓, ${S.checklist.filter(c => c.ok === false).length} ✗`),
      h("li", {}, S.rewriteTarget && S.rewriteTarget.sids.length ? `Viết lại: ${S.rewriteTarget.sids.join(", ")}` : "Viết lại: để Claude chọn")),
    h("p", { class: "small muted" }, `Model ${MODEL}, ${weekParts().length} phần soạn cùng lúc. Thường mất 1 đến 3 phút.`),
    S.partial && Object.keys(S.partial).some(p => PARTS[p]) && !drafting ? h("div", { class: "notice" }, `Lần trước đã soạn xong ${Object.keys(S.partial).filter(p => PARTS[p]).map(p => PARTS[p].label).join(", ")}.`,
      h("button", { class: "btn small", type: "button", style: "margin-left:8px", onclick: () => runDraft({ retry: true }) }, "Soạn tiếp phần còn thiếu")) : null,
    !hasKey ? h("div", { class: "notice bad" }, "Chưa có Claude API key. ", h("a", { href: "options.html", target: "_blank" }, "Mở Cài đặt"), " rồi quay lại đây.") : null,
    S.lesson ? h("div", { class: "notice" }, "Bài này đã có bản nháp. Soạn lại sẽ thay toàn bộ bản nháp (những chỗ anh đã sửa cũng mất).") : null,
    h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", disabled: !hasKey || !!drafting, onclick: () => runDraft() }, S.lesson ? "Soạn lại" : "Soạn nháp"),
      S.lesson ? h("button", { class: "btn", type: "button", onclick: () => go("edit") }, "Tới phần chỉnh sửa") : null),
    status)));
}

function draftInput() {
  return {
    page: S.page, meta: S.meta,
    tags: Object.fromEntries(Object.entries(S.tags).filter(([, v]) => v).map(([k, v]) => [k, (tagsFor().find(t => t[0] === v) || [, v])[1]])),
    checklist: S.checklist.map(c => ({ item: c.item, ok: c.ok, note: c.note })),
    notes: S.notes, rewriteTarget: S.rewriteTarget && S.rewriteTarget.sids.length ? S.rewriteTarget : null,
  };
}
// (Week 1 keeps all its prompts: the paraphrase topics need them)
const draftWeek = () => { const w = curWeek(); return w.kind === "paragraph+paraphrase" ? w : { ...w, prompts: [{ label: w.essay_type, prompt: S.meta.prompt }] }; };
const weekParts = () => partsFor(curWeek());
async function runDraft({ retry = false } = {}) {
  if (!retry) {
    if (S.lesson && !confirm("Soạn lại sẽ thay toàn bộ bản nháp. Tiếp tục?")) return;
    S.partial = {};                                  // a fresh draft: forget parts from an earlier try
  }
  const w = COURSE.weeks.find(x => x.week === S.meta.week);
  const status = $("#draftStatus");
  const todo = weekParts().filter(p => !(S.partial || {})[p]);
  const bar = h("progress", { max: String(10000 * todo.length), value: "0", style: "width:100%" });
  status.replaceChildren(h("p", {}, `Claude đang soạn ${todo.length === weekParts().length ? todo.length + " phần" : todo.map(p => PARTS[p].label).join(", ")}…`),
    bar, h("p", { class: "small muted", id: "draftChars" }, ""));
  const ctrl = new AbortController();
  drafting = ctrl; renderSteps();
  let result;
  try {
    result = await draftLesson({
      apiKey: SETTINGS.apiKey, week: { ...w, prompts: [{ label: w.essay_type, prompt: S.meta.prompt }] }, teacher: SETTINGS.teacher,
      input: draftInput(),
      onProgress: n => { bar.value = Math.min(n, +bar.max - 500); const el = $("#draftChars"); if (el) el.textContent = `${n.toLocaleString("vi-VN")} ký tự`; },
      signal: ctrl.signal, done: S.partial || {}, noStrict: SETTINGS.noStrict || [],
    });
  } catch (e) {
    result = { parts: S.partial || {}, failed: [{ label: "Bản nháp", message: e.message || String(e) }] };
  }
  drafting = null;
  S.partial = result.parts;
  if (result.noStrict && result.noStrict.join() !== (SETTINGS.noStrict || []).join()) {
    SETTINGS = { ...SETTINGS, noStrict: result.noStrict };
    setSettings({ noStrict: result.noStrict });       // next time these parts skip the strict format
  }
  if (result.usage) {
    const u = S.usage && retry ? S.usage : { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
    for (const k of Object.keys(result.usage)) u[k] = (u[k] || 0) + result.usage[k];
    S.usage = { ...u, model: result.model };
  }
  touch();
  if (result.failed.length) {
    renderSteps();
    const ok = weekParts().filter(p => S.partial[p]).map(p => PARTS[p].label);
    status.replaceChildren(h("div", { class: "notice bad" },
      h("b", {}, "Chưa soạn xong:"), h("ul", { class: "problems" }, result.failed.map(f => h("li", {}, h("b", {}, f.label + ": "), f.message))),
      ok.length ? h("p", { class: "small" }, "Đã xong: " + ok.join(", ") + ". Thử lại chỉ soạn phần còn thiếu.") : null),
      h("div", { class: "row" },
        h("button", { class: "btn primary", type: "button", onclick: () => runDraft({ retry: true }) }, "Thử lại phần lỗi"),
        h("button", { class: "btn", type: "button", onclick: () => { S.partial = {}; touch(); go("draft"); } }, "Bỏ, soạn lại từ đầu")));
    return;
  }
  try {
    const draft = mergeParts(S.partial);
    S.lesson = draftToLesson(draft, { page: S.page, meta: { ...S.meta, word_target: curWeek().task === 1 ? 150 : 250 }, teacher: SETTINGS.teacher, zalo: SETTINGS.zalo, week: draftWeek() });
  } catch (e) {
    S.partial = {};
    status.replaceChildren(h("div", { class: "notice bad" }, "Bản nháp của Claude thiếu thông tin (" + e.message + "). Soạn lại nha."),
      h("button", { class: "btn", type: "button", onclick: () => go("draft") }, "Soạn lại"));
    renderSteps(); return;
  }
  S.partial = {};
  S.src = { "": "ai", scores: "page", word_count: "page", essay: "page", corrections: "page", task_comments: "page", student: "teacher", teacher: "teacher", zalo: "teacher", homework: "page", prompt: "teacher", essay_type: "page", overall: "page", word_target: "page" };
  // a note in a group: her sentence and the teacher's comment come from the page; only the better version is Claude's
  for (const where of ["main", "others"]) S.lesson.mistakes[where].forEach((g, i) => (g.points || []).forEach((_, j) => {
    for (const f of ["sids", "quote", "comment"]) S.src[`mistakes.${where}.${i}.points.${j}.${f}`] = "page";
    if (g.points[j].fix) S.src[`mistakes.${where}.${i}.points.${j}.better`] = "page";      // the teacher's own rewrite
  }));
  S.ok = {};
  S.mod = "review";
  S.aiDraft = structuredClone(S.lesson); S.draftAt = Date.now();
  S.events = [{ t: 0, type: "checks", flags: checks(S.lesson, { prompt: S.lesson.prompt, checkLesson }).map(f => f.msg.replace(/\d+/g, "N").slice(0, 80)) }];
  touch(); go("edit");
}

/* ---------- 4. edit ---------- */
// [id, label, approve roots, preview screen (a screen name, or a section)]; a module shows only when the lesson has its part
const MODULES = [
  ["review", "Cần duyệt", [], "intro"],
  ["hello", "Chào", ["hello"], "intro"],
  ["results", "Kết quả", ["results"], "results"],
  ["framework", "Framework", ["framework"], "framework"],
  ["prompt_check", "Đọc đề", ["prompt_check"], "prompt_check"],
  ["ideas", "Phát triển ý", ["ideas"], "ideas"],
  ["t1", "Overview & data", ["t1"], "overview"],
  ["paraphrase", "Paraphrase", ["paraphrase"], "paraphrase"],
  ["linking", "Linking", ["linking"], "linking"],
  ["mistakes", "Từ vựng & ngữ pháp", ["mistakes"], "lr"],
  ["practice", "Luyện tập", ["practice"], "practice"],
  ["rewrite", "Viết lại", ["rewrite"], "rewrite"],
  ["praise", "Lời khen", ["praise"], "results"],
  ["finish", "Kết thúc", ["finish"], "end"],
];
const NEEDS = { results: "results", framework: "framework", prompt_check: "prompt_check", ideas: "ideas", t1: "t1", paraphrase: "paraphrase", linking: "linking" };
const visibleModules = () => MODULES.filter(([id]) => !NEEDS[id] || (S.lesson && S.lesson[NEEDS[id]] && (id !== "results" || Object.values(S.lesson.scores || {}).some(Boolean))));
function modPending(id) {
  const items = openItems();
  return id === "review" ? items.length : items.filter(x => x.module === id).length;
}

function renderEdit() {
  if (!curModules().some(m => m[0] === S.mod)) S.mod = "review";
  const mods = h("nav", { class: "mods" }, curModules().map(([id, label]) => {
    const n = modPending(id);
    return h("button", { class: "mod-btn", type: "button", "aria-current": String(S.mod === id), onclick: () => { S.mod = id; S.pvEssay = null; renderEdit(); } }, label, n ? h("span", { class: "count", title: "mục cần duyệt" }, n) : null);
  }));
  const form = h("div", { class: "form" }, isFlow2() ? moduleForm2(S.mod) : moduleForm(S.mod));
  const frame = h("iframe", { id: "pv", title: "Xem trước trên điện thoại" });
  const preview = h("div", { class: "preview" },
    h("div", { class: "row" }, h("b", {}, "Xem trước"), h("button", { class: "btn small", type: "button", onclick: () => refreshPreview(true) }, "Tải lại"), h("span", { class: "small muted" }, "Chạm vào khung để đi tiếp")),
    h("div", { class: "phone" }, frame));
  $("#main").replaceChildren(h("div", { class: "edit" }, mods, form, preview));
  refreshPreview(true);
}

/* the phone preview */
let pvTimer = null;
function refreshPreview(now) {
  clearTimeout(pvTimer);
  pvTimer = setTimeout(async () => {
    const f = $("#pv"); if (!f || !S.lesson) return;
    const all = isFlow2() ? MODULES2 : MODULES;
    const m = all.find(x => x[0] === S.mod) || all[0];
    let name = m[3];
    if (!isFlow2() && S.mod === "mistakes" && !S.lesson.mistakes.main.some(x => x.tab === "LR")) name = "gra";
    if (S.mod === "praise" && !Object.values(S.lesson.scores || {}).some(Boolean)) name = "end";
    const lesson = { ...structuredClone(S.lesson), __preview: true, __startName: name, ...(S.pvEssay ? { __essay: S.pvEssay } : {}) };
    try { const { html } = await buildPage(lesson, BUNDLE); await showInPreview(f, html); } catch (e) { f.srcdoc = `<p style="font:14px sans-serif;padding:16px">Chưa xem trước được: ${e.message}</p>`; }
  }, now ? 0 : 700);
}

/* one change from the teacher: it's theirs now */
function changed(path, value, { rerender, mark = true } = {}) {
  setP(S.lesson, path, value);
  if (mark) S.src[path] = "teacher";
  touch(); refreshPreview();
  if (rerender) renderEdit(); else updateCounts();
}
function updateCounts() {
  document.querySelectorAll(".mod-btn").forEach((b, i) => {
    const vis = curModules()[i];
    if (!vis) return;
    const n = modPending(vis[0]);
    const c = b.querySelector(".count");
    if (n && c) c.textContent = n; else if (n) b.append(h("span", { class: "count" }, n)); else if (c) c.remove();
  });
}

/* voice rules for Đậu's lines: lint() from lib/review.js */
const EMOTICON = /:\s?\)+|:\s?\]+|:D\b/g;
function emoticonCount() { return JSON.stringify(S.lesson).match(EMOTICON)?.length || 0; }

/* field widgets */
function srcBadge(path) {
  const s = srcOf(path);
  if (pending(path)) return h("span", { class: "src ai", title: "Claude viết, cần anh duyệt" }, "AI");
  return h("span", { class: "src " + (s === "ai" ? "done" : s), title: s === "ai" ? "Claude viết, đã duyệt" : null }, s === "page" ? "Trang" : s === "ai" ? "AI ✓" : "Thầy");
}
// what the automatic checks say about a field (voice problems are shown by the field itself)
const flagText = p => review().flags.filter(f => f.path === p && !/^Giọng Đậu/.test(f.msg)).map(f => f.msg).join(" · ");
function wrapField(path, label, input, extra) {
  const fl = flagText(path);
  return h("div", { class: "field" + (pending(path) ? " pending" : ""), "data-path": path }, h("div", { class: "lbl" }, label, srcBadge(path)), input, extra,
    fl ? h("div", { class: "lint" }, fl) : null);
}
function fLine(path, label, { voice = true, long = false, en = false } = {}) {
  const v = getP(S.lesson, path) ?? "";
  const warn = h("div", { class: "lint" }, voice ? lint(v).join(" · ") : "");
  const input = h(long ? "textarea" : "input", { value: v, lang: en ? "en" : "vi", oninput: e => {
    changed(path, e.target.value);
    if (voice) warn.textContent = lint(e.target.value).join(" · ");
    e.target.closest(".field").classList.remove("pending");
  } });
  return wrapField(path, label, input, warn);
}
function fLines(path, label, opts = {}) {
  const arr = getP(S.lesson, path) || [];
  const box = h("div", { class: "lines" }, arr.map((v, i) => {
    const p = `${path}.${i}`, warnText = t => [...(opts.voice === false ? [] : lint(t)), flagText(p)].filter(Boolean).join(" · ");
    const warn = h("div", { class: "lint" }, warnText(v));
    return h("div", {}, h("div", { class: "line" + (pending(p) ? " pending" : "") },
      h("input", { value: v, lang: opts.en ? "en" : "vi", class: pending(p) ? "pending" : null, oninput: e => { changed(p, e.target.value); warn.textContent = warnText(e.target.value); e.target.classList.remove("pending"); } }),
      h("button", { class: "btn small", type: "button", title: "Xóa dòng", onclick: () => {
        const order = arr.map((_, j) => j).filter(j => j !== i);
        arr.splice(i, 1); reorderKeys(path, order); changed(path, arr, { rerender: true, mark: false });
      } }, "×")), warn);
  }), h("button", { class: "btn small", type: "button", onclick: () => { arr.push(""); S.src[`${path}.${arr.length - 1}`] = "teacher"; changed(path, arr, { rerender: true, mark: false }); } }, "+ Thêm dòng"));
  const anyPending = arr.some((_, i) => pending(`${path}.${i}`));
  return h("div", { class: "field" + (anyPending ? " pending" : ""), "data-path": path }, h("div", { class: "lbl" }, label, srcBadge(anyPending ? `${path}.0` : path)), box);
}
/* an idea: ✓ ok, ~ could go further, ✗ needs fixing (older lessons only have ok) */
const STATUS = [["ok", "✓ Ổn"], ["improve", "~ Nâng cấp thêm"], ["fix", "✗ Cần sửa"]];
const statusOf = o => o.status || (o.ok ? "ok" : "fix");
function fStatus(p) {
  const o = getP(S.lesson, p);
  return wrapField(`${p}.status`, "Đánh giá", h("select", { onchange: e => { logEvent("idea_status", { idea: o.tag, from: statusOf(o), to: e.target.value }); o.ok = e.target.value === "ok"; changed(`${p}.status`, e.target.value, { rerender: true }); } },
    STATUS.map(([v, l]) => h("option", { value: v, selected: statusOf(o) === v ? true : null }, l))));
}
function fBool(path, label) {
  const fl = flagText(path);
  return h("div", { class: "field bool", "data-path": path },
    h("label", { class: "inline" }, h("input", { type: "checkbox", checked: !!getP(S.lesson, path), onchange: e => changed(path, e.target.checked, { rerender: true }) }), label),
    fl ? h("div", { class: "lint" }, fl) : null);
}
function fSelect(path, label, options, { number = false, rerender = false } = {}) {
  const v = getP(S.lesson, path);
  return wrapField(path, label, h("select", { onchange: e => changed(path, number ? +e.target.value : e.target.value, { rerender }) },
    options.map(([val, l]) => h("option", { value: val, selected: String(val) === String(v) ? true : null }, l))));
}
function fNumber(path, label) { return wrapField(path, label, h("input", { type: "number", value: getP(S.lesson, path) ?? 0, oninput: e => changed(path, +e.target.value) })); }
function sidOptions() { return S.page.essay.paragraphs.flatMap(p => p.sentences.map(s => [s.id, `${s.id} · ${sentText(s, "orig").slice(0, 60)}`])); }
function fSid(path, label) { return fSelect(path, label, sidOptions()); }
function fSids(path, label) {
  const cur = getP(S.lesson, path) || [];
  const box = h("div", { class: "chips" }, cur.map(sid => h("span", { class: "cchip" }, sid, " ",
    h("button", { class: "btn link small", type: "button", onclick: () => changed(path, cur.filter(x => x !== sid), { rerender: true }) }, "×"))),
    h("select", { onchange: e => { if (e.target.value) changed(path, [...cur, e.target.value], { rerender: true }); } },
      h("option", { value: "" }, "+ thêm câu"), sidOptions().filter(([id]) => !cur.includes(id)).map(([id, l]) => h("option", { value: id }, l))));
  return wrapField(path, label, box);
}
function cards(path, title, render, { add, remove = true } = {}) {
  const arr = getP(S.lesson, path) || [];
  return h("div", {}, arr.map((item, i) => h("div", { class: "sub", "data-path": `${path}.${i}` },
    h("div", { class: "head" }, h("span", { class: "grow" }, title(item, i)), approveBtn(`${path}.${i}`),
      remove ? h("button", { class: "btn small", type: "button", onclick: () => {
        if (!confirm("Xóa mục này?")) return;
        const order = arr.map((_, j) => j).filter(j => j !== i);
        arr.splice(i, 1); reorderKeys(path, order); changed(path, arr, { rerender: true, mark: false });
      } }, "Xóa") : null),
    render(`${path}.${i}`, item, i))),
    add ? h("button", { class: "btn small", type: "button", onclick: () => { arr.push(structuredClone(add())); S.src[`${path}.${arr.length - 1}`] = "teacher"; changed(path, arr, { rerender: true, mark: false }); } }, "+ Thêm") : null);
}
/* a ✓ for a card that is a review unit and still open */
function approveBtn(root) {
  const u = review().units.find(x => x.roots.length === 1 && x.roots[0] === root);
  return u && unitOpen(u) ? h("button", { class: "btn small ok-btn", type: "button", onclick: () => approveItems([{ kind: "unit", u }]) }, "✓ Duyệt") : null;
}
function approveBar() {
  const items = openItems().filter(x => x.module === S.mod);
  const can = items.filter(x => x.kind === "unit" || (x.kind === "flag" && !x.f.fixOnly));
  return h("div", { class: "row", style: "margin-bottom:10px" },
    items.length ? h("span", { class: "small" }, h("span", { class: "src ai" }, "AI"), ` ${items.length} mục cần duyệt`) : h("span", { class: "small ok" }, "Không còn gì cần duyệt"),
    can.length ? h("button", { class: "btn small", type: "button", onclick: () => approveItems(can) }, "Duyệt cả phần này") : null);
}

/* the ideas to fix: her chain, the question, the new links (shared by both lesson layouts) */
function ideaDetailCards() {
  return cards("ideas.details", d => `${d.tag} · ${d.title}`, (p, d) => {
        const mode = d.replace ? "replace" : d.gap_after != null ? "gap" : d.bad_node != null ? "bad_link" : "missing_end";
        return [
          h("div", { class: "grid2" }, fLine(`${p}.tag`, "Nhãn", { voice: false }), fLine(`${p}.title`, "Tên ý", { voice: false })),
          fSids(`${p}.sids`, "Câu"), fLines(`${p}.chain`, "Chuỗi ý của em", { voice: false }),
          wrapField(`${p}.chain`, "Kiểu sửa", h("select", { onchange: e => {
            const d2 = getP(S.lesson, p); delete d2.replace; delete d2.gap_after; d2.bad_node = null;
            if (e.target.value === "replace") d2.replace = "Chuỗi ý mới";
            if (e.target.value === "gap") d2.gap_after = 0;
            if (e.target.value === "bad_link") d2.bad_node = d2.chain.length - 1;
            changed(p, d2, { rerender: true });
          } }, [["missing_end", "Thiếu mắt xích ở cuối"], ["bad_link", "Một mắt xích sai (tô đỏ)"], ["gap", "Thiếu mắt xích ở giữa"], ["replace", "Viết gọn lại cả chuỗi"]].map(([v, l]) => h("option", { value: v, selected: v === mode ? true : null }, l)))),
          mode === "bad_link" ? fNumber(`${p}.bad_node`, "Mắt xích sai (0 là mắt xích đầu)") : null,
          mode === "gap" ? fNumber(`${p}.gap_after`, "Thiếu sau mắt xích số (0 là mắt xích đầu)") : null,
          mode === "replace" ? fLine(`${p}.replace`, "Tên chuỗi mới", { voice: false }) : null,
          fLine(`${p}.ask.q`, "Câu hỏi gợi mở"), fLines(`${p}.ask.options`, "Lựa chọn"), fNumber(`${p}.ask.answer`, "Đáp án đúng (0 là lựa chọn đầu)"),
          fLine(`${p}.ask.right`, "Khi đúng"), fLine(`${p}.ask.wrong`, "Khi sai"),
          fLine(`${p}.fix_intro`, "Trước khi sửa"), fLines(`${p}.fix_chain`, "Mắt xích mới", { voice: false }),
          fLine(`${p}.fix_label`, "Nhãn flow (mặc định Flow gợi ý)", { voice: false }),
          fLine(`${p}.fix_en`, "Flow tiếng Anh", { voice: false, en: true, long: true }), fLine(`${p}.outro`, "Kết"),
        ];
      }, { add: () => ({ tag: "Ý ?", title: "", sids: [], chain: [""], bad_node: null, ask: { q: "", options: ["", ""], answer: 0, right: "", wrong: "" }, fix_intro: "", fix_chain: [""], fix_en: "", outro: "" }) });
}
function moduleForm(id) {
  const L = S.lesson;
  const head = (title, roots, note) => [h("h2", {}, title), note ? h("p", { class: "muted small" }, note) : null, roots ? approveBar(roots) : null];
  switch (id) {
    case "review": return reviewForm();
    case "hello": return [head("Chào", ["hello"]),
      fLine("student", "Tên Đậu gọi em", { voice: false }), fLines("hello", "Đậu nói")];
    case "results": return [head("Kết quả", ["results"]),
      fLine("results.criteria", "Trước 4 tiêu chí"), fLines("results.score", "Về điểm")];
    case "framework": return [head("Framework", ["framework"], "Mỗi phần của bài: câu nào thuộc phần nào, và một câu tóm tắt."),
      fLines("framework.intro", "Mở đầu"), fLines("framework.reveal_intro", "Trước khi hiện từng phần"),
      fLine("framework.focus", "Cần chỉnh (hiện to trên màn hình, 2-6 chữ)"),
      cards("framework.parts", p => p.label, (p, part) => [
        h("div", { class: "grid2" }, fLine(`${p}.label`, "Tên phần", { voice: false }), fSelect(`${p}.tone`, "Màu", [["orange", "Cam (mở/kết)"], ["mint", "Xanh lá (Body 1)"], ["sky", "Xanh dương (Body 2)"]])),
        fSids(`${p}.sids`, "Câu"), fLine(`${p}.summary`, "Tóm tắt"), fLine(`${p}.short`, "Tóm tắt ngắn (bản đồ)", { voice: false }),
        (part.ideas || []).length ? cards(`${p}.ideas`, x => x.tag, q => h("div", { class: "grid2" },
          fLine(`${q}.tag`, "Nhãn", { voice: false }), fSid(`${q}.sid`, "Câu"), fLine(`${q}.text`, "Ý", { voice: false }), fLine(`${q}.short`, "Ngắn", { voice: false }))) : null,
      ], { remove: false }),
      fBool("framework.ok", "Khung bài đúng framework (có pháo hoa)"), fLines("framework.verdict", "Kết luận")];
    case "prompt_check": return [head("Đọc đề", ["prompt_check"], "Chỉ hiện khi em đọc sai đề hoặc chưa trả lời thẳng câu hỏi."),
      fLine("prompt_check.intro", "Câu mở"),
      cards("prompt_check.items", (x, i) => `Chỗ ${i + 1}`, (p, it) => [
        fSid(`${p}.sid`, "Câu của em"), fLine(`${p}.focus`, "Chữ tô vàng trong câu của em (chép y nguyên)", { voice: false, en: true }),
        fLine(`${p}.prompt_focus`, "Chữ tô vàng trong đề (chép y nguyên)", { voice: false, en: true }),
        it.ask ? [fLine(`${p}.ask.q`, "Câu hỏi"), fLines(`${p}.ask.options`, "Lựa chọn"), fNumber(`${p}.ask.answer`, "Đáp án đúng (0 là lựa chọn đầu)"),
          fLine(`${p}.ask.right`, "Khi đúng"), fLine(`${p}.ask.wrong`, "Khi sai")] : fLine(`${p}.line`, "Đậu giải thích"),
        fLine(`${p}.fix`, "Viết lại", { voice: false, en: true, long: true }), fLine(`${p}.fix_line`, "Sau khi viết lại"),
      ]),
      h("button", { class: "btn small", type: "button", onclick: () => { if (confirm("Bỏ phần Đọc đề?")) { delete S.lesson.prompt_check; S.mod = "ideas"; touch(); renderEdit(); } } }, "Bỏ phần này")];
    case "ideas": return [head("Phát triển ý", ["ideas"]),
      fLines("ideas.intro", "Mở đầu (dòng cuối nói sau khi ẩn đề)"), fLine("ideas.prompt_focus", "Chữ tô vàng trong đề (chép y nguyên)", { voice: false, en: true }),
      h("h3", {}, "Từng ý"),
      cards("ideas.overview", o => `${o.tag} · ${o.text}`, p => [
        h("div", { class: "grid2" }, fLine(`${p}.text`, "Ý", { voice: false }), fLine(`${p}.note`, "Ghi chú ngắn", { voice: false })),
        fStatus(p)], { remove: false }),
      h("h3", {}, "Các ý cần sửa"),
      ideaDetailCards()];
    case "t1": {
      const T = L.t1, isMap = T.kind === "map";
      const cols = isMap ? ["Now", "Future"] : T.kind === "pie" ? Object.keys(T.chart.series || {}) : (T.chart.years || []).map(String);
      const rows = isMap ? (T.chart.changes || []).map(x => x.area) : T.kind === "pie" ? [...new Set(Object.values(T.chart.series || {}).flatMap(Object.keys))] : Object.keys(T.chart.series || {});
      return [head("Overview & data", ["t1"], "Overview so với các đặc điểm chính của tuần, rồi kiểm tra số liệu với biểu đồ (số liệu lấy từ file khóa học)."),
        h("h3", {}, "Overview"),
        fLines("t1.overview.intro", "Mở đầu"), fSids("t1.overview.sids", "Câu overview của em"),
        cards("t1.overview.features", f => `${f.caught ? "✓" : "✗"} ${({ trend: "Trends", difference: "Differences", change: "Main changes" })[f.type] || f.type} · ${f.text}`, p => [
          h("div", { class: "grid2" }, fSelect(`${p}.type`, "Loại", [["trend", "Trends"], ["difference", "Differences"], ["change", "Main changes"]]), fLine(`${p}.text`, "Đặc điểm", { voice: false, en: true })),
          fBool(`${p}.caught`, "Em có nêu trong overview"), h("div", { class: "grid2" }, fSid(`${p}.sid`, "Câu"), fLine(`${p}.note`, "Ghi chú ngắn", { voice: false }))],
          { add: () => ({ type: isMap ? "change" : "trend", text: "", caught: false, sid: "", note: "" }) }),
        fLines("t1.overview.lines", "Nhận xét"), fLine("t1.overview.model", "Overview gợi ý", { voice: false, en: true, long: true }),
        h("h3", {}, isMap ? "Details" : "Số liệu"),
        fLine("t1.data.intro", "Mở đầu"),
        cards("t1.data.items", x => `${x.ok ? "✓" : "✗"} ${x.quote}`, p => [
          h("div", { class: "grid2" }, fSid(`${p}.sid`, "Câu"), fLine(`${p}.quote`, "Chữ của em (chép y nguyên)", { voice: false, en: true })),
          fBool(`${p}.ok`, "Đúng với biểu đồ"), fLine(`${p}.fix`, "Sửa thành", { voice: false, en: true, long: true }), fLine(`${p}.note`, "Đậu nói"),
          h("div", { class: "grid2" }, fSelect(`${p}.series`, isMap ? "Khu vực" : "Hàng", [["", "(không)"], ...rows.map(r => [r, r])]), fSelect(`${p}.col`, "Cột", [["", "(cả hàng)"], ...cols.map(c => [c, c])]))],
          { add: () => ({ sid: sidOptions()[0][0], quote: "", ok: false, fix: "", note: "", series: rows[0] || "", col: "" }) }),
        fLines("t1.data.verdict", "Kết luận")];
    }
    case "paraphrase": return [head("Paraphrase", ["paraphrase"], "Exercise 2: mỗi topic một màn. Đề lấy từ file khóa học."),
      fLines("paraphrase.intro", "Mở đầu"),
      cards("paraphrase.items", (x, i) => `${x.topic || "Topic " + (i + 1)} · ${(x.checks || []).every(c => c.ok) ? "✓" : "cần sửa"}`, p => [
        h("div", { class: "grid2" }, fSid(`${p}.sid`, "Câu của em"), fSelect(`${p}.qtype`, "Dạng đề", [["opinion", "Ý kiến"], ["two-views", "Hai quan điểm"], ["fact", "Sự thật / vấn đề"]])),
        fLine(`${p}.prompt`, "Đề", { voice: false, en: true, long: true }),
        cards(`${p}.checks`, c => `${c.ok ? "✓" : "✗"} ${c.rule}`, q => [fLine(`${q}.rule`, "Tiêu chí", { voice: false }), fBool(`${q}.ok`, "Đạt")], { add: () => ({ rule: "", ok: true }) }),
        fLine(`${p}.line`, "Đậu nói"), fLine(`${p}.fix`, "Viết lại (để trống nếu đã ổn)", { voice: false, en: true, long: true })], { remove: false }),
      fLine("paraphrase.outro", "Kết")];
    case "linking": return [head(L.linking.title || "Linking", ["linking"]),
      fLines("linking.intro", "Mở đầu"), fNumber("linking.count", "Số linking devices (bộ đếm)"), fLines("linking.result", "Nhận xét"),
      cards("linking.groups", g => g.label, p => [fLine(`${p}.label`, "Nhóm", { voice: false }),
        cards(`${p}.items`, x => x.text, q => h("div", { class: "grid2" }, fLine(`${q}.text`, "Cụm", { voice: false, en: true }), fSid(`${q}.sid`, "Câu")), { add: () => ({ text: "", sid: sidOptions()[0][0] }) })],
        { add: () => ({ label: "", items: [] }) }),
      fLine("linking.suggestions_intro", "Trước phần nâng cấp"),
      cards("linking.suggestions", s => `${s.from} → ${s.to}`, p => [fSid(`${p}.sid`, "Câu"),
        h("div", { class: "grid2" }, fLine(`${p}.from`, "Cũ", { voice: false, en: true }), fLine(`${p}.to`, "Mới", { voice: false, en: true })), fLine(`${p}.why`, "Vì sao")],
        { add: () => ({ sid: sidOptions()[0][0], from: "", to: "", why: "" }) })];
    case "mistakes": return mistakesForm();
    case "practice": return practiceForm();
    case "rewrite": return [head("Viết lại", ["rewrite"], "Nhiệm vụ cuối bài. Gợi ý của anh luôn được ưu tiên."),
      fSelect("rewrite.target", "Em viết lại", targetsFor()),
      fSids("rewrite.sids", "Câu em đã viết"), fLine("rewrite.label", "Nhãn (vd Ý 4 em đã viết)", { voice: false }),
      fLines("rewrite.intro", "Đậu giới thiệu"), fLine("rewrite.task", "Đậu giao việc (có thể để trống)"),
      fLine("rewrite.flow", "Gợi ý 1: mạch ý (tiếng Anh, dùng →)", { voice: false, en: true, long: true }),
      fLines("rewrite.starters", "Gợi ý 2: câu mở đầu", { voice: false, en: true }), fLines("rewrite.phrases", "Gợi ý 3: từ hay", { voice: false, en: true }),
      fLines("rewrite.checklist", "Tự check"), fLine("rewrite.model", "Bài mẫu", { voice: false, en: true, long: true })];
    case "praise": return praiseForm();
    case "finish": return [head("Kết thúc", ["finish"]),
      fLines("finish.summary", "Sau luyện tập"), takeawaysForm(), fLine("finish.extra_prompt", "Rủ luyện thêm ({n} = số câu)"),
      fLines("finish.later", "Nếu để lần sau"), fLines("finish.done", "Cuối cùng"), quoteForm(),
      h("p", { class: "small muted" }, `Biểu tượng cảm xúc trong cả bài: ${emoticonCount()} (nên tối đa 3)`)];
  }
}

/* ---------- "Cần duyệt": everything waiting for the teacher, on one page ---------- */
function goTo(module, path) {
  S.mod = module; renderEdit();
  requestAnimationFrame(() => {
    const el = path && (document.querySelector(`.form [data-path="${CSS.escape(path)}"]`) || document.querySelector(`.form [data-path^="${CSS.escape(path)}."]`));
    if (el) { el.scrollIntoView({ block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 1600); }
  });
}
const sayLine = t => h("div", { class: "say-line" }, h("span", { class: "who" }, "Đậu"), t);
const kv = (k, v) => v == null || v === "" || (Array.isArray(v) && !v.length) ? null
  : h("div", { class: "kv" }, h("span", { class: "k" }, k), h("span", {}, Array.isArray(v) && v.every(x => typeof x === "string") ? v.join(" · ") : v));
const enText = t => h("span", { lang: "en", class: "en-text" }, t);
function unitSummary(u) {
  const L = S.lesson, C = L.corrections;
  const at = p => getP(L, p);
  if (u.id === "verdict") return [
    kv("Đúng framework", L.framework.ok ? "có (có pháo hoa)" : "chưa"),
    ...L.framework.verdict.map(sayLine),
    h("div", { class: "small warn" }, "Không khớp checklist của anh: " + (S.checklist.filter(c => c.ok === false).map(c => "✗ " + c.item).join("; ") || "anh chưa đánh dấu ✗ mục nào"))];
  if (u.id === "prompt_check") return [sayLine(L.prompt_check.intro), ...L.prompt_check.items.map(it => h("div", { class: "rv-sub" },
    kv("Câu " + it.sid, it.focus), kv("Trong đề", it.prompt_focus), it.ask ? kv("Hỏi", it.ask.q) : sayLine(it.line), kv("Viết lại", enText(it.fix))))];
  if (u.id === "overview") return L.ideas.overview.map(o => h("div", { class: "rv-sub" },
    h("b", {}, ({ ok: "✓ ", improve: "~ ", fix: "✗ " })[statusOf(o)] + o.tag + " · " + o.text), h("span", { class: "muted" }, " · " + o.note), o.line ? sayLine(o.line) : null));
  const m = /^(detail|group|item)(\d+)$/.exec(u.id);
  if (m && m[1] === "detail") {
    const d = L.ideas.details[+m[2]];
    const chain = h("div", { class: "rv-chain" }, d.chain.map((n, i) => h("span", { class: "node" + (d.bad_node === i ? " bad" : "") }, n)));
    const mode = d.replace ? "viết gọn lại cả chuỗi" : d.gap_after != null ? `thiếu mắt xích sau số ${d.gap_after + 1}` : d.bad_node != null ? `mắt xích ${d.bad_node + 1} sai` : "thiếu mắt xích ở cuối";
    return [h("div", { class: "kv" }, h("span", { class: "k" }, "Chuỗi ý của em")), chain, kv("Vấn đề", mode), kv("Sửa thành", d.fix_chain), kv("Flow", enText(d.fix_en)), sayLine(d.fix_intro)];
  }
  if (m && m[1] === "group") {
    const g = L.mistakes.main[+m[2]];
    return [kv("Nhóm", `${g.title} · ${g.tab === "LR" ? "từ vựng" : "ngữ pháp"}${g === L.mistakes.main.find(x => x.tab === "GRA") ? " · dạy chính" : g.core ? " · bắt buộc" : ""}`),
      h("div", { class: "crows static" }, g.cids.map(c => corrRow(c, { drag: false })), (g.points || []).map((pt, j) => pointRow(pt, { path: `mistakes.main.${+m[2]}.points.${j}` }))),
      kv("Vì sao", g.reason), kv("Quy tắc", g.rule), kv("Bảng", g.board), kv("Ví dụ", [enText("✗ " + g.example.bad), " ", enText("✓ " + g.example.good)])];
  }
  if (m && m[1] === "item") {
    const it = L.practice.items[+m[2]];
    const group = L.mistakes.main.find(x => x.id === it.mistake);
    const base = [kv("Lỗi", group ? group.title : it.mistake)];
    if (it.type === "choose") return [...base, kv("Hỏi", it.q), it.sentence ? kv("Câu", enText(it.sentence)) : null,
      h("ol", { class: "rv-opts" }, it.options.map((o, i) => h("li", { class: i === it.answer ? "right" : null, lang: "en" }, o, i === it.answer ? "  ✓" : ""))), kv("Giải thích", it.explain)];
    if (it.type === "tap") return [...base, kv("Câu", enText(it.sentence)), kv("Chữ sai → đúng", enText(`${it.wrong} → ${it.fix}`)), kv("Giải thích", it.explain)];
    return [...base, kv("Tiếng Việt", it.vi), kv("Đáp án", enText(it.answer.join(" "))), kv("Cụm nhiễu", it.extra), kv("Giải thích", it.explain)];
  }
  if (u.id === "t1overview") return [kv("Câu overview", L.t1.overview.sids),
    ...L.t1.overview.features.map(f => h("div", { class: "rv-sub" }, h("b", {}, (f.caught ? "✓ " : "✗ ") + ({ trend: "Trends", difference: "Differences", change: "Main changes" })[f.type] + " · "), enText(f.text), f.note ? h("span", { class: "muted" }, " · " + f.note) : null)),
    ...L.t1.overview.lines.map(sayLine), kv("Overview gợi ý", enText(L.t1.overview.model))];
  if (u.id === "t1data") return [...L.t1.data.items.map(x => h("div", { class: "rv-sub" }, h("b", {}, (x.ok ? "✓ " : "✗ ") + x.sid + " · "), enText(x.quote),
    x.fix ? [" → ", enText(x.fix)] : null, x.series ? h("span", { class: "muted" }, ` · ${x.series}${x.col ? " / " + x.col : ""}`) : null, x.note ? sayLine(x.note) : null)), ...L.t1.data.verdict.map(sayLine)];
  const pm = /^para(\d+)$/.exec(u.id);
  if (pm) { const x = L.paraphrase.items[+pm[1]]; return [kv("Câu " + x.sid, x.topic), ...x.checks.map(c => h("div", { class: "rv-sub" }, (c.ok ? "✓ " : "✗ ") + c.rule)), sayLine(x.line), kv("Viết lại", x.fix ? enText(x.fix) : "")]; }
  if (u.id === "linking") return L.linking.suggestions.map(x => h("div", { class: "rv-sub" }, kv(x.sid, enText(`${x.from} → ${x.to}`)), x.why ? sayLine(x.why) : null));
  if (u.id === "rewrite") return [kv("Mạch ý", enText(at("rewrite.flow"))), kv("Câu mở đầu", at("rewrite.starters")), kv("Từ hay", at("rewrite.phrases")), kv("Bài mẫu", enText(at("rewrite.model")))];
  return [];
}
/* optional one-click reasons, for the editing log */
const REASONS = ["sai ý thầy", "sai kiến thức", "giọng Đậu", "dài quá", "khác"];
function reasonChips(label) {
  const picked = new Set((S.events || []).filter(e => e.type === "reason" && e.item === label).map(e => e.reason));
  return h("div", { class: "reasons" }, h("span", { class: "small muted" }, "Lý do sửa (không bắt buộc):"),
    REASONS.map(r => h("button", { class: "reason" + (picked.has(r) ? " on" : ""), type: "button", "aria-pressed": String(picked.has(r)),
      onclick: e => { if (picked.has(r)) return; logEvent("reason", { item: label, reason: r }); e.currentTarget.classList.add("on"); e.currentTarget.setAttribute("aria-pressed", "true"); touch(); } }, r)));
}
function reviewForm() {
  const items = openItems();
  const order = MODULES.map(m => m[0]);
  items.sort((a, b) => order.indexOf(a.module) - order.indexOf(b.module));
  const card = x => {
    if (x.kind === "praise") return h("div", { class: "sub rv" },
      h("div", { class: "head" }, h("span", { class: "grow" }, "Lời khen"), h("button", { class: "btn small", type: "button", onclick: () => goTo("praise") }, "Chọn")),
      h("div", { class: "small" }, `Chọn 2–3 lời khen rồi bấm "Duyệt lời khen" (đang chọn ${S.lesson.praise.length}).`));
    if (x.kind === "flag") return h("div", { class: "sub rv flag" },
      h("div", { class: "head" }, h("span", { class: "grow" }, x.f.fixOnly ? "Cần sửa" : "Cần xem lại"),
        !x.f.fixOnly ? h("button", { class: "btn small ok-btn", type: "button", onclick: () => approveItems([x]) }, "✓ Giữ nguyên") : null,
        h("button", { class: "btn small", type: "button", onclick: () => goTo(x.module, x.f.path) }, "Sửa")),
      h("div", { class: "lint" }, x.f.msg),
      x.f.path && typeof getP(S.lesson, x.f.path) === "string" ? h("div", { class: "rv-quote" }, getP(S.lesson, x.f.path)) : null);
    return h("div", { class: "sub rv" },
      h("div", { class: "head" }, h("span", { class: "grow" }, x.u.label),
        h("button", { class: "btn small ok-btn", type: "button", onclick: () => approveItems([x]) }, "✓ Duyệt"),
        h("button", { class: "btn small", type: "button", onclick: () => goTo(x.module, x.u.roots[0]) }, "Sửa")),
      x.flags.map(f => h("div", { class: "lint" }, f.msg)),
      reasonChips(x.u.label),
      unitSummary(x.u));
  };
  return [h("h2", {}, "Cần duyệt"),
    h("p", { class: "muted small" }, "Chỉ những chỗ Claude nhận xét bài của em hoặc dạy kiến thức mới (một dấu ✓ cho mỗi thẻ), và những dòng không qua được kiểm tra tự động. Phần còn lại đã tự duyệt, anh vẫn sửa được trong từng mục bên trái."),
    items.length ? h("p", { class: "small" }, `${items.length} mục`) : h("div", { class: "notice good" }, "Xong, không còn gì cần duyệt. Qua bước 5 · Xuất nha."),
    items.map(card), approvedList()];
}
/* everything approved by a ✓ (not by editing), each with "Bỏ duyệt" */
function approvedList() {
  const { units, flags } = review();
  const rows = [
    ...units.filter(u => u.roots.some(r => S.ok[r]) && !unitOpen(u)).map(u => [u.label, () => u.roots.forEach(r => { delete S.ok[r]; })]),
    ...flags.filter(f => !f.fixOnly && S.ok[f.path]).map(f => ["Giữ nguyên: " + f.msg.slice(0, 70), () => { delete S.ok[f.path]; }]),
    ...(S.lesson.praise_status === "ok" ? [["Lời khen", () => { S.lesson.praise_status = "draft"; }]] : []),
  ];
  if (!rows.length) return null;
  return h("details", { class: "approved" }, h("summary", {}, `Đã duyệt (${rows.length})`),
    rows.map(([label, undo]) => h("div", { class: "row approved-row" }, h("span", { class: "grow" }, label),
      h("button", { class: "btn small", type: "button", onclick: () => { undo(); logEvent("unapprove", { item: label }); touch(); renderEdit(); } }, "Bỏ duyệt"))));
}

/* mistakes: groups the teacher can rename, re-tag, and drag corrections between */
function mistakeGroups() {
  const M = S.lesson.mistakes, roles = S.lesson.__mistake_roles || {};
  let firstGra = true;
  return [
    ...M.main.map((m, i) => ({ where: "main", i, m, role: roles[m.id] || (m.tab === "GRA" ? (firstGra ? (firstGra = false, "main") : "optional") : m.core ? "core" : "optional") })),
    ...M.others.map((o, i) => ({ where: "others", i, m: o, role: "other" })),
  ];
}
function setRole(g, role) {
  logEvent("group_role", { group: g.where === "main" ? g.m.title : g.m.label, from: g.role, to: role });
  const M = S.lesson.mistakes;
  S.lesson.__mistake_roles = S.lesson.__mistake_roles || {};
  if (g.where === "others" && role !== "other") {
    reorderKeys("mistakes.others", M.others.map((_, j) => j).filter(j => j !== g.i));
    const o = M.others.splice(g.i, 1)[0];
    const id = "g" + Date.now().toString(36);
    const n = o.cids.length + (o.points || []).length;
    const m = { id, title: o.label, tag: o.tag === "LR" ? "Vocab" : "Grammar", tab: o.tag, cids: o.cids, points: o.points || [], count_line: `Em mắc lỗi này ${n} lần`,
      ask: { q: `${n} chỗ này có lỗi gì giống nhau?`, options: [o.label, "", ""], answer: 0 }, reason: "", board: [], rule: ["", "", ""], example: { bad: "", good: "" } };
    M.main.push(m); S.lesson.__mistake_roles[id] = role; S.src[`mistakes.main.${M.main.length - 1}`] = "teacher";
  } else if (g.where === "main" && role === "other") {
    reorderKeys("mistakes.main", M.main.map((_, j) => j).filter(j => j !== g.i));
    const m = M.main.splice(g.i, 1)[0];
    M.others.push({ label: m.title, cids: m.cids, points: m.points || [], tag: m.tab });
  } else if (g.where === "main") {
    S.lesson.__mistake_roles[g.m.id] = role;
    if (role === "core") g.m.core = true; else delete g.m.core;
    if (role === "main") {                         // only one main: the others become optional, main goes first
      for (const x of M.main) if (x !== g.m && S.lesson.__mistake_roles[x.id] === "main") S.lesson.__mistake_roles[x.id] = "optional";
      reorderKeys("mistakes.main", [g.i, ...M.main.map((_, j) => j).filter(j => j !== g.i)]);
      M.main.splice(g.i, 1); M.main.unshift(g.m);
      if (g.m.tab !== "GRA") g.m.tab = "GRA";
    }
  }
  touch(); refreshPreview(); renderEdit();
}
/* one correction as a row: her words around it, the change, the teacher's comment; click = see it in the essay */
function corrSnippet(cid) {
  const D = S.lesson || S.page, C = D.corrections;
  for (const p of D.essay.paragraphs) for (const s of p.sentences) {
    const k = s.segs.findIndex(g => typeof g !== "string" && g.c === cid);
    if (k < 0) continue;
    const txt = gs => gs.map(g => typeof g === "string" ? g : C[g.c].orig).join("");
    const pre = txt(s.segs.slice(0, k)), post = txt(s.segs.slice(k + 1));
    const pw = pre.trimEnd().split(/\s+/).filter(Boolean), qw = post.trimStart().split(/\s+/).filter(Boolean);
    return { sid: s.id,
      pre: (pw.length > 7 ? "… " : "") + pw.slice(-7).join(" ") + (/\s$/.test(pre) || /^\s/.test(C[cid].orig) ? " " : ""),
      post: (/^\s/.test(post) || /\s$/.test(C[cid].orig) ? " " : "") + qw.slice(0, 7).join(" ") + (qw.length > 7 ? " …" : "") };
  }
  return { sid: null, pre: "", post: "" };
}
function previewEssay(sid, cids) { if (!sid || !S.lesson) return; S.pvEssay = { sid, cids: cids || null }; refreshPreview(true); }
function corrRow(cid, { drag = true, comment = null } = {}) {
  const c0 = (S.lesson || S.page).corrections[cid] || { orig: "", fix: "", comment: "" }, sn = corrSnippet(cid);
  const c = comment == null ? c0 : { ...c0, comment };
  // a change inside a word ("bring|ing", "children|'s"): show the whole word, before and after
  const wl = /[\p{L}\p{N}'’-]+$/u.exec(sn.pre), wr = /^[\p{L}\p{N}'’-]+/u.exec(sn.post);
  const L0 = wl ? wl[0] : "", R0 = wr ? wr[0] : "";
  const o = (L0 || R0) ? L0 + c.orig.trim() + R0 : c.orig.trim(), x = (L0 || R0) ? L0 + c.fix.trim() + R0 : c.fix.trim();
  return h("div", { class: "crow", draggable: drag ? "true" : null, "data-item": "c:" + cid, title: "Bấm để xem câu này trong bài",
    ondragstart: drag ? e => e.dataTransfer.setData("text/plain", "c:" + cid) : null, onclick: () => previewEssay(sn.sid, [cid]) },
    h("div", { class: "crow-text", lang: "en" }, sn.pre.slice(0, sn.pre.length - L0.length), o ? h("s", {}, o) : null, o && x ? " " : null,
      x ? h("ins", {}, x) : h("ins", { class: "none" }, "(bỏ)"), sn.post.slice(R0.length)),
    h("div", { class: "crow-comment" + (c.comment ? "" : " none") }, c.comment || "(không có ghi chú)"));
}
/* a highlighted note (or a sentence the teacher added) as a row: her sentence(s), the comment, the better version */
function pointRow(pt, { path, drag = null, remove = null, editable = false }) {
  const text = pt.sids.map(sid => { const s = (S.lesson || S.page).essay.paragraphs.flatMap(p => p.sentences).find(x => x.id === sid); return s ? sentText(s, "orig") : ""; }).join(" ");
  const k = pt.quote ? text.indexOf(pt.quote.trim()) : -1;
  const shown = k >= 0 ? [text.slice(0, k), h("mark", {}, pt.quote.trim()), text.slice(k + pt.quote.trim().length)] : [text];
  return h("div", { class: "crow point", draggable: drag ? "true" : null, "data-item": drag || null, "data-path": path,
    ondragstart: drag ? e => e.dataTransfer.setData("text/plain", drag) : null },
    h("div", { class: "row" }, h("span", { class: "tagchip note" }, pt.nid ? "Ghi chú" : "Câu thêm"), h("span", { class: "grow" }),
      h("button", { class: "btn link small", type: "button", onclick: () => previewEssay(pt.sids[0]) }, "Xem trong bài"),
      remove ? h("button", { class: "btn link small", type: "button", onclick: remove }, "×") : null),
    h("div", { class: "crow-text", lang: "en" }, shown),
    editable ? fLine(`${path}.comment`, "Ghi chú của thầy", { voice: false }) : pt.comment ? h("div", { class: "crow-comment" }, pt.comment) : null,
    editable ? fLine(`${path}.better`, "Viết lại (câu tốt hơn)", { voice: false, en: true, long: true }) : pt.better ? h("div", { class: "crow-better", lang: "en" }, "→ " + pt.better) : null);
}

/* "Em mắc lỗi này N lần" follows the group's rows */
function syncCount(g) {
  if (g.where !== "main" || !g.m.count_line) return;
  const n = g.m.cids.length + (g.m.points || []).length;
  g.m.count_line = g.m.count_line.replace(/\d+ lần/, `${n} lần`);
}
function mistakesForm() {
  const groups = mistakeGroups();
  const P = (g, f) => `mistakes.${g.where}.${g.i}.${f}`;
  const mainId = (groups.find(g => g.role === "main") || {}).m;
  // drop a correction or a note into another group
  const dropInto = g => ({
    ondragover: e => { e.preventDefault(); e.currentTarget.classList.add("over"); },
    ondragleave: e => e.currentTarget.classList.remove("over"),
    ondrop: e => {
      e.preventDefault();
      const item = e.dataTransfer.getData("text/plain");
      logEvent("drag", { item, to: g.where === "main" ? g.m.title : g.m.label });
      if (item.startsWith("c:")) {
        const cid = item.slice(2);
        for (const x of groups) { const l = x.m.cids; const k = l.indexOf(cid); if (k >= 0) l.splice(k, 1); }
        g.m.cids.push(cid);
        S.src[P(g, "cids")] = "teacher";
      } else if (item.startsWith("p:")) {
        const [where, gi, pj] = item.slice(2).split(".");
        const from = S.lesson.mistakes[where][+gi];
        if (from === g.m) return;
        const pts = from.points;
        reorderKeys(`mistakes.${where}.${gi}.points`, pts.map((_, j) => j).filter(j => j !== +pj));
        const [pt] = pts.splice(+pj, 1);
        (g.m.points = g.m.points || []).push(pt);
        S.src[`${P(g, "points")}.${g.m.points.length - 1}`] = "teacher";
      } else return;
      syncCount(g); touch(); refreshPreview(); renderEdit();
    },
  });
  const addSentence = g => h("select", { class: "small", "aria-label": "Thêm câu từ bài", onchange: e => {
    if (!e.target.value) return;
    (g.m.points = g.m.points || []).push({ sids: [e.target.value], quote: "", comment: "", better: "" });
    S.src[`${P(g, "points")}.${g.m.points.length - 1}`] = "teacher";
    syncCount(g); touch(); refreshPreview(); renderEdit();
  } }, h("option", { value: "" }, "+ Thêm câu từ bài làm ví dụ"), sidOptions().map(([id, l]) => h("option", { value: id }, l)));
  const busy = S.busy || {};
  return [
    h("h2", {}, "Từ vựng & ngữ pháp"),
    h("p", { class: "muted small" }, "Mỗi nhóm là một kiểu lỗi: chỗ sửa (gạch đỏ → xanh) và ghi chú anh tô mà không sửa. Kéo một dòng sang nhóm khác; bấm vào dòng để xem câu đó trong bài. Nhóm “Dạy chính” (ngữ pháp) và “Bắt buộc” (từ vựng) được dạy trong bài; “Xem thêm” là tùy chọn; “Lỗi nhỏ khác” chỉ liệt kê."),
    approveBar(),
    mainId && !S.lesson.practice.items.some(it => it.mistake === mainId.id) ? h("div", { class: "notice" },
      "Bài luyện đang viết cho nhóm khác, chưa có câu nào cho nhóm dạy chính. ", h("button", { class: "btn small", type: "button", onclick: () => regenPractice() }, "Soạn lại bài luyện")) : null,
    fLines("mistakes.lr_intro", "Mở đầu phần từ vựng"), fLines("mistakes.gra_intro", "Mở đầu phần ngữ pháp"),
    groups.map(g => {
      const key = `${g.where}.${g.i}`, pts = g.m.points || [];
      return h("div", { class: "sub" + (g.role === "main" ? " main-group" : ""), "data-path": `mistakes.${key}` },
        h("div", { class: "head" }, g.where === "main" ? approveBtn(`mistakes.main.${g.i}`) : null,
          g.role === "main" ? h("span", { class: "badge-main" }, "Dạy chính") : null,
          h("input", { value: g.where === "main" ? g.m.title : g.m.label, style: "flex:1", "aria-label": "Tên nhóm",
            oninput: e => { if (g.where === "main") changed(P(g, "title"), e.target.value); else changed(P(g, "label"), e.target.value); } }),
          h("select", { "aria-label": "Từ vựng hay ngữ pháp", onchange: e => { if (g.where === "main") { g.m.tab = e.target.value; g.m.tag = e.target.value === "LR" ? "Vocab" : "Grammar"; } else g.m.tag = e.target.value; touch(); refreshPreview(); renderEdit(); } },
            [["GRA", "Ngữ pháp"], ["LR", "Từ vựng"]].map(([v, l]) => h("option", { value: v, selected: (g.where === "main" ? g.m.tab : g.m.tag) === v ? true : null }, l))),
          h("select", { "aria-label": "Vai trò", onchange: e => setRole(g, e.target.value) },
            [["main", "Dạy chính"], ["core", "Bắt buộc (từ vựng)"], ["optional", "Xem thêm"], ["other", "Lỗi nhỏ khác"]].map(([v, l]) => h("option", { value: v, selected: g.role === v ? true : null }, l)))),
        h("div", { class: "crows", ...dropInto(g) },
          g.m.cids.map(c => corrRow(c)),
          pts.map((pt, j) => pointRow(pt, { path: `mistakes.${key}.points.${j}`, drag: `p:${key}.${j}`, editable: g.where === "main",
            remove: !pt.nid ? () => { reorderKeys(`mistakes.${key}.points`, pts.map((_, x) => x).filter(x => x !== j)); pts.splice(j, 1); syncCount(g); touch(); refreshPreview(); renderEdit(); } : null })),
          !g.m.cids.length && !pts.length ? h("div", { class: "small muted" }, "Kéo chỗ sửa vào đây, hoặc thêm câu từ bài") : null),
        h("div", { class: "row" }, addSentence(g),
          g.where === "main" ? h("button", { class: "btn small", type: "button", disabled: busy[g.m.id] ? true : null, onclick: () => regenGroup(g) },
            busy[g.m.id] ? "Claude đang soạn…" : "✨ Soạn phần dạy") : null),
        g.where === "main" ? h("details", { open: !g.m.rule || !g.m.rule.some(Boolean) ? true : null }, h("summary", {}, "Phần dạy (câu hỏi, quy tắc, ví dụ)"),
          fLine(P(g, "count_line"), "Đếm lỗi"), fLine(P(g, "ask.q"), "Câu hỏi"), fLines(P(g, "ask.options"), "Lựa chọn"), fNumber(P(g, "ask.answer"), "Đáp án đúng (0 là lựa chọn đầu)"),
          fLine(P(g, "reason"), "Vì sao em hay sai"), fLines(P(g, "board"), "Bảng (công thức ngắn)", { voice: false }),
          fLines(P(g, "rule"), "Quy tắc"), h("div", { class: "grid2" }, fLine(P(g, "example.bad"), "Ví dụ sai", { voice: false, en: true }), fLine(P(g, "example.good"), "Ví dụ đúng", { voice: false, en: true }))) : null);
    }),
    h("button", { class: "btn small", type: "button", onclick: () => { S.lesson.mistakes.others.push({ label: "Nhóm mới", cids: [], points: [], tag: "GRA" }); touch(); renderEdit(); } }, "+ Thêm nhóm"),
  ];
}

/* ✨ one small Claude call: the teaching of a group the teacher made or changed (only empty fields are filled) */
async function regenGroup(g) {
  if (!SETTINGS.apiKey) return alert("Chưa có Claude API key. Thêm trong phần Cài đặt nha.");
  logEvent("regen_group", { group: g.m.title, cids: g.m.cids.length, notes: (g.m.points || []).length });
  S.busy = { ...(S.busy || {}), [g.m.id]: true }; renderEdit();
  try {
    const d = await draftGroup({ apiKey: SETTINGS.apiKey, week: draftWeek(), teacher: SETTINGS.teacher, input: draftInput(), lesson: S.lesson, group: g.m });
    const base = `mistakes.main.${g.i}`, m = g.m, empty = v => v == null || (Array.isArray(v) ? !v.some(Boolean) : typeof v === "object" ? !Object.values(v).some(Boolean) : !String(v).trim());
    for (const f of ["count_line", "ask", "reason", "board", "rule", "example"]) if (empty(m[f])) { m[f] = d[f]; S.src[`${base}.${f}`] = "ai"; delete S.ok[`${base}.${f}`]; }
    (m.points || []).forEach((pt, j) => { if (!pt.better && d.better[j]) { pt.better = d.better[j]; S.src[`${base}.points.${j}.better`] = "ai"; } });
    delete S.ok[base];
  } catch (e) { alert(e.message || String(e)); }
  S.busy = { ...S.busy, [g.m.id]: false };
  touch(); refreshPreview(); renderEdit();
}
/* new exercises for the current groups (after the main group changed) */
async function regenPractice() {
  if (!SETTINGS.apiKey) return alert("Chưa có Claude API key. Thêm trong phần Cài đặt nha.");
  if (!confirm("Soạn lại toàn bộ bài luyện theo các nhóm lỗi hiện tại? Bài luyện cũ (cả chỗ anh đã sửa) sẽ được thay.")) return;
  S.busy = { ...(S.busy || {}), practice: true }; renderEdit();
  logEvent("regen_practice", { main: (S.lesson.mistakes.main[0] || {}).title });
  try {
    const old = S.lesson.practice;
    S.lesson.practice = await redraftPractice({ apiKey: SETTINGS.apiKey, week: draftWeek(), teacher: SETTINGS.teacher, input: draftInput(), lesson: S.lesson });
    for (const map of [S.ok, S.src]) for (const k of Object.keys(map)) if (k === "practice" || k.startsWith("practice.")) delete map[k];
    S.src.practice = "ai";
    showUndo("Đã soạn lại bài luyện", () => { S.lesson.practice = old; });
  } catch (e) { alert(e.message || String(e)); }
  S.busy = { ...S.busy, practice: false };
  touch(); refreshPreview(); renderEdit();
}

function practiceForm() {
  const P = S.lesson.practice, ids = P.items.map(x => x.id);
  const mids = S.lesson.mistakes.main.map(m => [m.id, m.title]);
  return [h("h2", {}, "Luyện tập"), h("p", { class: "muted small" }, "4 câu chính (một câu mỗi kiểu) về lỗi dạy chính, rồi các câu luyện thêm."),
    h("div", { class: "row", style: "margin-bottom:8px" }, h("button", { class: "btn small", type: "button", disabled: (S.busy || {}).practice ? true : null, onclick: () => regenPractice() },
      (S.busy || {}).practice ? "Claude đang soạn…" : "Soạn lại bài luyện theo các nhóm lỗi hiện tại")),
    approveBar(["practice"]), fLines("practice.intro", "Mở đầu"),
    cards("practice.items", (x, i) => `${P.core.includes(x.id) ? "★ " : ""}${x.id} · ${x.type}`, (p, it) => [
      h("div", { class: "grid2" },
        h("label", { class: "inline" }, h("input", { type: "checkbox", checked: P.core.includes(it.id), onchange: e => {
          const core = P.core.filter(x => x !== it.id); if (e.target.checked) core.push(it.id); changed("practice.core", ids.filter(x => core.includes(x)), { rerender: true });
        } }), "Câu chính"),
        fSelect(`${p}.mistake`, "Thuộc lỗi", mids),
        fSelect(`${p}.type`, "Kiểu", [["choose", "Chọn đáp án"], ["tap", "Chạm vào chữ sai"], ["build", "Xếp câu"]], { rerender: true })),
      it.type === "choose" ? [fLine(`${p}.q`, "Câu hỏi"), fLine(`${p}.sentence`, "Câu có chỗ trống ___ (để trống nếu chọn cả câu)", { voice: false, en: true }),
        fLines(`${p}.options`, "Lựa chọn", { voice: false, en: true }), fNumber(`${p}.answer`, "Đáp án đúng (0 là lựa chọn đầu)")] : null,
      it.type === "tap" ? [fLine(`${p}.q`, "Câu hỏi"), fLine(`${p}.sentence`, "Câu", { voice: false, en: true }),
        h("div", { class: "grid2" }, fLine(`${p}.wrong`, "Chữ sai (một chữ trong câu)", { voice: false, en: true }), fLine(`${p}.fix`, "Chữ đúng", { voice: false, en: true }))] : null,
      it.type === "build" ? [fLine(`${p}.vi`, "Câu tiếng Việt", { voice: false }), fLines(`${p}.answer`, "Các cụm theo đúng thứ tự", { voice: false, en: true }), fLines(`${p}.extra`, "Cụm gây nhiễu", { voice: false, en: true })] : null,
      fLine(`${p}.explain`, "Giải thích"),
    ], { add: () => ({ id: "x" + Date.now().toString(36), mistake: mids[0] ? mids[0][0] : "", type: "choose", q: "", options: ["", "", ""], answer: 0, explain: "" }) })];
}

function praiseForm() {
  const L = S.lesson, cand = (L.__candidates && L.__candidates.praise) || [];
  const places = [Object.values(L.scores || {}).some(Boolean) ? ["results", "Kết quả"] : null, L.framework ? ["framework", "Framework"] : null,
    L.t1 ? ["overview", "Overview"] : null, L.t1 ? ["data", L.t1.kind === "map" ? "Details" : "Số liệu"] : null, L.paraphrase ? ["paraphrase", "Paraphrase"] : null,
    L.linking ? ["linking", "Linking"] : null, ["lr", "Từ vựng"], ["gra", "Ngữ pháp"], ...(L.ideas ? L.ideas.overview : []).map(o => ["idea:" + o.tag, "Ý: " + o.tag])].filter(Boolean);
  const chosen = L.praise;
  const isOn = c => chosen.some(p => p.line === c.line);
  const all = [...chosen, ...cand.filter(c => !isOn(c))];
  const warnFor = () => chosen.length > 3 ? "Tối đa 3 lời khen" : chosen.length < 2 ? "Nên có 2 đến 3 lời khen" : "";
  return [h("h2", {}, "Lời khen"),
    h("p", { class: "muted small" }, "Chọn 2 đến 3 lời khen cụ thể. Đậu nói mỗi lời ở đúng chỗ đã chọn."),
    L.praise_status === "draft" ? h("div", { class: "notice" }, "Lời khen đang là bản nháp.",
      h("button", { class: "btn small", type: "button", style: "margin-left:8px", onclick: () => { L.praise_status = "ok"; touch(); renderEdit(); showUndo("Đã duyệt: lời khen", () => { L.praise_status = "draft"; }); } }, "Duyệt lời khen")) :
      h("div", { class: "notice good" }, "Đã duyệt lời khen"),
    h("p", { class: "warn small" }, warnFor()),
    all.map(c => {
      const on = isOn(c);
      return h("div", { class: "pick" },
        h("input", { type: "checkbox", checked: on, disabled: !on && chosen.length >= 3 ? true : null, onchange: e => {
          logEvent(e.target.checked ? "praise_pick" : "praise_unpick", { line: c.line });
          if (e.target.checked) chosen.push({ at: c.at, line: c.line }); else chosen.splice(chosen.findIndex(p => p.line === c.line), 1);
          L.praise_status = L.praise_status === "ok" ? "ok" : "draft"; touch(); refreshPreview(); renderEdit();
        } }),
        h("div", { style: "flex:1" },
          h("input", { type: "text", value: c.line, style: "width:100%", oninput: e => { const old = c.line; c.line = e.target.value; const p = chosen.find(x => x.line === old); if (p) p.line = c.line; touch(); refreshPreview(); } }),
          c.evidence ? h("div", { class: "small muted" }, "Dựa trên: ", c.evidence) : null, h("div", { class: "lint" }, lint(c.line).join(" · "))),
        h("select", { onchange: e => { c.at = e.target.value; const p = chosen.find(x => x.line === c.line); if (p) p.at = c.at; touch(); refreshPreview(); } },
          places.map(([v, l]) => h("option", { value: v, selected: v === c.at ? true : null }, l))));
    }),
    h("button", { class: "btn small", type: "button", onclick: () => { L.__candidates = L.__candidates || { praise: [], takeaways: [] }; L.__candidates.praise.push({ at: "framework", line: "", evidence: "" }); touch(); renderEdit(); } }, "+ Thêm lời khen")];
}

/* the closing verse: picked automatically (same pick as build.py) unless the teacher chooses one */
function quoteForm() {
  const L = S.lesson, F = L.finish;
  const list = [...BUNDLE.quotes, ...(SETTINGS.quotes || [])];
  const auto = BUNDLE.quotes[Array.from(L.student + L.homework).reduce((n, ch) => n + ch.codePointAt(0), 0) % BUNDLE.quotes.length];
  const same = (a, b) => a && b && a.text === b.text && a.source === b.source;
  const k = F.quote ? list.findIndex(q => same(q, F.quote)) : -1;
  const mode = !F.quote ? "auto" : k >= 0 ? String(k) : "custom";
  const label = q => `${q.source} · ${q.text.length > 70 ? q.text.slice(0, 67) + "…" : q.text}`;
  let addBtn = null;
  const set = (q, rerender = true) => {
    F.quote = q; S.src["finish.quote"] = "teacher"; touch(); refreshPreview();
    if (rerender) renderEdit(); else if (addBtn) addBtn.disabled = !q.text.trim() || !q.source.trim();
  };
  const shown = F.quote && F.quote.text ? F.quote : auto;
  return h("div", { class: "field" }, h("div", { class: "lbl" }, "Câu kết (cuối bài)"),
    h("select", { onchange: e => { const v = e.target.value; set(v === "auto" ? null : v === "custom" ? { text: "", source: "", meaning: "" } : list[+v]); } },
      h("option", { value: "auto", selected: mode === "auto" ? true : null }, "Tự động: " + label(auto)),
      list.map((q, i) => h("option", { value: i, selected: mode === String(i) ? true : null }, label(q))),
      h("option", { value: "custom", selected: mode === "custom" ? true : null }, "Câu khác…")),
    mode === "custom" ? h("div", { class: "sub", style: "margin-top:6px" },
      h("label", {}, "Câu (tiếng Anh)", h("textarea", { lang: "en", value: F.quote.text, placeholder: "Let the wise hear and increase in learning…", oninput: e => { F.quote.text = e.target.value; set(F.quote, false); } })),
      h("div", { class: "grid2" },
        h("label", {}, "Nguồn", h("input", { value: F.quote.source, placeholder: "Proverbs 1:5", oninput: e => { F.quote.source = e.target.value; set(F.quote, false); } })),
        h("label", {}, "Nghĩa (tiếng Việt)", h("input", { value: F.quote.meaning || "", oninput: e => { F.quote.meaning = e.target.value; set(F.quote, false); } }))),
      addBtn = h("button", { class: "btn small", type: "button", disabled: !F.quote.text.trim() || !F.quote.source.trim() ? true : null, onclick: async () => {
        const quotes = [...(SETTINGS.quotes || []), { ...F.quote }];
        SETTINGS = { ...SETTINGS, quotes }; await setSettings({ quotes }); renderEdit();
      } }, "Thêm vào danh sách (dùng cho các bài sau)")) : null,
    h("div", { class: "small muted", style: "margin-top:4px" }, shown.meaning ? `“${shown.text}” · ${shown.meaning}` : `“${shown.text}”`));
}
function takeawaysForm() {
  const L = S.lesson, cand = (L.__candidates && L.__candidates.takeaways) || [];
  const chosen = L.finish.takeaways;
  const all = [...chosen, ...cand.filter(c => !chosen.includes(c))];
  return h("div", { class: "field" }, h("div", { class: "lbl" }, `Nhớ cho bài sau (chọn 4, đang chọn ${chosen.length})`, srcBadge("finish.takeaways.0")),
    all.map((t, i) => h("div", { class: "pick" },
      h("input", { type: "checkbox", checked: chosen.includes(t), onchange: e => {
        const next = e.target.checked ? [...chosen, t] : chosen.filter(x => x !== t);
        logEvent(e.target.checked ? "takeaway_pick" : "takeaway_unpick", { line: t });
        changed("finish.takeaways", next, { rerender: true });
      } }),
      h("input", { type: "text", value: t, oninput: e => {
        const k = chosen.indexOf(t); if (k >= 0) chosen[k] = e.target.value;
        const j = cand.indexOf(t); if (j >= 0) cand[j] = e.target.value;
        changed("finish.takeaways", chosen);
      } }))),
    h("button", { class: "btn small", type: "button", onclick: () => { L.__candidates = L.__candidates || { praise: [], takeaways: [] }; L.__candidates.takeaways.push(""); touch(); renderEdit(); } }, "+ Thêm"));
}

/* ---------- 5. export ---------- */
const slug = s => (s || "").normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "");
function fileBase() { return `Dau-on-bai-${slug(S.lesson.student)}-${slug(S.lesson.homework)}`; }
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = h("a", { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
async function renderExport() {
  const L = S.lesson;
  const problems = checkLesson(L);
  const aiLeft = openItems().length;
  const warns = [];
  if (!isFlow2()) {
    if (L.praise_status === "draft") warns.push("Lời khen chưa duyệt");
    if (L.praise.length < 2 || L.praise.length > 3) warns.push(`Đang có ${L.praise.length} lời khen (nên 2 đến 3)`);
  }
  const tk = L.finish.takeaways.length;
  if (isFlow2() ? tk < 2 || tk > 4 : tk !== 4) warns.push(`Đang có ${tk} điều cần nhớ (nên ${isFlow2() ? "3 đến 4" : "4"})`);
  if (emoticonCount() > 3) warns.push(`${emoticonCount()} biểu tượng cảm xúc (nên tối đa 3)`);
  const lintCount = leaves(L, "").filter(p => isVoice(p) && typeof getP(L, p) === "string" && lint(getP(L, p)).length).length;
  if (lintCount) warns.push(`${lintCount} dòng của Đậu chưa đúng giọng (dấu chấm, emoji…)`);
  const status = h("div", { id: "pubStatus" });
  $("#main").replaceChildren(h("div", { class: "panel" }, h("div", { class: "card" },
    h("h1", {}, "Xuất bài ôn"), staleNotice(),
    problems.length ? h("div", { class: "notice bad" }, h("b", {}, "Phải sửa trước khi xuất:"), h("ul", { class: "problems" }, problems.map(p => h("li", {}, p)))) : h("div", { class: "notice good" }, "Bài ôn dựng được."),
    aiLeft ? h("div", { class: "notice" }, isFlow2() ? `Còn ${aiLeft} chỗ máy thấy chưa ổn (xem "Kiểm tra"). Vẫn xuất được.` : `Còn ${aiLeft} mục cần duyệt (xem "Cần duyệt"). Vẫn xuất được, nhưng anh nên đọc qua.`) : null,
    warns.length ? h("div", { class: "notice" }, h("ul", { class: "problems" }, warns.map(w => h("li", {}, w)))) : null,
    S.usage ? h("p", { class: "small muted" }, usageLine(S.usage)) : null,
    h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", disabled: problems.length ? true : null, onclick: async () => { const { html } = await buildPage(L, BUNDLE); download(fileBase() + ".html", html, "text/html"); await recordLesson("download"); } }, "Tải file HTML"),
      h("button", { class: "btn", type: "button", onclick: () => download(fileBase() + ".json", JSON.stringify(snapshot(), null, 1), "application/json") }, "Lưu bài ôn (.json) để sửa sau"),
      h("button", { class: "btn", type: "button", disabled: problems.length || !SETTINGS.netlifyToken ? true : null, title: SETTINGS.netlifyToken ? "" : "Thêm Netlify token trong Cài đặt", onclick: () => publish(status) }, "Đăng link")),
    L.__link ? h("p", {}, "Link đã đăng gần nhất: ", h("a", { href: L.__link, target: "_blank" }, L.__link), h("br"), h("span", { class: "small muted" }, "Đăng lại sẽ tạo link mới; link cũ vẫn giữ nguyên.")) : null,
    status)));
}
async function publish(status) {
  status.replaceChildren(h("p", {}, "Đang đăng…"));
  try {
    const { html } = await buildPage(S.lesson, BUNDLE);
    const { url, siteId, path } = await publishPage({ token: SETTINGS.netlifyToken, html, siteId: SETTINGS.netlifySiteId || null, known: SETTINGS.published || [] });
    SETTINGS = { ...SETTINGS, netlifySiteId: siteId, published: [...(SETTINGS.published || []), path] };
    await setSettings({ netlifySiteId: siteId, published: SETTINGS.published });
    S.lesson.__links = [...(S.lesson.__links || []), url]; S.lesson.__link = url; touch();
    await recordLesson("publish");
    status.replaceChildren(h("div", { class: "notice good" }, "Đã đăng: ", h("a", { href: url, target: "_blank" }, url), " ",
      h("button", { class: "btn small", type: "button", onclick: () => navigator.clipboard.writeText(url) }, "Chép link")));
  } catch (e) { status.replaceChildren(h("div", { class: "notice bad" }, e.message || String(e))); }
}

// settings may change in the other tab (API key, token): pick them up when coming back
window.addEventListener("focus", async () => {
  if (!BUNDLE) return;
  SETTINGS = await getSettings();
  if (S.step === "draft" && !drafting) (isFlow2() ? renderDraft2 : renderDraft)();
  if (S.step === "export") renderExport();
});

/* =====================================================================
   Flow 2: the teacher decides, Claude writes little
   ===================================================================== */
const IDEA_TAGS = () => curWeek().kind === "paragraph+paraphrase" ? [["i1", "Ý 1"], ["i2", "Ý 2"]] : [["i1", "Ý 1"], ["i2", "Ý 2"], ["i3", "Ý 3"], ["i4", "Ý 4"]];
const hasIdeas = () => curWeek().task !== 1;
const allSents = () => S.page.essay.paragraphs.flatMap(p => p.sentences);
const findSent = sid => allSents().find(s => s.id === sid);
const noteOf = ref => S.page.task_comments[+ref.slice(1) - 1];
const pointOfNote = t => ({ sids: t.sentence_ids || [], quote: t.quote || "", comment: t.comment || "", better: t.fix || "" });
function d2() { return S.d2 || (S.d2 = { ideas: {}, topics: {}, lang: { LR: { name: "", none: false }, GRA: { name: "", none: false }, items: {} } }); }

/* Ý tags guessed: in each body paragraph the first sentence when it already states an idea ("The first
   challenge is…"), else the sentence after the topic sentence; then the sentences opening with
   "Moreover / On top of that / In terms of …" (Week 1: in the Exercise 1 paragraph) */
const IDEA_FIRST = /^(The first|First(ly)?\b|First of all|To begin with|One (major |key |main |significant )?(reason|benefit|advantage|drawback|disadvantage|challenge|problem|issue|argument|way|factor))/i;
const IDEA_NEXT = /^(Moreover|In addition|Additionally|Furthermore|Second(ly)?\b|Third(ly)?\b|Another|Besides|What is more|Apart from|On top of (that|this)|In terms of|Regarding|With regards? to|As for|Turning to|Last(ly)?\b|Finally|The second|The other)/i;
function autoTags2() {
  S.tags = {};
  if (!hasIdeas()) return;
  const ps = S.page.essay.paragraphs, tags = IDEA_TAGS().map(t => t[0]);
  const bodies = curWeek().kind === "paragraph+paraphrase" ? [ps.reduce((a, p) => p.sentences.length > a.sentences.length ? p : a, ps[0])]
    : ps.length > 3 ? ps.slice(1, -1) : ps.slice(1);
  let k = 0;
  for (const p of bodies) {
    const text = s => sentText(s, "orig").trim(), first = p.sentences.length && IDEA_FIRST.test(text(p.sentences[0])) ? 0 : 1;
    p.sentences.forEach((s, i) => {
      if (k < tags.length && (i === first || (i > first && IDEA_NEXT.test(text(s))))) S.tags[s.id] = tags[k++];
    });
  }
}
/* the ideas: each tagged sentence and the untagged sentences after it in its paragraph; sentences
   tagged with the same Ý are one idea (tagging every sentence of it is fine) */
function ideasFromTags() {
  const labels = Object.fromEntries(IDEA_TAGS()), byKey = {}, out = [];
  for (const p of S.page.essay.paragraphs) {
    let cur = null;
    for (const s of p.sentences) {
      const t = S.tags[s.id];
      if (t && labels[t]) {
        if (!byKey[t]) out.push(byKey[t] = { tag: labels[t], key: t, sids: [] });
        cur = byKey[t];
        cur.sids.push(s.id);
      } else if (t) cur = null;
      else if (cur) cur.sids.push(s.id);
    }
  }
  return out.sort((a, b) => a.key.localeCompare(b.key));
}
/* the teacher's CRM comments on an idea's sentences (the TR/CC editor's, and the plain "=> COMMENT"
   notes): they go into the idea's note unless the teacher unticks them */
const LOGIC_KINDS = new Set(["trcc", "default"]);
function ideaCrm(x) {
  return S.page.task_comments.map((t, i) => ({ ref: "n" + (i + 1), t }))
    .filter(({ ref, t }) => LOGIC_KINDS.has(t.kind) && commentOf(ref).trim() && (t.sentence_ids || []).some(sid => x.sids.includes(sid)))
    .map(({ ref, t }) => ({ ref, text: commentOf(ref).trim(), quote: t.quote || "" }));
}
function ideaState(x) { const D = d2(); return D.ideas[x.tag] || (D.ideas[x.tag] = { status: "ok", note: "", off: [] }); }
const ideaUsed = x => { const st = ideaState(x); return ideaCrm(x).filter(c => !(st.off || []).includes(c.ref)); };
const ideaNote = x => [...ideaUsed(x).map(c => c.text), ideaState(x).note.trim()].filter(Boolean).join("\n");
/* a CRM note already said inside an idea the student fixes or upgrades: not shown again in Language */
const usedInIdea = ref => hasIdeas() && ideasFromTags().some(x => ideaState(x).status !== "ok" && ideaUsed(x).some(c => c.ref === ref));
/* comments the teacher moved in the editor ("chuyển nhận xét sang…"); the CRM is never touched */
/* moved comments: D.commentAt[origin] = the correction or note the CRM comment of `origin` now sits on
   (only in the lesson; the CRM is never touched). Each comment moves on its own, so dragging one back
   never takes another with it. Drafts from before kept whole texts in D.comments: still honoured */
const ownComment = ref => ref[0] === "c" ? (S.page.corrections[ref] || {}).comment || "" : (noteOf(ref) || {}).comment || "";
const commentLoc = origin => (d2().commentAt || {})[origin] || origin;
function commentPieces(ref) {
  const at = d2().commentAt || {};
  return [ref, ...Object.keys(at).filter(o => o !== ref && at[o] === ref)]
    .filter(o => commentLoc(o) === ref).map(o => ({ origin: o, text: ownComment(o).trim() })).filter(p => p.text);
}
function commentOf(ref) {
  const legacy = (d2().comments || {})[ref];
  if (legacy != null) return legacy;
  return commentPieces(ref).map(p => p.text).join("\n");
}
const commentMoved = ref => (d2().comments || {})[ref] != null || commentLoc(ref) !== ref || commentPieces(ref).some(p => p.origin !== ref);
/* the page as Claude and the student page see it: the moved comments in place */
function pageFor2() {
  const P = structuredClone(S.page);
  for (const ref of Object.keys(P.corrections)) P.corrections[ref].comment = commentOf(ref);
  P.task_comments.forEach((t, i) => { t.comment = commentOf("n" + (i + 1)); });
  return P;
}
const topicSents = () => allSents().filter(s => /^Topic\s*\d/i.test(sentText(s, "orig").trim()));

/* every correction and every note from the grammar/vocab editor, in essay order (the TR/CC editor's
   notes are about logic: they are shown on the Logic step) */
function langItems() {
  const P = S.page, at = new Map(allSents().map((s, i) => [s.id, i])), items = [];
  allSents().forEach(s => s.segs.forEach((g, j) => {
    if (typeof g === "string") return;
    const c = P.corrections[g.c];
    items.push({ ref: g.c, at: at.get(s.id) * 1000 + j, tab: c.kind === "vocabulary" ? "LR" : "GRA", comment: commentOf(g.c) });
  }));
  P.task_comments.forEach((t, i) => {
    if (t.kind === "trcc") return;
    // a plain highlight with "=> COMMENT" is usually about the logic: it starts in the Logic part
    items.push({ ref: "n" + (i + 1), at: (at.get((t.sentence_ids || [])[0]) ?? 999) * 1000 + (t.at >= 0 ? Math.min(t.at, 998) : 999),
      tab: t.kind === "vocabulary" ? "LR" : t.kind === "default" ? "LOGIC" : "GRA", comment: commentOf("n" + (i + 1)), note: t });
  });
  return items.sort((a, b) => a.at - b.at);
}
const PRAISE_RE = /\b(great|good job|nice|excellent|fantastic|well done|perfect|brilliant)\b|rất hay|hay quá|tốt lắm|giỏi|xuất sắc/i;
/* "nâng cấp": her words aren't wrong, the teacher suggests something better */
const UPGRADE_RE = /nâng cấp|hay hơn|tốt hơn|tự nhiên hơn|ấn tượng hơn|học thuật hơn|đề xuất|\bupgrade\b/i;
const isUpgrade = it => { const st = itemState(it); return st.up != null ? st.up : UPGRADE_RE.test(it.comment) && !/\bsai\b|lỗi|thiếu/i.test(it.comment); };
function itemState(it) {
  const st = d2().lang.items;
  if (!st[it.ref]) st[it.ref] = { tab: it.tab, sys: null };
  return st[it.ref];
}
/* a tab's systematic mistakes: up to 3 names (older drafts had one, `name`) */
const SYS_MAX = 3;
function sysNames(t) { const L = d2().lang[t]; if (!L.names) L.names = [L.name || ""]; return L.names; }
const sysOf = it => { const s = itemState(it).sys; return s === true ? 0 : typeof s === "number" ? s : null; };
/* what the student sees of a correction: in a systematic mistake's lesson (the chips 1·2·3), in the
   "N lỗi khác" list (default), as praise in "Cụm em đã dùng tốt", or nothing. Logic comments: their own
   screen in Logic, or nothing. Older drafts: Dạy / Socratic / Bỏ qua all mean the list now */
function modeOf(it) {
  const st = itemState(it), logic = st.tab === "LOGIC";
  if (st.mode === "skip") return "hide";             // "Bỏ qua" in drafts from before
  if (st.mode === "hide" || st.mode === "praise") return logic && st.mode === "praise" ? "teach" : st.mode;
  if (st.mode) return logic ? "teach" : "list";
  if (it.note && usedInIdea(it.ref)) return "hide";
  if (it.note && PRAISE_RE.test(it.comment) && !/nhưng|but|however|sai|lỗi|thiếu/i.test(it.comment)) return logic ? "teach" : "praise";
  return logic ? "teach" : "list";
}
const inSystemic = it => itemState(it).tab !== "LOGIC" && modeOf(it) === "list" && sysOf(it) != null && (sysNames(itemState(it).tab)[sysOf(it)] || "").trim() && !d2().lang[itemState(it).tab].none;

function decisions2() {
  const D = d2(), items = langItems();
  return {
    checklist: S.checklist.map((c, i) => ({ point: i, item: c.item, status: checkStatus(c), note: c.note })),
    ideas: hasIdeas() ? ideasFromTags().map(x => {
      const st = ideaState(x);
      return { tag: x.tag, sids: x.sids, status: st.status || "ok", ...(st.status === "fix" ? { fix_type: st.fixType || null } : {}), note: ideaNote(x), card_note: st.note.trim() };
    }) : [],
    topics: curWeek().kind === "paragraph+paraphrase" ? topicSents().map((s, i) => ({ tag: "Topic " + (i + 1), sid: s.id, ok: (D.topics[s.id] || {}).ok !== false, note: (D.topics[s.id] || {}).note || "" })) : [],
    language: {
      // the systematic mistakes, in order: up to 3 per tab, each with the corrections ticked for it
      systemic: ["LR", "GRA"].filter(t => !D.lang[t].none).flatMap(t => sysNames(t).map((name, k) => ({ tab: t, name: name.trim(),
        refs: items.filter(it => itemState(it).tab === t && inSystemic(it) && sysOf(it) === k).map(it => it.ref) })).filter(x => x.name)),
      items: items.map(it => ({ ref: it.ref, tab: itemState(it).tab, mode: inSystemic(it) ? "systemic" : modeOf(it), ...(isUpgrade(it) ? { upgrade: true } : {}) })),
    },
    rewrite: noRewrite() ? null : S.rewriteTarget && S.rewriteTarget.sids.length ? { target: S.rewriteTarget.target, sids: S.rewriteTarget.sids } : null,
    ...(noRewrite() ? { no_rewrite: true } : {}),
  };
}
/* the teacher chose not to assign a rewrite this time */
const noRewrite = () => !!(S.rewriteTarget && S.rewriteTarget.none);
/* what still has to be decided before Claude can write: [step, message] */
function blockers2() {
  const D = d2(), out = [], items = langItems();
  const open = S.checklist.filter(c => c.ok == null).length;
  if (open) out.push(["logic", `Logic: còn ${open} điểm chưa tick ✓ hoặc ✗`]);
  const bare = S.checklist.filter(c => (c.ok === false || c.ok === "minor") && !c.note.trim()).length;
  if (bare) out.push(["logic", `Logic: ${bare} điểm ✗ / ~ chưa có ghi chú (Claude cần biết sai ở đâu)`]);
  if (S.checklist.some(c => !c.item.trim())) out.push(["logic", "Logic: có điểm Framework chưa có nội dung (ghi vào, hoặc bấm × để bỏ)"]);
  if (hasIdeas() && !ideasFromTags().length) out.push(["logic", "Logic: chưa gắn nhãn ý nào (Ý 1, Ý 2…)"]);
  const badIdeas = ideasFromTags().filter(x => ideaState(x).status === "fix" && !ideaNote(x)).length;
  if (badIdeas) out.push(["logic", `Logic: ${badIdeas} ý ✗ chưa có ghi chú`]);
  const noType = ideasFromTags().filter(x => ideaState(x).status === "fix" && !ideaState(x).fixType).length;
  if (noType) out.push(["logic", `Logic: ${noType} ý ✗ chưa chọn cách sửa (Đổi hướng / Sửa mắt xích / Thiếu bước)`]);
  for (const t of ["LR", "GRA"]) {
    const L = D.lang[t], name = t === "LR" ? "Từ vựng" : "Ngữ pháp", names = sysNames(t);
    if (L.none) continue;
    if (!names.some(n => n.trim())) out.push(["language", `Language · ${name}: ghi lỗi hệ thống, hoặc tick "Không có lỗi hệ thống"`]);
    names.forEach((n, k) => { if (n.trim() && !items.some(it => itemState(it).tab === t && inSystemic(it) && sysOf(it) === k)) out.push(["language", `Language · ${name}: lỗi hệ thống "${n.trim()}" chưa có chỗ sửa nào (bấm chip ${k + 1} ở các chỗ sửa của lỗi này)`]); });
  }
  if (!noRewrite() && !(S.rewriteTarget && S.rewriteTarget.sids.length)) out.push(["rewrite", "Viết lại: chưa chọn câu (hoặc tick \"Không giao viết lại\")"]);
  return out;
}

/* ---------- 2. Logic ---------- */
let activeIdea = "i1";
function triRow(opts, value, set) {
  return h("div", { class: "tri" }, opts.map(([v, t]) => h("button", { type: "button", "data-v": v, "aria-pressed": String(value === v), "aria-label": t, onclick: () => set(value === v ? null : v) }, t)));
}
function renderLogic() {
  const w = curWeek(), D = d2();
  const trcc = S.page.task_comments.filter(t => t.kind === "trcc" && t.comment);
  const rerender = () => { touch(); renderLogic(); };
  const checklist = h("div", { class: "card" },
    h("h1", {}, "Logic"),
    h("p", { class: "muted" }, "Tick từng điểm Framework của tuần: ✓ đạt · ~ cần chỉnh nhẹ · ✗ chưa đạt, và ghi chú cái sai (bắt buộc với ~ và ✗). Claude không tự chấm: nó chỉ viết lời Đậu từ dấu tick và ghi chú của anh. Sửa chữ của một điểm, bấm × để bỏ, hoặc thêm điểm của anh."),
    S.checklist.map((c, i) => h("div", { class: "check-row" },
      triRow([["yes", "✓"], ["minor", "~"], ["no", "✗"]], c.ok === true ? "yes" : c.ok === "minor" ? "minor" : c.ok === false ? "no" : null,
        v => { c.ok = v === "yes" ? true : v === "minor" ? "minor" : v === "no" ? false : null; rerender(); }),
      h("div", { class: "check-item" },
        h("input", { class: "item-text", value: c.item, placeholder: "điểm Framework", "aria-label": "Điểm Framework", oninput: e => { c.item = e.target.value; touch(); } }),
        h("button", { class: "btn link small", type: "button", title: "Bỏ điểm này", "aria-label": "Bỏ điểm này", onclick: () => { S.checklist.splice(i, 1); rerender(); } }, "×")),
      h("input", { placeholder: c.ok === false ? "sai ở đâu (bắt buộc)" : c.ok === "minor" ? "chỉnh gì (bắt buộc)" : "ghi chú", value: c.note, oninput: e => { c.note = e.target.value; touch(); } }))),
    h("div", { class: "row" },
      h("button", { class: "btn small", type: "button", onclick: () => { S.checklist.push({ item: "", ok: null, note: "" }); rerender(); setTimeout(() => { const all = document.querySelectorAll(".check-item .item-text"); if (all.length) all[all.length - 1].focus(); }); } }, "+ Thêm điểm"),
      h("button", { class: "btn small", type: "button", title: "Bài sau của tuần này sẽ bắt đầu với danh sách này (lưu trong Chrome của anh)", onclick: async () => {
        const items = S.checklist.map(c => c.item.trim()).filter(Boolean);
        const checklists = { ...(SETTINGS.checklists || {}), [S.meta.week]: items };
        SETTINGS = { ...SETTINGS, checklists }; await setSettings({ checklists }); rerender();
      } }, `Lưu làm mặc định cho Week ${S.meta.week}`),
      ((SETTINGS.checklists || {})[S.meta.week] || []).length ? h("button", { class: "btn link small", type: "button", title: "Bài sau dùng lại danh sách gốc của khoá học", onclick: async () => {
        const checklists = { ...(SETTINGS.checklists || {}) }; delete checklists[S.meta.week];
        SETTINGS = { ...SETTINGS, checklists }; await setSettings({ checklists }); rerender();
      } }, "Bỏ mặc định đã lưu") : null),
    w.task === 1 ? h("p", { class: "small muted" }, "Số liệu sai thì ghi vào ghi chú, vd: “56% là năm 2010 không phải 2000; thiếu năm 2000 của swimming”. Claude lấy đúng số từ biểu đồ.") : null,
    trcc.length ? h("details", {}, h("summary", {}, `Nhận xét của anh ở phần Lập luận và Mạch lạc (${trcc.length})`),
      h("div", { class: "crows static" }, trcc.map(t => h("div", { class: "crow" }, t.quote ? h("div", { class: "crow-text", lang: "en" }, t.quote) : null, h("div", { class: "crow-comment" }, t.comment))))) : null);
  const FIX_TYPES = [["replace", "Đổi hướng", "ý đi sai hướng: em thấy chuỗi ý mới thay cho chuỗi cũ"], ["link", "Sửa mắt xích", "một bước sai, phần trước vẫn đúng"], ["missing", "Thiếu bước", "chuỗi đúng nhưng chưa đi tới nơi, hoặc hở một bước"]];
  const ideas = hasIdeas() ? h("div", { class: "card" },
    h("h2", {}, curWeek().kind === "paragraph+paraphrase" ? "Exercise 1 · các ý" : "Các ý"),
    h("p", { class: "muted small" }, "Chạm vào câu nêu ý để gắn Ý 1, Ý 2… (các câu sau nó trong đoạn tự thuộc ý đó; gắn cả mấy câu cùng một Ý cũng được). Rồi chấm từng ý: ✓ ổn · ~ nâng cấp thêm · ✗ cần sửa. Nhận xét anh đã viết trong CRM ở các câu của ý được điền sẵn."),
    h("div", { class: "palette" }, IDEA_TAGS().map(([id, label]) => h("button", { class: "btn small", type: "button", "aria-pressed": String(activeIdea === id), onclick: () => { activeIdea = id; renderLogic(); } }, label))),
    h("div", { class: "essay" }, essayView({ onClick: sid => { S.tags[sid] = S.tags[sid] === activeIdea ? undefined : activeIdea; rerender(); } })),
    ideasFromTags().map(x => {
      const st = ideaState(x), crm = ideaCrm(x), first = findSent(x.sids[0]);
      return h("div", { class: "idea-row" },
        h("div", { class: "check-row" },
          triRow([["ok", "✓"], ["improve", "~"], ["fix", "✗"]], st.status, v => { st.status = v || "ok"; rerender(); }),
          h("div", {}, h("b", {}, x.tag + " · "), h("span", { lang: "en" }, first ? sentText(first, "orig") : ""),
            x.sids.length > 1 ? h("span", { class: "muted small" }, ` (+${x.sids.length - 1} câu phát triển)`) : null),
          h("span")),
        st.status === "fix" ? h("div", { class: "fix-types", role: "group", "aria-label": "Cách sửa" }, h("span", { class: "small muted" }, "Cách sửa:"),
          FIX_TYPES.map(([v, l, tip]) => h("button", { type: "button", title: tip, "aria-pressed": String(st.fixType === v), onclick: () => { st.fixType = v; rerender(); } }, l))) : null,
        crm.length ? h("div", { class: "crm-notes" }, crm.map(c => h("label", { class: "inline crm-note" },
          h("input", { type: "checkbox", checked: !(st.off || []).includes(c.ref), onchange: e => {
            st.off = (st.off || []).filter(r => r !== c.ref); if (!e.target.checked) st.off.push(c.ref); rerender(); } }),
          h("span", {}, h("span", { class: "small muted" }, "CRM: "), c.text)))) : null,
        h("textarea", { class: "idea-note", rows: 2, placeholder: st.status === "ok" ? "ghi chú thêm (không bắt buộc)" : st.status === "fix" ? (crm.length ? "thêm ghi chú (không bắt buộc)" : "sai ở đâu, nên đi tiếp thế nào (bắt buộc)") : "nên thêm gì",
          value: st.note, oninput: e => { st.note = e.target.value; touch(); } }));
    })) : null;
  const topics = w.kind === "paragraph+paraphrase" ? h("div", { class: "card" }, h("h2", {}, "Exercise 2 · Paraphrase"),
    h("p", { class: "muted small" }, "✓ hay ✗ cho từng topic; topic ✗ thì ghi chú cái sai (và câu sửa nếu có)."),
    topicSents().map((s, i) => {
      const st = D.topics[s.id] || (D.topics[s.id] = { ok: true, note: "" });
      return h("div", { class: "check-row" },
        triRow([["yes", "✓"], ["no", "✗"]], st.ok === false ? "no" : "yes", v => { st.ok = v !== "no"; rerender(); }),
        h("div", { lang: "en" }, sentText(s, "orig").slice(0, 120)),
        h("input", { placeholder: st.ok === false ? "sai ở đâu" : "ghi chú", value: st.note, oninput: e => { st.note = e.target.value; touch(); } }));
    })) : null;
  $("#main").replaceChildren(h("div", { class: "panel" }, checklist, ideas, topics,
    h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => go("language") }, "Tiếp: Language"))));
}

/* ---------- 3. Language ---------- */
const TAB_NAMES = { LR: "Từ vựng", GRA: "Ngữ pháp", LOGIC: "Logic" };
// [value, label, what the student sees]
const SHOW = [["list", "Danh sách", "Em xem trong danh sách \"N lỗi khác\" (không bắt buộc), kèm nhận xét của anh"],
  ["praise", "Khen", "Hiện trong \"Cụm em đã dùng tốt\", tô xanh, kèm lời khen của anh"], ["hide", "Ẩn", "Không hiện cho em ở đâu cả (vd: anh lỡ đánh dấu trong CRM)"]];
const SHOW_LOGIC = [["teach", "Hiện ở Logic", "Một màn riêng trong phần Logic, theo thứ tự trong bài"], ["hide", "Ẩn", "Không hiện cho em"]];
/* moving a comment to the correction it belongs to: drag it there (only in the lesson: the CRM is never touched) */
/* origin: whose CRM comment is dragged; to: where it is dropped (back home = not moved) */
function moveComment(origin, to) {
  if (!origin || !to || commentLoc(origin) === to) return;
  const D = d2();
  D.commentAt = D.commentAt || {};
  if (D.comments) { delete D.comments[commentLoc(origin)]; delete D.comments[to]; }
  if (origin === to) delete D.commentAt[origin]; else D.commentAt[origin] = to;
  touch(); renderLanguage();
}
/* every comment that left this item or came to it goes back where the CRM has it */
function resetComments(ref) {
  const D = d2(), at = D.commentAt || {};
  for (const o of Object.keys(at)) if (o === ref || at[o] === ref) delete at[o];
  if (D.comments) delete D.comments[ref];
  touch(); renderLanguage();
}
function itemRow(it) {
  const D = d2(), st = itemState(it), mode = modeOf(it), comment = commentOf(it.ref), logic = st.tab === "LOGIC";
  const shown = it.ref[0] === "c" ? corrRow(it.ref, { drag: false, comment }) : pointRow({ ...pointOfNote({ ...it.note, comment }), nid: it.ref }, { path: "" });
  const cEl = shown.querySelector(".crow-comment");
  if (cEl && comment.trim() && (d2().comments || {})[it.ref] == null) {
    // one draggable piece per CRM comment, so each one moves on its own
    cEl.replaceChildren(...commentPieces(it.ref).map(p => {
      const piece = h("span", { class: "drag-comment", draggable: "true", title: p.origin === it.ref ? "Kéo nhận xét này thả vào chỗ sửa khác" : "Nhận xét chuyển từ chỗ khác: kéo về chỗ cũ hoặc chỗ khác" }, p.text);
      piece.addEventListener("dragstart", e => { e.stopPropagation(); e.dataTransfer.setData("text/x-comment", p.origin); });
      return piece;
    }));
  }
  const names = logic ? [] : sysNames(st.tab), L = logic ? { none: true } : D.lang[st.tab];
  const sys = sysOf(it), inSys = inSystemic(it);
  const opts = logic ? SHOW_LOGIC : SHOW;
  return h("div", { class: "lang-item" + (mode === "hide" ? " skipped" : "") + (inSys ? " sys-" + sys : ""), "data-ref": it.ref,
    ondragover: e => { if ([...e.dataTransfer.types].includes("text/x-comment")) { e.preventDefault(); e.currentTarget.classList.add("drop-on"); } },
    ondragleave: e => e.currentTarget.classList.remove("drop-on"),
    ondrop: e => { e.preventDefault(); e.currentTarget.classList.remove("drop-on"); moveComment(e.dataTransfer.getData("text/x-comment"), it.ref); } },
    shown,
    it.note && usedInIdea(it.ref) ? h("div", { class: "small muted" }, "Nhận xét này đã nằm trong ghi chú của một ý ở bước Logic.") : null,
    h("div", { class: "row" },
      !logic && !L.none && names.some(n => n.trim()) && mode === "list" ? h("div", { class: "sys-chips", role: "group", "aria-label": "Thuộc lỗi hệ thống" },
        h("span", { class: "small muted" }, "Lỗi hệ thống:"),
        names.map((n, k) => n.trim() ? h("button", { type: "button", class: "sys-chip c" + k, title: n.trim(), "aria-pressed": String(inSys && sys === k),
          onclick: () => { st.sys = inSys && sys === k ? null : k; touch(); renderLanguage(); } }, `${k + 1} · ${n.trim().length > 22 ? n.trim().slice(0, 21) + "…" : n.trim()}`) : null)) : null,
      h("div", { class: "modes", role: "group", "aria-label": "Em xem ở đâu" }, opts.map(([v, l, tip]) =>
        h("button", { type: "button", title: tip, "aria-pressed": String(mode === v && !(v === "list" && inSys)), onclick: () => { st.mode = v; if (v !== "list") st.sys = null; touch(); renderLanguage(); } }, l))),
      !logic && mode === "list" ? h("label", { class: "inline", title: "Chữ của em không sai, anh gợi ý cách nói hay hơn: không gạch đi" },
        h("input", { type: "checkbox", checked: isUpgrade(it), onchange: e => { st.up = e.target.checked; touch(); renderLanguage(); } }), "⬆ Nâng cấp") : null,
      h("select", { class: "small", "aria-label": "Phần", onchange: e => { st.tab = e.target.value; st.sys = null; st.mode = null; touch(); renderLanguage(); } },
        Object.entries(TAB_NAMES).map(([v, l]) => h("option", { value: v, selected: st.tab === v ? true : null }, "Phần: " + l))),
      commentMoved(it.ref) ? h("button", { class: "btn link small", type: "button", onclick: () => resetComments(it.ref) }, "Trả nhận xét như CRM") : null));
}
/* Claude's suggested systematic mistakes for a tab: one click puts the names in and the chips on; the
   teacher then changes anything (it is only a starting point) */
function suggestCard(t, mine) {
  const G = S.suggest;
  if (!G) return null;
  if (G.status === "running") return h("p", { class: "small muted suggest-wait" }, "Claude đang gợi ý lỗi hệ thống…");
  if (G.status === "failed") return h("p", { class: "small muted" }, "Không gợi ý được lỗi hệ thống (" + G.message + "). ",
    h("button", { class: "btn link small", type: "button", onclick: () => { S.suggest = null; startSuggest(); renderLanguage(); } }, "Thử lại"));
  const here = new Set(mine.map(it => it.ref));
  const groups = (G[t] || []).map(g => ({ ...g, refs: g.refs.filter(r => here.has(r)) })).filter(g => g.refs.length >= 2);
  if (!groups.length || (G.used || {})[t] || (G.dismissed || {})[t]) return null;
  const label = ref => { const it = mine.find(x => x.ref === ref); if (!it) return ref;
    if (ref[0] === "c") { const c = S.page.corrections[ref]; return `${c.orig.trim() || "+"} → ${c.fix.trim() || "(bỏ)"}`; }
    return (it.note.quote || it.note.added || it.comment || ref).slice(0, 40); };
  const use = () => {
    const D = d2(), L = D.lang[t];
    L.none = false; L.names = groups.map(g => g.name);
    for (const it of mine) {
      const st = itemState(it), k = groups.findIndex(g => g.refs.includes(it.ref));
      if (k >= 0 && modeOf(it) === "list") st.sys = k; else if (k < 0 && st.sys != null) st.sys = null;
    }
    S.suggest = { ...G, used: { ...(G.used || {}), [t]: true } };
    logEvent("suggest", { tab: t, used: true, groups: groups.length });
    touch(); renderLanguage();
  };
  return h("div", { class: "suggest" },
    h("div", { class: "row" }, h("b", {}, "Claude gợi ý"), h("span", { class: "small muted" }, " · chưa dùng cho tới khi anh bấm “Dùng gợi ý”; dùng rồi vẫn sửa được")),
    groups.map((g, k) => h("div", { class: "suggest-group" }, h("span", { class: "sys-chip c" + k }, String(k + 1)), h("b", {}, g.name), h("span", { class: "small muted" }, ` · ${g.refs.length} chỗ: `),
      h("span", { class: "small" }, g.refs.map(label).join(" · ")))),
    h("div", { class: "row" },
      h("button", { class: "btn small primary", type: "button", onclick: use }, "Dùng gợi ý"),
      h("button", { class: "btn link small", type: "button", onclick: () => { S.suggest = { ...G, dismissed: { ...(G.dismissed || {}), [t]: true } }; logEvent("suggest", { tab: t, used: false }); touch(); renderLanguage(); } }, "Bỏ qua")));
}
function renderLanguage() {
  const D = d2(), items = langItems();
  const sect = t => {
    const L = D.lang[t], names = sysNames(t), mine = items.filter(it => itemState(it).tab === t), band = S.page.scores && S.page.scores[t === "LR" ? "LR" : "GR"];
    return h("div", { class: "card" },
      h("h2", {}, t === "LR" ? "Từ vựng" : "Ngữ pháp", band ? h("span", { class: "muted small" }, ` · band ${band}`) : null),
      h("div", { class: "sys" },
        h("div", { class: "sys-names" }, h("b", {}, "Lỗi hệ thống"), h("span", { class: "small muted" }, " (lặp lại nhiều lần, cần dạy kỹ: mỗi lỗi một bài nhỏ + bài luyện)"),
          names.map((n, k) => h("div", { class: "row sys-name" }, h("span", { class: "sys-chip c" + k, "aria-hidden": "true" }, String(k + 1)),
            h("input", { value: n, placeholder: t === "LR" ? "vd: chọn từ chưa sát nghĩa đề" : "vd: động từ sau should / to / help", disabled: L.none ? true : null,
              oninput: e => { names[k] = e.target.value; touch(); }, onchange: () => renderLanguage() }),
            names.length > 1 ? h("button", { class: "btn link small", type: "button", title: "Bỏ lỗi này", onclick: () => {
              names.splice(k, 1); mine.forEach(it => { const s0 = sysOf(it); const st = itemState(it); if (s0 === k) st.sys = null; else if (s0 != null && s0 > k) st.sys = s0 - 1; }); touch(); renderLanguage(); } }, "×") : null)),
          !L.none && names.length < SYS_MAX ? h("button", { class: "btn small", type: "button", onclick: () => { names.push(""); touch(); renderLanguage(); } }, "+ Thêm lỗi hệ thống") : null),
        h("label", { class: "inline" }, h("input", { type: "checkbox", checked: L.none, onchange: e => { L.none = e.target.checked; touch(); renderLanguage(); } }), "Không có lỗi hệ thống")),
      suggestCard(t, mine),
      mine.length ? mine.map(it => itemRow(it)) : h("p", { class: "muted small" }, "Không có chỗ sửa nào ở phần này."));
  };
  const logicItems = items.filter(it => itemState(it).tab === "LOGIC");
  $("#main").replaceChildren(h("div", { class: "panel" },
    h("div", { class: "card" }, h("h1", {}, "Language"),
      h("p", { class: "muted" }, "Mỗi lỗi hệ thống thành một bài nhỏ em phải học (câu hỏi, bảng, quy tắc, bài luyện). Bấm chip ", h("b", {}, "1 · 2 · 3"),
        " ở chỗ sửa để xếp nó vào lỗi hệ thống. Các chỗ sửa còn lại vào ", h("b", {}, "danh sách \"N lỗi khác\""), " (em xem nếu muốn, kèm nhận xét của anh). ",
        h("b", {}, "Khen"), ": hiện trong \"Cụm em đã dùng tốt\". ", h("b", {}, "Ẩn"), ": không hiện. ", h("b", {}, "⬆ Nâng cấp"), ": chữ của em không sai, chỉ có cách nói hay hơn (không gạch đi). ",
        "Kéo một nhận xét thả vào chỗ sửa khác để chuyển nó sang đó.")),
    sect("LR"), sect("GRA"),
    logicItems.length ? h("div", { class: "card" }, h("h2", {}, "Hiện ở phần Logic"),
      h("p", { class: "muted small" }, "Nhận xét về ý và lập luận (thường là \"=> COMMENT\"): em xem ở phần Logic, theo thứ tự trong bài."),
      logicItems.map(it => itemRow(it))) : null,
    h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => go("rewrite") }, "Tiếp: Viết lại"))));
}

/* ---------- 4. Viết lại ---------- */
function renderRewrite() {
  const rt = S.rewriteTarget || (S.rewriteTarget = { target: targetsFor()[0][0], sids: [] });
  const order = allSents().map(s => s.id);
  $("#main").replaceChildren(h("div", { class: "panel" }, h("div", { class: "card" },
    h("h1", {}, "Viết lại"),
    h("label", { class: "inline" }, h("input", { type: "checkbox", checked: !!rt.none, onchange: e => { rt.none = e.target.checked; touch(); renderRewrite(); } }),
      "Không giao viết lại cho bài này (em học xong phần luyện tập là tới cuối bài)"),
    rt.none ? null : [
      h("p", { class: "muted" }, "Chạm vào đúng câu anh muốn em viết lại (một ý thì chỉ chọn câu của ý đó). Gợi ý và bài mẫu chỉ nói về những câu này."),
      field("Em viết lại", h("select", { onchange: e => { rt.target = e.target.value; touch(); } }, targetsFor().map(([v, l]) => h("option", { value: v, selected: rt.target === v ? true : null }, l)))),
      h("div", { class: "essay" }, essayView({ onClick: sid => {
        const l = rt.sids; l.includes(sid) ? l.splice(l.indexOf(sid), 1) : l.push(sid);
        l.sort((a, b) => order.indexOf(a) - order.indexOf(b)); touch(); renderRewrite();
      }, mark: sid => rt.sids.includes(sid) })),
      h("p", {}, rt.sids.length ? `Đã chọn ${rt.sids.length} câu.` : h("span", { class: "warn" }, "Chưa chọn câu nào."))],
    h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", onclick: () => go("draft") }, "Tiếp: Soạn")))));
}

/* ---------- 5. one Claude pass ---------- */
const draftWeek2 = () => { const w = curWeek(); return w.kind === "paragraph+paraphrase" ? w : { ...w, prompts: [{ label: w.essay_type, prompt: S.meta.prompt }] }; };
/* ---------- getting ahead while the teacher works ----------
   startSuggest: when the Logic step opens, a cheap call (Sonnet) groups the vocabulary and grammar fixes
   into recurring mistakes; the Language step offers them as "gợi ý" (nothing is used until the teacher
   takes it). startEarly: when the teacher leaves the Logic step with it complete, Claude drafts the Logic
   and ideas parts while the Language step is being done; Soạn then only drafts the rest */
function startSuggest() {
  if (!SETTINGS.apiKey || (S.suggest && S.suggest.status !== "failed")) return;
  const items = langItems().filter(it => itemState(it).tab !== "LOGIC").map(it => {
    const c = it.ref[0] === "c" ? S.page.corrections[it.ref] : null, n = c ? null : it.note || {};
    return { id: it.ref, tab: itemState(it).tab, her_words: c ? c.orig.trim() : n.quote || n.added || "", fix: c ? c.fix.trim() : n.fix || "", comment: commentOf(it.ref) };
  });
  if (items.filter(x => x.tab === "LR").length < 3 && items.filter(x => x.tab === "GRA").length < 3) { S.suggest = { status: "done", LR: [], GRA: [] }; return; }
  S.suggest = { status: "running" };
  suggestSystemic({ apiKey: SETTINGS.apiKey, items })
    .then(r => { S.suggest = { status: "done", ...r.suggestions }; addUsage(r.usage, r.model); })
    .catch(e => { S.suggest = { status: "failed", message: e.message || String(e) }; if (e.usage) addUsage(e.usage, e.model); })
    .finally(() => { touch(); if (S.step === "language") renderLanguage(); });
}
function startEarly() {
  if (!SETTINGS.apiKey || S.lesson || drafting || earlyDraft) return;
  if (blockers2().some(([step]) => step === "logic")) return;
  const D = decisions2(), list = ["logic", ...(D.ideas.length ? ["ideas"] : [])].filter(p => !partFresh(p, D));
  if (!list.length) return;
  earlyDraft = draftLesson2({ apiKey: SETTINGS.apiKey, week: draftWeek2(), teacher: SETTINGS.teacher, input: { page: pageFor2(), meta: S.meta, decisions: D }, list, done: {}, noStrict: SETTINGS.noStrict2 || [] })
    .then(r => {
      S.partial = S.partial || {}; S.partSig = S.partSig || {};
      for (const p of list) if (r.parts[p]) { S.partial[p] = r.parts[p]; S.partSig[p] = sigOf(p, D); }
      addUsage(r.usage, r.model); touch();
    })
    .catch(e => console.warn("soạn trước:", e))
    .finally(() => { earlyDraft = null; });
}

/* ---------- what each drafted part was written from ----------
   Claude's parts are kept with the lesson (S.partial), each with a fingerprint of the decisions it was
   drafted from (S.partSig). A change the page can follow by itself (Danh sách / Khen / Ẩn, which fixes
   are in a systematic mistake, moved comments, no rewrite) is applied at once (syncLesson); a change
   Claude has to write about makes only that part stale, and "Soạn lại N phần" redrafts just those */
const SIGS = {
  logic: D => [D.checklist.map(c => [c.item, c.status, c.note]), D.topics],
  ideas: D => D.ideas,
  language: () => 0,
  systemic: D => D.language.systemic.map(x => [x.tab, x.name]),
  practice: D => D.language.systemic.map(x => [x.tab, x.name]),
  frame: D => [D.rewrite && D.rewrite.target, D.rewrite && D.rewrite.sids],
};
const sigOf = (part, D) => JSON.stringify((SIGS[part === "frame_nr" ? "frame" : part] || (() => 0))(D));
/* the parts this lesson needs now; a frame drafted with a rewrite also serves a lesson without one */
const neededParts = D => partsFor2(D).map(p => p === "frame_nr" && (S.partial || {}).frame && !(S.partial || {}).frame_nr ? "frame" : p);
function partFresh(part, D) {
  const P = S.partial || {}, sig = S.partSig || {};
  if (!P[part]) return false;
  if (part === "frame" && D.no_rewrite) return true;
  return sig[part] === sigOf(part, D);
}
const staleParts = D => neededParts(D).filter(p => !partFresh(p, D));
const lessonCtx = D => ({ page: pageFor2(), meta: { ...S.meta, word_target: curWeek().task === 1 ? 150 : 250 }, teacher: SETTINGS.teacher, zalo: SETTINGS.zalo, week: draftWeek2(), decisions: D });
// the lesson roots each part writes
const ROOTS = { logic: ["logic"], ideas: ["ideas"], language: ["language.phrases"], systemic: ["mistakes"], practice: ["practice"],
  frame: ["hello", "results", "rewrite", "finish"], frame_nr: ["hello", "results", "rewrite", "finish"] };
const getAt = (o, path) => path.split(".").reduce((x, k) => x == null ? x : x[k], o);
function setAt(o, path, v) { const ks = path.split("."), last = ks.pop(); const t = ks.reduce((x, k) => x[k] = x[k] || {}, o); if (v === undefined) delete t[last]; else t[last] = v; }
/* the teacher's lesson (with the edits made in Xem lại) + a fresh build from the parts and today's decisions:
   what the decisions say comes from the fresh build, the redrafted parts come from it whole, the rest stays */
function mergeLesson(old, fresh, redrafted, D) {
  const out = structuredClone(old);
  for (const k of ["corrections", "task_comments", "essay", "scores"]) out[k] = fresh[k];
  out.language = { ...out.language, praise: fresh.language.praise, list: fresh.language.list, items: fresh.language.items };
  // the checklist: status from the decisions; the lines stay the teacher's unless the points changed
  if (out.logic && fresh.logic) {
    if (out.logic.points.length === fresh.logic.points.length) out.logic.points = out.logic.points.map((p, i) => ({ ...p, ok: fresh.logic.points[i].ok, status: fresh.logic.points[i].status }));
    else out.logic.points = fresh.logic.points;
  }
  // the systematic mistakes: which fixes are in each comes from the decisions; Claude's teaching stays
  const fm = fresh.mistakes.main, om = out.mistakes.main;
  if (!fm.length) { out.mistakes.main = []; out.practice = null; }
  else if (fm.length === om.length && fm.every((m, i) => m.tab === om[i].tab)) out.mistakes.main = om.map((m, i) => {
    const own = new Set([...fm[i].cids, ...fm[i].points.map(p => p.nid)]);
    return { ...m, cids: fm[i].cids, points: fm[i].points, ...(m.patterns ? { patterns: m.patterns.map(x => ({ ...x, refs: x.refs.filter(r => own.has(r)) })) } : {}) };
  });
  else out.mistakes = fresh.mistakes;
  out.mistakes.total = fresh.mistakes.total;
  if (!fresh.ideas) delete out.ideas;
  for (const part of redrafted) for (const root of ROOTS[part] || []) setAt(out, root, structuredClone(getAt(fresh, root)));
  if (redrafted.some(p => p === "frame" || p === "frame_nr") && old.finish) out.finish.quote = old.finish.quote;
  // the rewrite: none when the teacher gave none; back from the drafted frame when given again
  if (D.no_rewrite) out.rewrite = null;
  else if (!out.rewrite && fresh.rewrite) out.rewrite = fresh.rewrite;
  return out;
}
/* apply what the decisions say to the drafted lesson (no Claude call) */
function syncLesson() {
  if (!isFlow2() || !S.lesson || !Object.keys(S.partial || {}).length) return;
  try {
    const D = decisions2();
    const P = { ...S.partial };
    S.lesson = mergeLesson(S.lesson, toLesson2(P, lessonCtx(D)), [], D);
  } catch (e) { console.warn("sync:", e); }
}
/* "N phần cần soạn lại": a notice with the button, for Soạn, Xem lại and Xuất */
function staleNotice() {
  if (!isFlow2() || !S.lesson || !Object.keys(S.partial || {}).length) return null;
  const st = staleParts(decisions2());
  if (!st.length) return null;
  return h("div", { class: "notice" }, `Anh đã đổi quyết định sau khi soạn: ${st.map(p => PARTS2[p].label).join(", ")} cần Claude viết lại (những phần khác giữ nguyên, kể cả chỗ anh đã sửa). `,
    h("button", { class: "btn small primary", type: "button", disabled: drafting ? true : null, onclick: () => go("draft") }, `Soạn lại ${st.length} phần`));
}

function renderDraft2() {
  const D = decisions2(), block = blockers2(), hasKey = !!SETTINGS.apiKey;
  const n = { systemic: 0, list: 0, praise: 0, hide: 0, teach: 0 };
  D.language.items.forEach(i => { n[i.mode] = (n[i.mode] || 0) + 1; });
  const status = h("div", { id: "draftStatus" });
  const stale = staleParts(D), have = neededParts(D).filter(p => partFresh(p, D));
  const legacy = S.lesson && !Object.keys(S.partial || {}).length;           // drafted before parts were kept
  const label = !S.lesson ? (have.length ? `Soạn ${stale.length} phần còn lại` : "Soạn") : legacy ? "Soạn lại" : stale.length ? `Soạn lại ${stale.length} phần` : null;
  $("#main").replaceChildren(h("div", { class: "panel" }, h("div", { class: "card" },
    h("h1", {}, "Soạn với Claude"),
    h("p", {}, "Claude chỉ viết lời của Đậu quanh quyết định của anh: tổng kết Logic, từng chỗ cần sửa, câu hỏi Socratic, cụm em dùng tốt, bài giảng lỗi hệ thống (nếu có), phần viết lại (nếu anh giao), lời chào và kết thúc. Nhận xét và chỗ sửa vẫn là chữ của anh."),
    h("ul", {},
      h("li", {}, `Logic: ${D.checklist.filter(c => c.status === "ok").length} ✓, ${D.checklist.filter(c => c.status === "minor").length} ~, ${D.checklist.filter(c => c.status === "fix").length} ✗` +
        (D.ideas.length ? ` · ${D.ideas.length} ý (${D.ideas.filter(x => x.status === "fix").length} ✗, ${D.ideas.filter(x => x.status === "improve").length} ~)` : "") +
        (D.topics.length ? ` · ${D.topics.filter(x => !x.ok).length}/${D.topics.length} topic ✗` : "")),
      h("li", {}, `Language: ${n.systemic} chỗ trong lỗi hệ thống, ${n.list} trong danh sách, ${n.praise} khen, ${n.hide} ẩn` + (n.teach ? `, ${n.teach} hiện ở Logic` : "") + " · " +
        (D.language.systemic.length ? "lỗi hệ thống: " + D.language.systemic.map(x => x.name).join(", ") : "không có lỗi hệ thống")),
      h("li", {}, D.no_rewrite ? "Viết lại: không giao" : D.rewrite ? `Viết lại: ${D.rewrite.sids.length} câu (${D.rewrite.sids.join(", ")})` : "Viết lại: chưa chọn")),
    block.length ? h("div", { class: "notice bad blockers" }, h("b", {}, "Còn thiếu:"), h("ul", { class: "problems" }, block.map(([step, msg]) =>
      h("li", {}, h("button", { class: "btn link", type: "button", onclick: () => go(step) }, msg))))) : null,
    !hasKey ? h("div", { class: "notice bad" }, "Chưa có Claude API key. ", h("a", { href: "options.html", target: "_blank" }, "Mở Cài đặt"), " rồi quay lại đây.") : null,
    !S.lesson && have.length ? h("div", { class: "notice good" }, `Đã soạn sẵn: ${have.map(p => PARTS2[p].label).join(", ")}. Claude chỉ soạn phần còn lại.`) : null,
    S.lesson && !legacy ? h("div", { class: "notice" }, stale.length
      ? `Anh đã đổi quyết định sau khi soạn: ${stale.map(p => PARTS2[p].label).join(", ")} cần Claude viết lại. Những phần khác giữ nguyên, kể cả chỗ anh đã sửa ở Xem lại.`
      : "Bài này đã có bản soạn, khớp với mọi quyết định của anh (đổi Danh sách / Khen / Ẩn, lỗi hệ thống, nhận xét kéo sang chỗ khác thì bài tự cập nhật).") : null,
    legacy ? h("div", { class: "notice" }, "Bài này đã có bản soạn. Soạn lại sẽ thay bản cũ (những chỗ anh đã sửa cũng mất).") : null,
    h("p", { class: "small muted" }, `Model ${MODEL}, ${neededParts(D).length} phần nhỏ: phần đầu chạy trước để lưu phần hướng dẫn và bài của em vào cache, các phần còn lại đọc lại từ cache (rẻ hơn) và chạy cùng lúc. Thường dưới 1 phút.`),
    S.usage ? h("p", { class: "small muted" }, usageLine(S.usage)) : null,
    h("div", { class: "row" },
      label ? h("button", { class: "btn primary", id: "draftBtn", type: "button", disabled: !hasKey || block.length || drafting ? true : null, onclick: () => runDraft2({ restart: legacy }) }, label) : null,
      S.lesson ? h("button", { class: "btn", type: "button", onclick: () => go("edit") }, "Tới phần xem lại") : null,
      S.lesson && !legacy ? h("button", { class: "btn link", type: "button", disabled: !hasKey || block.length || drafting ? true : null, onclick: () => runDraft2({ restart: true }) }, "Soạn lại toàn bộ") : null),
    status)));
  if (earlyDraft) waitEarly();
}
/* while the early draft (Logic, ideas) is still running, say so */
function waitEarly() {
  const status = $("#draftStatus");
  if (status && earlyDraft) status.replaceChildren(h("p", { class: "small muted" }, "Claude đang soạn trước phần Logic…"));
  earlyDraft.finally(() => { if (S.step === "draft" && !drafting) renderDraft2(); });
}
let earlyDraft = null;
/* every Claude call for this lesson adds up here: the drafts (Opus) and the suggestions (Sonnet), each priced
   at its own rate in usageLine */
function addUsage(u, model) {
  if (!u) return;
  const keys = ["input_tokens", "output_tokens", "cache_read_input_tokens", "cache_creation_input_tokens"];
  const sum = structuredClone(S.usage || { model: MODEL });
  const bucket = !model || model === MODEL || /opus/.test(model) ? sum : ((sum.other = sum.other || {})[model] = (sum.other || {})[model] || {});
  for (const k of keys) bucket[k] = (bucket[k] || 0) + (u[k] || 0);
  S.usage = sum;
}
/* draft the parts that are missing or stale (restart: all of them, from scratch) */
async function runDraft2({ restart = false } = {}) {
  if (drafting) return;
  if (restart) {
    if (S.lesson && !confirm("Soạn lại toàn bộ sẽ thay bản soạn cũ (những chỗ anh đã sửa cũng mất). Tiếp tục?")) return;
  }
  const ctrl = new AbortController();
  drafting = ctrl; renderSteps();
  const btn = $("#draftBtn"); if (btn) btn.disabled = true;
  const status = $("#draftStatus");
  if (earlyDraft) { status.replaceChildren(h("p", {}, "Đợi phần Logic Claude đang soạn trước…")); await earlyDraft.catch(() => {}); }
  if (restart) { S.partial = {}; S.partSig = {}; }
  const D = decisions2(), list = neededParts(D);
  const todo = staleParts(D);
  const done = Object.fromEntries(list.filter(p => partFresh(p, D)).map(p => [p, S.partial[p]]));
  const bar = h("progress", { max: String(6000 * Math.max(1, todo.length)), value: "0", style: "width:100%" });
  status.replaceChildren(h("p", {}, `Claude đang soạn ${todo.map(p => PARTS2[p].label).join(", ")}…`), bar, h("p", { class: "small muted", id: "draftChars" }, ""));
  let result;
  try {
    result = await draftLesson2({
      apiKey: SETTINGS.apiKey, week: draftWeek2(), teacher: SETTINGS.teacher,
      input: { page: pageFor2(), meta: S.meta, decisions: D }, list,
      onProgress: n => { bar.value = Math.min(n, +bar.max - 300); const el = $("#draftChars"); if (el) el.textContent = `${n.toLocaleString("vi-VN")} ký tự`; },
      signal: ctrl.signal, done, noStrict: SETTINGS.noStrict2 || [],
    });
  } catch (e) {
    result = { parts: { ...(S.partial || {}), ...done }, failed: [{ label: "Bản soạn", message: e.message || String(e) }] };
  }
  drafting = null;
  S.partSig = S.partSig || {};
  for (const p of todo) if (result.parts[p] && result.parts[p] !== (S.partial || {})[p]) S.partSig[p] = sigOf(p, D);
  S.partial = { ...(S.partial || {}), ...result.parts };
  if (result.noStrict && result.noStrict.join() !== (SETTINGS.noStrict2 || []).join()) {
    SETTINGS = { ...SETTINGS, noStrict2: result.noStrict };
    setSettings({ noStrict2: result.noStrict });
  }
  addUsage(result.usage, result.model);
  touch();
  if (result.failed.length) {
    renderSteps();
    const ok = list.filter(p => partFresh(p, D)).map(p => PARTS2[p].label);
    const st = $("#draftStatus") || status;
    st.replaceChildren(h("div", { class: "notice bad" },
      h("b", {}, "Chưa soạn xong:"), h("ul", { class: "problems" }, result.failed.map(f => h("li", {}, h("b", {}, f.label + ": "), f.message))),
      ok.length ? h("p", { class: "small" }, "Đã xong: " + ok.join(", ") + ". Thử lại chỉ soạn phần còn thiếu (các phần đã xong được giữ, kể cả khi anh rời trang này).") : null),
      h("div", { class: "row" },
        h("button", { class: "btn primary", type: "button", onclick: () => runDraft2() }, "Thử lại phần lỗi"),
        h("button", { class: "btn", type: "button", onclick: () => runDraft2({ restart: true }) }, "Bỏ, soạn lại từ đầu")));
    const b2 = $("#draftBtn"); if (b2) b2.disabled = false;
    return;
  }
  let fresh;
  try { fresh = toLesson2(S.partial, lessonCtx(D)); }
  catch (e) {
    for (const p of todo) { delete S.partial[p]; delete S.partSig[p]; }
    status.replaceChildren(h("div", { class: "notice bad" }, "Bản soạn của Claude thiếu thông tin (" + e.message + "). Soạn lại nha."),
      h("button", { class: "btn", type: "button", onclick: () => go("draft") }, "Soạn lại"));
    renderSteps(); return;
  }
  if (S.lesson && !restart) {
    // an update: only the redrafted parts are new; the teacher's edits elsewhere stay
    S.lesson = mergeLesson(S.lesson, fresh, todo, D);
    const roots = todo.flatMap(p => ROOTS[p] || []), under = k => roots.some(r => k === r || k.startsWith(r + "."));
    for (const k of Object.keys(S.ok || {})) if (under(k)) delete S.ok[k];
    for (const k of Object.keys(S.src || {})) if (under(k)) delete S.src[k];
    if (S.aiDraft) for (const r of roots) setAt(S.aiDraft, r, structuredClone(getAt(fresh, r)));
    logEvent("redraft", { parts: todo });
    touch(); go("edit"); return;
  }
  S.lesson = fresh;
  S.src = { "": "ai", flow: "teacher", scores: "page", word_count: "page", essay: "page", corrections: "page", task_comments: "page", student: "teacher", teacher: "teacher", zalo: "teacher",
    homework: "page", prompt: "teacher", essay_type: "page", overall: "page", word_target: "page", t1: "page", "logic.points": "teacher", "language.items": "teacher" };
  S.ok = {}; S.mod = "review";
  S.aiDraft = structuredClone(S.lesson); S.draftAt = Date.now();
  S.events = [{ t: 0, type: "checks", flags: checks2(S.lesson, { checkLesson }).map(f => f.msg.replace(/\d+/g, "N").slice(0, 80)) }];
  touch(); go("edit");
}

/* ---------- 6. read-through: only Claude's lines, by screen, with the phone preview ---------- */
// [id, label, approve roots, preview screen]
const MODULES2 = [
  ["review", "Kiểm tra", [], "intro"],
  ["logic", "Logic", ["logic"], "logic"],
  ["ideas", "Các ý", ["ideas"], "ideas-map"],
  ["language", "Language", ["language"], "language"],
  ["systemic", "Lỗi hệ thống", ["mistakes"], "lang-map"],
  ["practice", "Luyện tập", ["practice"], "practice"],
  ["rewrite", "Viết lại", ["rewrite"], "rewrite"],
  ["frame", "Chào & kết thúc", ["hello", "results", "finish"], "intro"],
];
const curModules = () => isFlow2() ? MODULES2.filter(([id]) => S.lesson && (id === "ideas" ? !!S.lesson.ideas : id === "systemic" ? S.lesson.mistakes.main.length > 0 : id === "practice" ? !!S.lesson.practice : id === "rewrite" ? !!S.lesson.rewrite : true))
  : visibleModules();
function refLabel(ref) {
  if (ref[0] === "c") { const c = S.lesson.corrections[ref]; return c ? `${c.orig.trim() || "…"} → ${c.fix.trim() || "(bỏ)"}` : ref; }
  const t = noteOf(ref); return t ? (t.quote || t.comment || ref).slice(0, 50) : ref;
}
function moduleForm2(id) {
  const L = S.lesson;
  const head = (title, note) => [h("h2", {}, title), note ? h("p", { class: "muted small" }, note) : null];
  switch (id) {
    case "review": {
      const fl = review().flags.filter(f => flagOpen(f));
      return [...head("Kiểm tra", "Claude chỉ viết lời của Đậu quanh quyết định của anh. Đây là những chỗ máy thấy chưa ổn; còn lại anh xem nhanh trên điện thoại bên phải, sửa chỗ nào thì chọn phần đó ở bên trái."), staleNotice(),
        fl.length ? h("ul", { class: "problems" }, fl.map(f => h("li", {}, f.msg, " ", f.path ? h("button", { class: "btn link small", type: "button", onclick: () => goTo(f.module, f.path) }, "Sửa") : null)))
          : h("div", { class: "notice good" }, "Không thấy gì cần sửa.")];
    }
    case "logic": return [...head("Logic", "Màn tổng kết (✓/✗ là của anh), rồi từng chỗ cần sửa, mỗi chỗ một màn."),
      fLines("logic.summary", "Đậu tổng kết"),
      // ✓ / ~ / ✗ is the teacher's tick at the Logic step (changing it there updates the lesson)
      cards("logic.points", p => `${p.status === "minor" ? "~" : p.ok ? "✓" : "✗"} ${p.line}`, p => [fLine(`${p}.line`, "Hiện cho em (ngắn)"),
        h("p", { class: "small muted" }, "Đạt / chỉnh nhẹ / chưa đạt: đổi ở bước Logic, bài tự cập nhật.")], { remove: false }),
      h("h3", {}, "Từng chỗ cần sửa"),
      cards("logic.issues", x => x.title || "(chưa có tên)", (p, x) => [
        h("div", { class: "grid2" }, fLine(`${p}.title`, "Tên", { voice: false }), fSids(`${p}.sids`, "Câu")),
        h("div", { class: "grid2" }, fLine(`${p}.part`, "Mình xét… (vd: câu thesis của em)", { voice: false }), fLine(`${p}.quote`, "Chữ của em (chép y nguyên)", { voice: false, en: true })),
        fLine(`${p}.prompt_focus`, "Chữ trong đề được tô (chép y nguyên, trống = không hiện đề)", { voice: false, en: true }),
        fLine(`${p}.rule`, "Luật Framework (trống = không hiện)"),
        x.ask ? [h("h3", {}, "Câu hỏi Socratic (trống = bỏ qua)"), fLine(`${p}.ask.q`, "Câu hỏi"), fLines(`${p}.ask.options`, "Lựa chọn"), fNumber(`${p}.ask.answer`, "Đáp án đúng (0 là lựa chọn đầu)"),
          h("div", { class: "grid2" }, fLine(`${p}.ask.right`, "Đậu nói khi em đúng"), fLine(`${p}.ask.wrong`, "Đậu nói khi em sai"))]
          : h("div", { class: "notice" }, "Chỗ này chưa có câu hỏi. ", h("button", { class: "btn small", type: "button", onclick: () => changed(`${p}.ask`, { q: "", options: ["", "", ""], answer: 0, right: "", wrong: "" }, { rerender: true }) }, "Thêm câu hỏi")),
        x.part ? fLines(`${p}.missing`, "Câu của em thiếu gì (Đậu nói, câu của em sáng lên)") : fLines(`${p}.say`, "Đậu nói"),
        fLine(`${p}.fix`, "Viết lại (Đậu: “" + S.lesson.teacher + " đề xuất em sửa lại như sau nhé”)", { voice: false, en: true, long: true }),
        x.fix ? [h("h3", {}, "Đậu giải thích từng chỗ đổi"),
          cards(`${p}.changes`, ch => `${ch.from || "+"} → ${ch.to || "(bỏ)"}`, q => [
            h("div", { class: "grid2" }, fLine(`${q}.from`, "Chữ của em (trống = thêm mới)", { voice: false, en: true }), fLine(`${q}.to`, "Chữ mới (trống = bỏ)", { voice: false, en: true })),
            fLine(`${q}.why`, "Đậu nói vì sao")], { add: () => ({ from: "", to: "", why: "" }) })] : null,
        L.t1 ? h("div", { class: "grid2" }, fLine(`${p}.series`, "Hàng trên biểu đồ", { voice: false }), fLine(`${p}.col`, "Cột", { voice: false })) : null,
      ], { add: () => ({ title: "", sids: [], quote: "", part: "", prompt_focus: "", rule: "", missing: [""], say: [], fix: "", series: "", col: "" }) })];
    case "ideas": return [...head("Các ý", "✓/~/✗ là của anh; ý ~ có một dòng gợi ý, ý ✗ có chuỗi ý."), fLines("ideas.intro", "Đậu nói"),
      L.ideas.paras ? fLines("ideas.paras", "Tổng quan bài: mỗi đoạn (không có ý) một dòng ngắn", { voice: false }) : null,
      cards("ideas.overview", o => `${o.tag} · ${o.text}`, p => [h("div", { class: "grid2" }, fLine(`${p}.text`, "Ý", { voice: false }), fLine(`${p}.short`, "Tên ngắn (trong tổng quan bài)", { voice: false })), fLine(`${p}.note`, "Ghi chú / gợi ý", { voice: false }), fStatus(p)], { remove: false }),
      h("h3", {}, "Ý cần sửa"), ideaDetailCards()];
    case "language": {
      // the lesson's own corrections and notes: with the comments where the teacher moved them
      const LN = L.language, row = ref => ref[0] === "c" ? corrRow(ref, { drag: false }) : pointRow({ ...pointOfNote(L.task_comments[+ref.slice(1) - 1] || noteOf(ref) || {}), nid: ref }, {});
      return [...head("Language", "Cụm em dùng tốt (và chỗ anh khen), rồi màn “Lỗi lớn nhất” với nút xem các lỗi khác, rồi bài giảng từng lỗi hệ thống. Lời nối giữa các phần do trang tự viết. Muốn đổi chỗ nào vào danh sách / khen / ẩn thì sửa ở bước Language bên trên."),
        LN.phrases ? [h("h3", {}, "Cụm em đã dùng tốt"), fLine("language.phrases.line", "Đậu khen"),
          cards("language.phrases.groups", g => g.label, p => [fLine(`${p}.label`, "Nhóm", { voice: false }),
            cards(`${p}.items`, x => x.text, q => h("div", { class: "grid2" }, fLine(`${q}.text`, "Cụm", { voice: false, en: true }), fSid(`${q}.sid`, "Câu")), { add: () => ({ text: "", sid: sidOptions()[0][0] }) })],
            { add: () => ({ label: "", items: [] }) })] : null,
        (LN.praise || []).length ? [h("h3", {}, `${L.teacher} khen (${LN.praise.length})`), h("div", { class: "crows static" }, LN.praise.map(row))] : null,
        (LN.list || []).length ? [h("h3", {}, `Danh sách “Xem ${LN.list.length} lỗi khác” (em xem nếu muốn, kèm nhận xét của anh)`), h("div", { class: "crows static" }, LN.list.map(it => row(it.ref)))] : null,
        (LN.items || []).length ? [h("h3", {}, `Nhận xét hiện ở Logic (${LN.items.length})`), h("div", { class: "crows static" }, LN.items.map(it => row(it.ref)))] : null];
    }
    case "systemic": return [...head("Lỗi hệ thống", "Mỗi lỗi anh đặt tên: em xem các chỗ sai, câu hỏi, rồi bảng (mỗi công thức một dòng, gắn với các chỗ sửa theo nó), quy tắc, ví dụ, và bài luyện."),
      cards("mistakes.main", g => g.title, (p, g) => {
        const refs = [...g.cids, ...(g.points || []).map(x => x.nid)];
        const loose = refs.filter(r => !(g.patterns || []).some(x => x.refs.includes(r)));
        return [
          fLine(`${p}.title`, "Tên", { voice: false }),
          h("div", { class: "crows static" }, g.cids.map(c => corrRow(c, { drag: false })), (g.points || []).map((pt, j) => pointRow(pt, { path: `${p}.points.${j}`, editable: true }))),
          fLine(`${p}.count_line`, "Đậu đếm lỗi ({n} = số chỗ, trang tự đếm)"), fLine(`${p}.ask.q`, "Câu hỏi (trống = bỏ qua)"), fLines(`${p}.ask.options`, "Lựa chọn"), fNumber(`${p}.ask.answer`, "Đáp án đúng (0 là lựa chọn đầu)"),
          fLine(`${p}.reason`, "Vì sao em hay sai"),
          g.patterns ? [h("h3", {}, "Bảng: mỗi công thức một dòng"),
            cards(`${p}.patterns`, x => x.formula || "(chưa có công thức)", (q, x) => [
              h("div", { class: "grid2" }, fLine(`${q}.formula`, "Công thức (một dòng, dưới 22 ký tự)", { voice: false, en: true }), fLine(`${q}.rule`, "Đậu nói quy tắc")),
              h("div", { class: "pat-refs" }, h("span", { class: "small muted" }, "Các chỗ theo công thức này:"),
                refs.map(r => h("button", { type: "button", class: "pat-ref", "aria-pressed": String(x.refs.includes(r)),
                  onclick: () => changed(`${q}.refs`, x.refs.includes(r) ? x.refs.filter(y => y !== r) : [...x.refs, r], { rerender: true }) }, refLabel(r)))),
            ], { add: () => ({ formula: "", rule: "", refs: [] }) }),
            loose.length ? h("div", { class: "notice" }, `${loose.length} chỗ chưa thuộc công thức nào: ${loose.map(refLabel).join(" · ")}. Thêm một dòng cho nó, hoặc gắn vào một công thức.`) : null]
          : [fLines(`${p}.board`, "Bảng (ngắn, dưới 22 ký tự)", { voice: false }), fLines(`${p}.rule`, "Quy tắc", { voice: false })],
          h("div", { class: "grid2" }, fLine(`${p}.example.bad`, "Ví dụ sai", { voice: false, en: true }), fLine(`${p}.example.good`, "Ví dụ đúng", { voice: false, en: true })),
        ];
      }, { remove: false })];
    case "practice": return practiceForm();
    case "rewrite": return [...head("Viết lại", "Đúng những câu anh đã chọn."),
      fSelect("rewrite.target", "Em viết lại", targetsFor()),
      fSids("rewrite.sids", "Câu em đã viết"), fLine("rewrite.label", "Nhãn", { voice: false }),
      fLines("rewrite.intro", "Đậu giới thiệu"), fLine("rewrite.task", "Đậu giao việc (có thể để trống)"),
      fLine("rewrite.flow", "Gợi ý 1: mạch ý (tiếng Anh, dùng →)", { voice: false, en: true, long: true }),
      fLines("rewrite.starters", "Gợi ý 2: câu mở đầu", { voice: false, en: true }), fLines("rewrite.phrases", "Gợi ý 3: từ hay", { voice: false, en: true }),
      fLines("rewrite.checklist", "Tự check"), fLine("rewrite.model", "Bài mẫu", { voice: false, en: true, long: true })];
    case "frame": return [...head("Chào & kết thúc"),
      fLine("student", "Tên Đậu gọi em", { voice: false }), fLines("hello", "Đậu chào"),
      Object.values(L.scores || {}).some(Boolean) ? [fLine("results.criteria", "Trước 4 tiêu chí"), fLines("results.score", "Về điểm")] : null,
      fLines("finish.takeaways", "Nhớ cho bài sau (3-4 dòng)", { voice: false }), fLines("finish.summary", "Cuối bài"),
      L.practice ? fLine("finish.extra_prompt", "Rủ luyện thêm ({n} = số câu)") : null,
      L.practice ? fLines("finish.later", "Nếu để lần sau") : null, fLines("finish.done", "Lời cuối"), quoteForm(),
      h("p", { class: "small muted" }, `Biểu tượng cảm xúc trong cả bài: ${emoticonCount()} (nên tối đa 3)`)];
  }
  return [];
}

boot();
