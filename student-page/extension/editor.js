/* Đậu's lesson editor: page -> framework tagging -> Claude draft -> edit with live preview -> export. */
import { extractPage } from "./lib/extract.js";
import { buildPage, checkLesson } from "./lib/build.js";
import { draftLesson, draftToLesson, mergeParts, PARTS, MODEL } from "./lib/draft.js";
import { getSettings, setSettings, takePage, saveDraft, loadDraft, listDrafts } from "./lib/store.js";
import { publishPage } from "./lib/netlify.js";
import { reviewUnits, checks, lint } from "./lib/review.js";

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
  checklist: [],          // [{ item, ok: true|false|null, note }]
  notes: "",
  rewriteTarget: null,    // { target, sids } or null (Claude chooses)
  lesson: null,
  src: {},                // path -> "ai" | "teacher" | "page"
  ok: {},                 // approved paths (a path approves everything under it)
  mod: "hello",
  usage: null,
};
let BUNDLE = null, SETTINGS = null, COURSE = null;

const STEPS = [["page", "1 · Bài"], ["framework", "2 · Framework"], ["draft", "3 · Nháp"], ["edit", "4 · Chỉnh sửa"], ["export", "5 · Xuất"]];
const TAGS = [["intro", "Mở bài"], ["ts1", "Câu chủ đề 1"], ["i1", "Ý 1"], ["i2", "Ý 2"], ["ts2", "Câu chủ đề 2"], ["i3", "Ý 3"], ["i4", "Ý 4"], ["concl", "Kết bài"]];

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
  if (!RV && S.lesson) RV = { units: reviewUnits(S.lesson, { checklist: S.checklist }), flags: checks(S.lesson, { prompt: S.lesson.prompt, checkLesson }) };
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
  for (const x of items) {
    if (x.kind === "unit") x.u.roots.forEach(r => { S.ok[r] = true; });
    else if (x.kind === "flag" && !x.f.fixOnly) S.ok[x.f.path] = true;
  }
  touch(); renderEdit();
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
const snapshot = () => ({ page: S.page, meta: S.meta, tags: S.tags, checklist: S.checklist, notes: S.notes, rewriteTarget: S.rewriteTarget, lesson: S.lesson, partial: S.partial, src: S.src, ok: S.ok, usage: S.usage, step: S.step });
function restore(snap) { Object.assign(S, snap); }

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
  S.key = key; S.page = page; S.lesson = null; S.partial = {}; S.src = {}; S.ok = {}; S.tags = {}; S.usage = null;
  const week = weekOf(page.homework);
  setWeek(week);
  S.meta.student_full = page.student_full || "";
  S.meta.call_name = callName(page.student_full);
  S.meta.overall = page.overall ? (/\./.test(page.overall) ? page.overall : page.overall + ".0") : "";
  S.meta.homework = page.homework || (week ? "Writing Week " + week : "");
  autoTags();
  touch();
  go("page");
}

function setWeek(week) {
  const w = COURSE.weeks.find(x => x.week === week);
  S.meta.week = week;
  S.meta.track = w && w.tracks ? w.tracks[0].id : null;
  S.meta.essay_type = w ? w.essay_type : "";
  S.meta.prompt = w ? w.prompts[0].prompt : "";
  S.checklist = w ? (w.framework.checklist || []).map(item => ({ item, ok: null, note: "" })) : [];
}

/* obvious tags: first paragraph = intro, last = conclusion, first sentence of each body = topic sentence */
function autoTags() {
  const ps = S.page.essay.paragraphs;
  S.tags = {};
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
  $("#steps").replaceChildren(...STEPS.map(([id, label]) =>
    h("button", { class: "step-btn", type: "button", "aria-current": S.step === id ? "step" : null, disabled: !stepAllowed(id), onclick: () => go(id) }, label)));
  $("#who").textContent = S.meta && S.meta.call_name ? `${S.meta.call_name} · ${S.meta.homework || ""}` : "";
}
function go(step) {
  S.step = step; renderSteps(); touch();
  ({ page: renderPage, framework: renderFramework, draft: renderDraft, edit: renderEdit, export: renderExport })[step]();
  window.scrollTo(0, 0);
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
      w && !w.supported ? h("div", { class: "notice bad" }, `Week ${w.week} (${w.essay_type}) chưa làm được bài ôn tự động. Hiện tại chỉ có Task 2 essay (Week 2 đến 6).`) : null,
      !w ? h("div", { class: "notice bad" }, "Không nhận ra tuần của bài này. Chọn tuần ở trên nha.") : null,
      h("div", { class: "row" }, h("button", { class: "btn primary", type: "button", disabled: !(w && w.supported), onclick: () => go("framework") }, "Tiếp: Framework"))),
    h("div", { class: "card essay" }, h("h2", {}, "Bài của em (bản sửa)"), essayView({}))));
}
const field = (label, input) => h("label", {}, label, input);

function sentText(s, mode) {
  const C = S.page.corrections;
  return s.segs.map(g => typeof g === "string" ? g : (mode === "fix" ? C[g.c].fix : C[g.c].orig)).join("");
}
function essayView({ onClick, mark }) {
  return S.page.essay.paragraphs.map(p => h("p", {}, p.sentences.map(s => {
    const tag = S.tags[s.id], t = TAGS.find(x => x[0] === tag);
    return [h("span", { class: "sent" + (tag ? " tagged" : "") + (mark && mark(s.id) ? " picked" : ""), "data-sid": s.id, onclick: onClick ? () => onClick(s.id) : null },
      t ? h("span", { class: "tagchip" }, t[1]) : null, sentText(s, "fix")), " "];
  })));
}

/* ---------- 2. framework ---------- */
let activeTag = "i1", pickRewrite = false;
function renderFramework() {
  const w = COURSE.weeks.find(x => x.week === S.meta.week);
  const rt = S.rewriteTarget;
  const essay = h("div", { class: "essay" }, essayView({
    onClick: sid => {
      if (pickRewrite) {
        S.rewriteTarget = S.rewriteTarget || { target: "idea", sids: [] };
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
      h("p", { class: "muted" }, "Chạm vào câu để gắn nhãn. Chỉ cần gắn câu nêu ý (Ý 1 đến Ý 4); các câu phát triển theo sau tự hiểu là của ý đó. Mở bài, câu chủ đề và kết bài đã được gợi ý sẵn."),
      h("div", { class: "palette" },
        TAGS.map(([id, label]) => h("button", { class: "btn small", type: "button", "aria-pressed": String(!pickRewrite && activeTag === id), onclick: () => { activeTag = id; pickRewrite = false; renderFramework(); } }, label)),
        h("button", { class: "btn small", type: "button", "aria-pressed": String(pickRewrite), onclick: () => { pickRewrite = !pickRewrite; renderFramework(); } }, "Chọn phần viết lại")),
      pickRewrite ? h("div", { class: "notice" }, "Đang chọn câu cho phần viết lại. Chạm để thêm hoặc bỏ.",
        h("div", { class: "row" }, "Viết lại: ", h("select", { onchange: e => { S.rewriteTarget = { ...(S.rewriteTarget || { sids: [] }), target: e.target.value }; touch(); } },
          [["idea", "Một ý phát triển"], ["paragraph", "Một đoạn thân bài"], ["skeleton", "Mở bài + câu chủ đề"]].map(([v, l]) => h("option", { value: v, selected: rt && rt.target === v ? true : null }, l))),
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
      h("li", {}, `${tagged} ý đã gắn nhãn`, tagged < 4 ? h("span", { class: "warn" }, " (nên gắn đủ Ý 1 đến Ý 4)") : null),
      h("li", {}, `Checklist: ${S.checklist.filter(c => c.ok === true).length} ✓, ${S.checklist.filter(c => c.ok === false).length} ✗`),
      h("li", {}, S.rewriteTarget && S.rewriteTarget.sids.length ? `Viết lại: ${S.rewriteTarget.sids.join(", ")}` : "Viết lại: để Claude chọn")),
    h("p", { class: "small muted" }, `Model ${MODEL}, ${Object.keys(PARTS).length} phần soạn cùng lúc. Thường mất 1 đến 3 phút.`),
    S.partial && Object.keys(S.partial).some(p => PARTS[p]) && !drafting ? h("div", { class: "notice" }, `Lần trước đã soạn xong ${Object.keys(S.partial).filter(p => PARTS[p]).map(p => PARTS[p].label).join(", ")}.`,
      h("button", { class: "btn small", type: "button", style: "margin-left:8px", onclick: () => runDraft({ retry: true }) }, "Soạn tiếp phần còn thiếu")) : null,
    !hasKey ? h("div", { class: "notice bad" }, "Chưa có Claude API key. ", h("a", { href: "options.html", target: "_blank" }, "Mở Cài đặt"), " rồi quay lại đây.") : null,
    S.lesson ? h("div", { class: "notice" }, "Bài này đã có bản nháp. Soạn lại sẽ thay toàn bộ bản nháp (những chỗ anh đã sửa cũng mất).") : null,
    h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", disabled: !hasKey || !!drafting, onclick: () => runDraft() }, S.lesson ? "Soạn lại" : "Soạn nháp"),
      S.lesson ? h("button", { class: "btn", type: "button", onclick: () => go("edit") }, "Tới phần chỉnh sửa") : null),
    status)));
}

async function runDraft({ retry = false } = {}) {
  if (!retry) {
    if (S.lesson && !confirm("Soạn lại sẽ thay toàn bộ bản nháp. Tiếp tục?")) return;
    S.partial = {};                                  // a fresh draft: forget parts from an earlier try
  }
  const w = COURSE.weeks.find(x => x.week === S.meta.week);
  const status = $("#draftStatus");
  const todo = Object.keys(PARTS).filter(p => !(S.partial || {})[p]);
  const bar = h("progress", { max: String(10000 * todo.length), value: "0", style: "width:100%" });
  status.replaceChildren(h("p", {}, `Claude đang soạn ${todo.length === Object.keys(PARTS).length ? todo.length + " phần" : todo.map(p => PARTS[p].label).join(", ")}…`),
    bar, h("p", { class: "small muted", id: "draftChars" }, ""));
  const ctrl = new AbortController();
  drafting = ctrl; renderSteps();
  let result;
  try {
    result = await draftLesson({
      apiKey: SETTINGS.apiKey, week: { ...w, prompts: [{ label: w.essay_type, prompt: S.meta.prompt }] }, teacher: SETTINGS.teacher,
      input: {
        page: S.page, meta: S.meta,
        tags: Object.fromEntries(Object.entries(S.tags).filter(([, v]) => v).map(([k, v]) => [k, (TAGS.find(t => t[0] === v) || [, v])[1]])),
        checklist: S.checklist.map(c => ({ item: c.item, ok: c.ok, note: c.note })),
        notes: S.notes, rewriteTarget: S.rewriteTarget && S.rewriteTarget.sids.length ? S.rewriteTarget : null,
      },
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
    const ok = Object.keys(PARTS).filter(p => S.partial[p]).map(p => PARTS[p].label);
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
    S.lesson = draftToLesson(draft, { page: S.page, meta: { ...S.meta, word_target: 250 }, teacher: SETTINGS.teacher, zalo: SETTINGS.zalo });
  } catch (e) {
    S.partial = {};
    status.replaceChildren(h("div", { class: "notice bad" }, "Bản nháp của Claude thiếu thông tin (" + e.message + "). Soạn lại nha."),
      h("button", { class: "btn", type: "button", onclick: () => go("draft") }, "Soạn lại"));
    renderSteps(); return;
  }
  S.partial = {};
  S.src = { "": "ai", scores: "page", word_count: "page", essay: "page", corrections: "page", task_comments: "page", student: "teacher", teacher: "teacher", zalo: "teacher", homework: "page", prompt: "teacher", essay_type: "page", overall: "page", word_target: "page" };
  S.ok = {};
  S.mod = "review";
  touch(); go("edit");
}

/* ---------- 4. edit ---------- */
const MODULES = [
  ["review", "Cần duyệt", [], ["intro", 0]],
  ["hello", "Chào", ["hello"], ["intro", 0]],
  ["results", "Kết quả", ["results"], ["intro", 1]],
  ["framework", "Framework", ["framework"], ["TR", 0]],
  ["prompt_check", "Đọc đề", ["prompt_check"], ["TR", 1]],
  ["ideas", "Phát triển ý", ["ideas"], ["TR", -1]],
  ["linking", "Linking", ["linking"], ["CC", 0]],
  ["mistakes", "Từ vựng & ngữ pháp", ["mistakes"], ["LR", 0]],
  ["practice", "Luyện tập", ["practice"], ["practice", 0]],
  ["rewrite", "Viết lại", ["rewrite"], ["rewrite", 0]],
  ["praise", "Lời khen", ["praise"], ["intro", 1]],
  ["finish", "Kết thúc", ["finish"], ["end", 0]],
];
function modPending(id) {
  const items = openItems();
  return id === "review" ? items.length : items.filter(x => x.module === id).length;
}

function renderEdit() {
  if (!MODULES.some(m => m[0] === S.mod)) S.mod = "review";
  const mods = h("nav", { class: "mods" }, MODULES.filter(([id]) => id !== "prompt_check" || S.lesson.prompt_check).map(([id, label]) => {
    const n = modPending(id);
    return h("button", { class: "mod-btn", type: "button", "aria-current": String(S.mod === id), onclick: () => { S.mod = id; renderEdit(); } }, label, n ? h("span", { class: "count", title: "mục cần duyệt" }, n) : null);
  }));
  const form = h("div", { class: "form" }, moduleForm(S.mod));
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
    const m = MODULES.find(x => x[0] === S.mod);
    let [sec, off] = m[3];
    if (off === -1) off = S.lesson.prompt_check ? 2 : 1;
    if (S.mod === "mistakes" && !S.lesson.mistakes.main.some(x => x.tab === "LR")) sec = "GRA";
    const lesson = { ...structuredClone(S.lesson), __preview: true, __start: sec, __startOffset: off };
    try { const { html } = await buildPage(lesson, BUNDLE); f.srcdoc = html; } catch (e) { f.srcdoc = `<p style="font:14px sans-serif;padding:16px">Chưa xem trước được: ${e.message}</p>`; }
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
    const vis = MODULES.filter(([id]) => id !== "prompt_check" || S.lesson.prompt_check)[i];
    if (!vis) return;
    const n = modPending(vis[0]);
    const c = b.querySelector(".count");
    if (n && c) c.textContent = n; else if (n) b.append(h("span", { class: "count" }, n)); else if (c) c.remove();
  });
}

/* voice rules for Đậu's lines: lint() from lib/review.js */
const EMOTICON = /:\s?\)+|:\s?\]+/g;
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
function fBool(path, label) {
  return h("label", { class: "inline" }, h("input", { type: "checkbox", checked: !!getP(S.lesson, path), onchange: e => changed(path, e.target.checked) }), label);
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

function moduleForm(id) {
  const L = S.lesson;
  const head = (title, roots, note) => [h("h2", {}, title), note ? h("p", { class: "muted small" }, note) : null, roots ? approveBar(roots) : null];
  switch (id) {
    case "review": return reviewForm();
    case "hello": return [head("Chào", ["hello"]),
      fLine("student", "Tên Đậu gọi em", { voice: false }), fLines("hello", "Đậu nói")];
    case "results": return [head("Kết quả", ["results"]),
      fLines("results.words", "Về số chữ"), fLine("results.criteria", "Trước 4 tiêu chí"), fLines("results.score", "Về điểm")];
    case "framework": return [head("Framework", ["framework"], "Mỗi phần của bài: câu nào thuộc phần nào, và một câu tóm tắt."),
      fLines("framework.intro", "Mở đầu"), fLines("framework.reveal_intro", "Trước khi hiện từng phần"),
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
        fBool(`${p}.ok`, "Ý này ổn (không cần sửa)"), fLine(`${p}.line`, "Đậu nói")], { remove: false }),
      h("h3", {}, "Các ý cần sửa"),
      cards("ideas.details", d => `${d.tag} · ${d.title}`, (p, d) => {
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
      }, { add: () => ({ tag: "Ý ?", title: "", sids: [], chain: [""], bad_node: null, ask: { q: "", options: ["", ""], answer: 0, right: "", wrong: "" }, fix_intro: "", fix_chain: [""], fix_en: "", outro: "" }) })];
    case "linking": return [head("Linking", ["linking"]),
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
      fSelect("rewrite.target", "Em viết lại", [["idea", "Một ý phát triển"], ["paragraph", "Một đoạn thân bài"], ["skeleton", "Mở bài + câu chủ đề"]]),
      fSids("rewrite.sids", "Câu em đã viết"), fLine("rewrite.label", "Nhãn (vd Ý 4 em đã viết)", { voice: false }),
      fLines("rewrite.intro", "Đậu giới thiệu"), fLine("rewrite.task", "Đậu giao việc (có thể để trống)"),
      fLine("rewrite.flow", "Gợi ý 1: mạch ý (tiếng Anh, dùng →)", { voice: false, en: true, long: true }),
      fLines("rewrite.starters", "Gợi ý 2: câu mở đầu", { voice: false, en: true }), fLines("rewrite.phrases", "Gợi ý 3: từ hay", { voice: false, en: true }),
      fLines("rewrite.checklist", "Tự check"), fLine("rewrite.model", "Bài mẫu", { voice: false, en: true, long: true })];
    case "praise": return praiseForm();
    case "finish": return [head("Kết thúc", ["finish"]),
      fLines("finish.summary", "Sau luyện tập"), takeawaysForm(), fLine("finish.extra_prompt", "Rủ luyện thêm ({n} = số câu)"),
      fLines("finish.later", "Nếu để lần sau"), fLines("finish.done", "Cuối cùng"),
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
    h("b", {}, (o.ok ? "✓ " : "✗ ") + o.tag + " · " + o.text), h("span", { class: "muted" }, " · " + o.note), o.line ? sayLine(o.line) : null));
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
      h("div", { class: "chips static" }, g.cids.map(c => h("span", { class: "cchip" }, h("s", {}, (C[c] && C[c].orig.trim()) || "…"), " → ", h("ins", {}, (C[c] && C[c].fix.trim()) || "bỏ")))),
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
  if (u.id === "linking") return L.linking.suggestions.map(x => h("div", { class: "rv-sub" }, kv(x.sid, enText(`${x.from} → ${x.to}`)), x.why ? sayLine(x.why) : null));
  if (u.id === "rewrite") return [kv("Mạch ý", enText(at("rewrite.flow"))), kv("Câu mở đầu", at("rewrite.starters")), kv("Từ hay", at("rewrite.phrases")), kv("Bài mẫu", enText(at("rewrite.model")))];
  return [];
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
      unitSummary(x.u));
  };
  return [h("h2", {}, "Cần duyệt"),
    h("p", { class: "muted small" }, "Chỉ những chỗ Claude nhận xét bài của em hoặc dạy kiến thức mới (một dấu ✓ cho mỗi thẻ), và những dòng không qua được kiểm tra tự động. Phần còn lại đã tự duyệt, anh vẫn sửa được trong từng mục bên trái."),
    items.length ? h("p", { class: "small" }, `${items.length} mục`) : h("div", { class: "notice good" }, "Xong, không còn gì cần duyệt. Qua bước 5 · Xuất nha."),
    items.map(card)];
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
  const M = S.lesson.mistakes;
  S.lesson.__mistake_roles = S.lesson.__mistake_roles || {};
  if (g.where === "others" && role !== "other") {
    reorderKeys("mistakes.others", M.others.map((_, j) => j).filter(j => j !== g.i));
    const o = M.others.splice(g.i, 1)[0];
    const id = "g" + Date.now().toString(36);
    const m = { id, title: o.label, tag: o.tag === "LR" ? "Vocab" : "Grammar", tab: o.tag, cids: o.cids, count_line: `Em mắc lỗi này ${o.cids.length} lần`,
      ask: { q: `${o.cids.length} chỗ này có lỗi gì giống nhau?`, options: [o.label, "", ""], answer: 0 }, reason: "", board: [], rule: ["", "", ""], example: { bad: "", good: "" } };
    M.main.push(m); S.lesson.__mistake_roles[id] = role; S.src[`mistakes.main.${M.main.length - 1}`] = "teacher";
  } else if (g.where === "main" && role === "other") {
    reorderKeys("mistakes.main", M.main.map((_, j) => j).filter(j => j !== g.i));
    const m = M.main.splice(g.i, 1)[0];
    M.others.push({ label: m.title, cids: m.cids, tag: m.tab });
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
function mistakesForm() {
  const C = S.page.corrections;
  const groups = mistakeGroups();
  // tiny corrections ("'" -> "'s") get the word before them, so the chip is readable
  const before = {};
  for (const p of S.page.essay.paragraphs) for (const s of p.sentences) {
    let prev = "";
    for (const g of s.segs) { if (typeof g === "string") prev = g; else { before[g.c] = (prev.match(/\S+\s*$/) || [""])[0].replace(/\s+$/, " "); prev = C[g.c].fix; } }
  }
  const chip = cid => {
    const c = C[cid] || { orig: "", fix: "" }, o = c.orig.trim(), x = c.fix.trim();
    const ctx = o.length < 4 && x.length < 6 && before[cid] ? before[cid] : null;
    return h("span", { class: "cchip", draggable: "true", "data-cid": cid, title: c.comment || "",
      ondragstart: e => { e.dataTransfer.setData("text/plain", cid); } },
      ctx ? h("span", { class: "ctx" }, ctx) : null, h("s", {}, o || "…"), " → ", ctx ? h("span", { class: "ctx" }, ctx) : null, h("ins", {}, x || "bỏ"));
  };
  const dropInto = g => ({
    ondragover: e => { e.preventDefault(); e.currentTarget.classList.add("over"); },
    ondragleave: e => e.currentTarget.classList.remove("over"),
    ondrop: e => {
      e.preventDefault();
      const cid = e.dataTransfer.getData("text/plain");
      for (const x of groups) { const l = x.m.cids; const k = l.indexOf(cid); if (k >= 0) l.splice(k, 1); }
      g.m.cids.push(cid);
      if (g.where === "main" && g.m.count_line) g.m.count_line = g.m.count_line.replace(/\d+ lần/, `${g.m.cids.length} lần`);
      S.src[`mistakes.${g.where}.${g.i}.cids`] = "teacher"; touch(); refreshPreview(); renderEdit();
    },
  });
  const P = (g, f) => `mistakes.${g.where}.${g.i}.${f}`;
  return [
    h("h2", {}, "Từ vựng & ngữ pháp"),
    h("p", { class: "muted small" }, "Kéo từng chỗ sửa sang nhóm khác. Đặt tên nhóm, chọn nhóm dạy chính. Nhóm “Dạy chính” (ngữ pháp) và “Bắt buộc” (từ vựng) được dạy trong bài; “Xem thêm” là tùy chọn; “Lỗi nhỏ khác” chỉ liệt kê."),
    approveBar(["mistakes"]),
    fLines("mistakes.lr_intro", "Mở đầu phần từ vựng"), fLines("mistakes.gra_intro", "Mở đầu phần ngữ pháp"),
    groups.map(g => h("div", { class: "sub", "data-path": `mistakes.${g.where}.${g.i}` },
      h("div", { class: "head" }, g.where === "main" ? approveBtn(`mistakes.main.${g.i}`) : null,
        h("input", { value: g.where === "main" ? g.m.title : g.m.label, style: "flex:1", "aria-label": "Tên nhóm",
          oninput: e => { if (g.where === "main") changed(P(g, "title"), e.target.value); else changed(P(g, "label"), e.target.value); } }),
        h("select", { "aria-label": "Từ vựng hay ngữ pháp", onchange: e => { if (g.where === "main") { g.m.tab = e.target.value; g.m.tag = e.target.value === "LR" ? "Vocab" : "Grammar"; } else g.m.tag = e.target.value; touch(); refreshPreview(); renderEdit(); } },
          [["GRA", "Ngữ pháp"], ["LR", "Từ vựng"]].map(([v, l]) => h("option", { value: v, selected: (g.where === "main" ? g.m.tab : g.m.tag) === v ? true : null }, l))),
        h("select", { "aria-label": "Vai trò", onchange: e => setRole(g, e.target.value) },
          [["main", "Dạy chính"], ["core", "Bắt buộc (từ vựng)"], ["optional", "Xem thêm"], ["other", "Lỗi nhỏ khác"]].map(([v, l]) => h("option", { value: v, selected: g.role === v ? true : null }, l)))),
      h("div", { class: "chips", ...dropInto(g) }, g.m.cids.map(chip)),
      g.where === "main" ? h("details", {}, h("summary", {}, "Phần dạy (câu hỏi, quy tắc, ví dụ)"),
        fLine(P(g, "count_line"), "Đếm lỗi"), fLine(P(g, "ask.q"), "Câu hỏi"), fLines(P(g, "ask.options"), "Lựa chọn"), fNumber(P(g, "ask.answer"), "Đáp án đúng (0 là lựa chọn đầu)"),
        fLine(P(g, "reason"), "Vì sao em hay sai"), fLines(P(g, "board"), "Bảng (công thức ngắn)", { voice: false }),
        fLines(P(g, "rule"), "Quy tắc"), h("div", { class: "grid2" }, fLine(P(g, "example.bad"), "Ví dụ sai", { voice: false, en: true }), fLine(P(g, "example.good"), "Ví dụ đúng", { voice: false, en: true }))) : null)),
    h("button", { class: "btn small", type: "button", onclick: () => { S.lesson.mistakes.others.push({ label: "Nhóm mới", cids: [], tag: "GRA" }); touch(); renderEdit(); } }, "+ Thêm nhóm"),
  ];
}

function practiceForm() {
  const P = S.lesson.practice, ids = P.items.map(x => x.id);
  const mids = S.lesson.mistakes.main.map(m => [m.id, m.title]);
  return [h("h2", {}, "Luyện tập"), h("p", { class: "muted small" }, "4 câu chính (một câu mỗi kiểu) về lỗi dạy chính, rồi các câu luyện thêm."),
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
  const places = [["results", "Kết quả"], ["framework", "Framework"], ["linking", "Linking"], ["lr", "Từ vựng"], ["gra", "Ngữ pháp"], ...L.ideas.overview.map(o => ["idea:" + o.tag, "Ý: " + o.tag])];
  const chosen = L.praise;
  const isOn = c => chosen.some(p => p.line === c.line);
  const all = [...chosen, ...cand.filter(c => !isOn(c))];
  const warnFor = () => chosen.length > 3 ? "Tối đa 3 lời khen" : chosen.length < 2 ? "Nên có 2 đến 3 lời khen" : "";
  return [h("h2", {}, "Lời khen"),
    h("p", { class: "muted small" }, "Chọn 2 đến 3 lời khen cụ thể. Đậu nói mỗi lời ở đúng chỗ đã chọn."),
    L.praise_status === "draft" ? h("div", { class: "notice" }, "Lời khen đang là bản nháp.",
      h("button", { class: "btn small", type: "button", style: "margin-left:8px", onclick: () => { L.praise_status = "ok"; S.src.praise = "teacher"; touch(); renderEdit(); } }, "Duyệt lời khen")) :
      h("div", { class: "notice good" }, "Đã duyệt lời khen"),
    h("p", { class: "warn small" }, warnFor()),
    all.map(c => {
      const on = isOn(c);
      return h("div", { class: "pick" },
        h("input", { type: "checkbox", checked: on, disabled: !on && chosen.length >= 3 ? true : null, onchange: e => {
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

function takeawaysForm() {
  const L = S.lesson, cand = (L.__candidates && L.__candidates.takeaways) || [];
  const chosen = L.finish.takeaways;
  const all = [...chosen, ...cand.filter(c => !chosen.includes(c))];
  return h("div", { class: "field" }, h("div", { class: "lbl" }, `Nhớ cho bài sau (chọn 4, đang chọn ${chosen.length})`, srcBadge("finish.takeaways.0")),
    all.map((t, i) => h("div", { class: "pick" },
      h("input", { type: "checkbox", checked: chosen.includes(t), onchange: e => {
        const next = e.target.checked ? [...chosen, t] : chosen.filter(x => x !== t);
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
  if (L.praise_status === "draft") warns.push("Lời khen chưa duyệt");
  if (L.praise.length < 2 || L.praise.length > 3) warns.push(`Đang có ${L.praise.length} lời khen (nên 2 đến 3)`);
  if (L.finish.takeaways.length !== 4) warns.push(`Đang chọn ${L.finish.takeaways.length} điều cần nhớ (nên 4)`);
  if (emoticonCount() > 3) warns.push(`${emoticonCount()} biểu tượng cảm xúc (nên tối đa 3)`);
  const lintCount = leaves(L, "").filter(p => /^(hello|results|framework\.(intro|verdict|reveal_intro)|ideas\.(intro|overview\.\d+\.line)|linking\.(intro|result)|mistakes\.(lr_intro|gra_intro)|finish\.(summary|later|done))/.test(p) && typeof getP(L, p) === "string" && lint(getP(L, p)).length).length;
  if (lintCount) warns.push(`${lintCount} dòng của Đậu chưa đúng giọng (dấu chấm, emoji…)`);
  const status = h("div", { id: "pubStatus" });
  $("#main").replaceChildren(h("div", { class: "panel" }, h("div", { class: "card" },
    h("h1", {}, "Xuất bài ôn"),
    problems.length ? h("div", { class: "notice bad" }, h("b", {}, "Phải sửa trước khi xuất:"), h("ul", { class: "problems" }, problems.map(p => h("li", {}, p)))) : h("div", { class: "notice good" }, "Bài ôn dựng được."),
    aiLeft ? h("div", { class: "notice" }, `Còn ${aiLeft} mục cần duyệt (xem "Cần duyệt"). Vẫn xuất được, nhưng anh nên đọc qua.`) : null,
    warns.length ? h("div", { class: "notice" }, h("ul", { class: "problems" }, warns.map(w => h("li", {}, w)))) : null,
    S.usage ? h("p", { class: "small muted" }, `Lần soạn nháp: ${S.usage.input_tokens + (S.usage.cache_read_input_tokens || 0) + (S.usage.cache_creation_input_tokens || 0)} token vào, ${S.usage.output_tokens} token ra (${S.usage.model}).`) : null,
    h("div", { class: "row" },
      h("button", { class: "btn primary", type: "button", disabled: problems.length ? true : null, onclick: async () => { const { html } = await buildPage(L, BUNDLE); download(fileBase() + ".html", html, "text/html"); } }, "Tải file HTML"),
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
    status.replaceChildren(h("div", { class: "notice good" }, "Đã đăng: ", h("a", { href: url, target: "_blank" }, url), " ",
      h("button", { class: "btn small", type: "button", onclick: () => navigator.clipboard.writeText(url) }, "Chép link")));
  } catch (e) { status.replaceChildren(h("div", { class: "notice bad" }, e.message || String(e))); }
}

// settings may change in the other tab (API key, token): pick them up when coming back
window.addEventListener("focus", async () => {
  if (!BUNDLE) return;
  SETTINGS = await getSettings();
  if (S.step === "draft" && !drafting) renderDraft();
  if (S.step === "export") renderExport();
});

boot();
