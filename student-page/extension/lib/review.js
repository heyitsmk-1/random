/* What the teacher has to look at, and what is checked automatically.

   Claude's text is approved by default, except where a mistake would teach the student something
   wrong or misjudge her work: those are review "units" (one ✓ per card, not per line). Everything
   that a machine can verify (numbers, quotes, ids, Đậu's voice) is checked here; a field that
   fails a check needs a look even when it is otherwise auto-approved. */

const get = (obj, path) => path.split(".").reduce((o, k) => (o == null ? undefined : o[/^\d+$/.test(k) ? +k : k]), obj);
const BOARD_MAX = 22;                                 // characters per chalkboard line
const nums = t => (String(t).match(/\d+(?:[.,]\d+)?/g) || []).map(x => +x.replace(",", "."));
/* numbers that read as a band score: "7.5", "6.0", or a whole number right after overall / band / điểm /
   a criterion ("TR 7"); "Body 1", "Ý 2", "Topic 3", "Week 9" are not scores */
export const bandNums = t => {
  const out = [];
  String(t).replace(/(\d+)[.,]([05])\b|(?:overall|band|điểm|TR|TA|CC|LR|GRA|GR)\D{0,12}?(\d+(?:[.,][05])?)\b/giu, (m, a, b, c) => {
    out.push(a != null ? +(a + "." + b) : +c.replace(",", "."));
  });
  return out.filter(n => n <= 10);
};
const norm = t => String(t).toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();

/** Đậu's voice rules (Vietnamese lines). */
export function lint(text) {
  const out = [];
  if (/\p{Extended_Pictographic}/u.test(text)) out.push("không dùng emoji");
  const t = String(text).replace(/…|\.\.\./g, "");
  if (/[^.]\.\s*$/.test(t) || /[^\s.]\.\s+\S/.test(t.replace(/\b(e\.g|i\.e|etc|vs)\./gi, ""))) out.push("Đậu không dùng dấu chấm");
  if (/:P|xD|=\)/i.test(text)) out.push('chỉ dùng ": )", ": ]]", ":)))))" hoặc ":D"');
  if (/!{2,}/.test(text)) out.push("bớt dấu chấm than");
  return out;
}

/* paths of lines Đậu says in Vietnamese (voice rules apply) */
const VOICE = [
  /^hello\.\d+$/, /^results\.(words|score)\.\d+$/, /^results\.criteria$/,
  /^framework\.(intro|reveal_intro|verdict)\.\d+$/, /^framework\.parts\.\d+\.summary$/,
  /^prompt_check\.intro$/, /^prompt_check\.items\.\d+\.(line|fix_line)$/,
  /^ideas\.intro\.\d+$/, /^ideas\.overview\.\d+\.line$/, /^ideas\.details\.\d+\.(fix_intro|outro)$/,
  /^linking\.(intro|result)\.\d+$/, /^linking\.suggestions_intro$/, /^linking\.suggestions\.\d+\.why$/,
  /^mistakes\.(lr_intro|gra_intro)\.\d+$/, /^mistakes\.main\.\d+\.(count_line|reason)$/,
  /^practice\.intro\.\d+$/, /^rewrite\.intro\.\d+$/, /^rewrite\.task$/,
  /^finish\.(summary|later|done)\.\d+$/,
  /^t1\.overview\.(intro|lines)\.\d+$/, /^t1\.data\.intro$/, /^t1\.data\.verdict\.\d+$/, /^t1\.data\.items\.\d+\.note$/,
  /^paraphrase\.intro\.\d+$/, /^paraphrase\.items\.\d+\.line$/, /^paraphrase\.outro$/,
];
export const isVoice = path => VOICE.some(r => r.test(path));

function leaves(obj, base, out = []) {
  if (obj == null) return out;
  if (typeof obj !== "object") out.push(base);
  else if (Array.isArray(obj)) obj.forEach((x, i) => leaves(x, `${base}.${i}`, out));
  else for (const [k, v] of Object.entries(obj)) if (!k.startsWith("__")) leaves(v, base ? `${base}.${k}` : k, out);
  return out;
}
export { leaves };

/** Does the framework verdict agree with the teacher's checklist? (null = nothing to compare with) */
export function verdictAgrees(L, checklist) {
  const ticked = (checklist || []).filter(c => c.ok != null);
  if (!ticked.length || !L.framework) return null;
  return !!L.framework.ok === !ticked.some(c => c.ok === false);
}

/**
 * The cards the teacher approves. Each: { id, module, label, roots: [paths] }.
 * module = the editor module where it is edited.
 */
export function reviewUnits(L, { checklist } = {}) {
  const units = [];
  if (L.framework && verdictAgrees(L, checklist) !== true)
    units.push({ id: "verdict", module: "framework", label: "Kết luận framework", roots: ["framework.ok", "framework.verdict"] });
  if (L.prompt_check) units.push({ id: "prompt_check", module: "prompt_check", label: "Đọc đề", roots: ["prompt_check"] });
  if (L.ideas) {
    units.push({ id: "overview", module: "ideas", label: "Các ý: ✓/~/✗ và nhận xét", roots: ["ideas.overview"] });
    L.ideas.details.forEach((d, i) => units.push({ id: "detail" + i, module: "ideas", label: `Ý cần sửa · ${d.tag}`, roots: [`ideas.details.${i}`] }));
  }
  if (L.t1) {
    units.push({ id: "t1overview", module: "t1", label: "Overview: các đặc điểm chính và overview gợi ý", roots: ["t1.overview.features", "t1.overview.lines", "t1.overview.model"] });
    units.push({ id: "t1data", module: "t1", label: "Số liệu: đúng/sai và kết luận", roots: ["t1.data.items", "t1.data.verdict"] });
  }
  if (L.paraphrase) L.paraphrase.items.forEach((x, i) => units.push({ id: "para" + i, module: "paraphrase", label: `Paraphrase · Topic ${i + 1}`, roots: [`paraphrase.items.${i}`] }));
  if (L.linking && (L.linking.suggestions || []).length) units.push({ id: "linking", module: "linking", label: "Linking: gợi ý nâng cấp", roots: ["linking.suggestions"] });
  L.mistakes.main.forEach((m, i) => units.push({ id: "group" + i, module: "mistakes", label: `Nhóm lỗi · ${m.title}`, roots: [`mistakes.main.${i}`] }));
  L.practice.items.forEach((it, i) => units.push({ id: "item" + i, module: "practice",
    label: `Bài luyện ${i + 1}${L.practice.core.includes(it.id) ? " (câu chính)" : ""} · ${{ choose: "chọn đáp án", tap: "chạm chữ sai", build: "xếp câu" }[it.type] || it.type}`,
    roots: [`practice.items.${i}`] }));
  if (L.rewrite) units.push({ id: "rewrite", module: "rewrite", label: "Viết lại: bài mẫu và gợi ý", roots: ["rewrite.model", "rewrite.flow", "rewrite.starters", "rewrite.phrases"] });
  return units;
}

/**
 * Automatic checks. Each flag: { path, module, msg, fixOnly } — fixOnly flags can't be
 * "approved", only fixed (e.g. a correction that belongs to no group).
 */
export function checks(L, { prompt, checkLesson } = {}) {
  const flags = [];
  const flag = (path, module, msg, fixOnly = false) => flags.push({ path, module, msg, fixOnly });
  const C = L.corrections || {};

  // numbers Đậu says must match the page
  // (the word count is no longer shown)
  const bands = [L.overall, ...Object.values(L.scores || {})].map(Number).filter(n => !isNaN(n));
  const okBands = [...bands, ...bands.map(b => b + 0.5), ...bands.map(b => b + 1)];
  ((L.results && L.results.score) || []).forEach((t, i) => {
    const bad = bandNums(t).filter(n => !okBands.includes(n));
    if (bad.length) flag(`results.score.${i}`, "results", `Số ${bad.join(", ")} không khớp trang chấm (overall ${L.overall})`);
  });
  // a group's size = its corrections + its notes
  const size = g => g.cids.length + (g.points || []).length;
  L.mistakes.main.forEach((m, i) => {
    if (m.count_line && nums(m.count_line).some(n => n !== size(m))) flag(`mistakes.main.${i}.count_line`, "mistakes", `Số lỗi không khớp: nhóm này có ${size(m)} chỗ`);
    (m.points || []).forEach((p, j) => { if (!p.better) flag(`mistakes.main.${i}.points.${j}.better`, "mistakes", "Ghi chú chưa có câu viết lại"); });
  });
  const grouped = new Set([...L.mistakes.main, ...L.mistakes.others].flatMap(g => g.cids)).size;
  const all = [...L.mistakes.main.map(m => ({ tab: m.tab, g: m })), ...L.mistakes.others.map(o => ({ tab: o.tag, g: o }))];
  const perTab = t => all.filter(x => x.tab === t);
  const okCounts = [...bands, Object.keys(C).length, grouped, grouped + all.reduce((n, x) => n + (x.g.points || []).length, 0), all.length,
    ...["LR", "GRA"].flatMap(t => [perTab(t).reduce((n, x) => n + size(x.g), 0), perTab(t).length]), ...all.map(x => size(x.g))];
  // a rewrite of the sentences the teacher picked: the model shouldn't be a whole new paragraph
  if (L.rewrite && L.rewrite.model && (L.rewrite.sids || []).length) {
    const said = (L.rewrite.model.match(/[^.!?]+[.!?]+/g) || [L.rewrite.model]).length;
    if (said > L.rewrite.sids.length + 1) flag("rewrite.model", "rewrite", `Bài mẫu có ${said} câu, nhưng phần em viết lại chỉ có ${L.rewrite.sids.length} câu`);
  }
  for (const k of ["lr_intro", "gra_intro"]) (L.mistakes[k] || []).forEach((t, i) => {
    if (nums(t).some(n => !okCounts.includes(n))) flag(`mistakes.${k}.${i}`, "mistakes", `Con số không khớp số chỗ sửa (${Object.keys(C).length})`);
  });

  // quotes must really be there
  const sents = {};
  for (const p of L.essay.paragraphs) for (const s of p.sentences)
    sents[s.id] = norm(s.segs.map(g => typeof g === "string" ? g : C[g.c].orig).join("")) + " || " + norm(s.segs.map(g => typeof g === "string" ? g : C[g.c].fix).join(""));
  const P = norm(prompt || L.prompt || "");
  if (L.ideas && L.ideas.prompt_focus && !P.includes(norm(L.ideas.prompt_focus))) flag("ideas.prompt_focus", "ideas", "Chữ tô vàng không có trong đề bài");
  if (L.prompt_check) L.prompt_check.items.forEach((it, i) => {
    if (it.focus && !(sents[it.sid] || "").includes(norm(it.focus))) flag(`prompt_check.items.${i}.focus`, "prompt_check", "Chữ tô vàng không có trong câu của em");
    if (it.prompt_focus && !P.includes(norm(it.prompt_focus))) flag(`prompt_check.items.${i}.prompt_focus`, "prompt_check", "Chữ tô vàng không có trong đề bài");
  });
  let linked = 0;
  if (L.linking) L.linking.groups.forEach((g, gi) => g.items.forEach((x, xi) => {
    linked++;
    // a split device ("not only … but also"): each piece, in order
    const s = sents[x.sid] || "";
    let from = 0;
    const found = norm(x.text).split(/\s*(?:…|\.\.\.)\s*/).filter(Boolean).every(piece => { const k = s.indexOf(piece, from); if (k < 0) return false; from = k + piece.length; return true; });
    if (!found) flag(`linking.groups.${gi}.items.${xi}`, "linking", `"${x.text}" không có trong câu ${x.sid}`);
  }));
  if (L.linking && L.linking.count !== linked) flag("linking.count", "linking", `Bộ đếm là ${L.linking.count} nhưng danh sách có ${linked} cụm`);

  // Task 1: her quoted data must be in her sentence, and the right number must match the chart
  if (L.t1) {
    const T = L.t1;
    (T.overview.sids || []).forEach((sid, i) => { if (!sents[sid]) flag(`t1.overview.sids.${i}`, "t1", `Không có câu ${sid}`); });
    (T.data.items || []).forEach((it, i) => {
      if (it.quote && !(sents[it.sid] || "").includes(norm(it.quote))) flag(`t1.data.items.${i}.quote`, "t1", `Chữ trích không có trong câu ${it.sid}`);
      const v = chartValue(T, it);
      if (v === undefined) { if (T.kind !== "map") flag(`t1.data.items.${i}.series`, "t1", `Không tìm thấy "${it.series}" / "${it.col}" trên biểu đồ`); return; }
      if (typeof v !== "number") return;
      const tol = (T.chart && T.chart.tolerance) || 0;
      const near = t => nums(t).some(n => Math.abs(n - v) <= tol + 1e-9);
      if (it.ok && it.quote && nums(it.quote).length && !near(it.quote)) flag(`t1.data.items.${i}.ok`, "t1", `Đánh dấu đúng, nhưng biểu đồ ghi ${v}`);
      if (!it.ok && it.quote && near(it.quote)) flag(`t1.data.items.${i}.ok`, "t1", `Đánh dấu sai, nhưng số ${v} khớp biểu đồ`);
      if (!it.ok && it.fix && nums(it.fix).length && !near(it.fix)) flag(`t1.data.items.${i}.fix`, "t1", `Số sửa không khớp biểu đồ (${v})`);
    });
  }

  // every correction in exactly one group
  const seen = {};
  for (const g of [...L.mistakes.main, ...L.mistakes.others]) for (const c of g.cids) seen[c] = (seen[c] || 0) + 1;
  const none = Object.keys(C).filter(c => !seen[c]), twice = Object.keys(seen).filter(c => seen[c] > 1);
  // leaving a correction out on purpose is allowed ("✓ Giữ nguyên"); the approval is for exactly these ones
  if (none.length) flag(`mistakes.unassigned.${none.join("+")}`, "mistakes", `${none.length} chỗ sửa chưa thuộc nhóm nào (kéo vào một nhóm, hoặc giữ nguyên để bỏ ra khỏi bài ôn): ${none.map(c => (C[c] && C[c].orig.trim()) || c).join(", ")}`);
  if (twice.length) flag("mistakes", "mistakes", `${twice.length} chỗ sửa nằm ở 2 nhóm: ${twice.map(c => (C[c] && C[c].orig.trim()) || c).join(", ")}`, true);

  // the drawn chalkboard is small: long lines get tiny chalk, or fall back to a plain board
  L.mistakes.main.forEach((m, i) => (m.board || []).forEach((t, j) => {
    if (t.length > BOARD_MAX) flag(`mistakes.main.${i}.board.${j}`, "mistakes", `Bảng: dòng quá dài (${t.length} ký tự, nên dưới ${BOARD_MAX}), sẽ không vừa bảng`);
  }));
  if (L.mistakes.main.some(m => (m.board || []).length > 2)) L.mistakes.main.forEach((m, i) => {
    if ((m.board || []).length > 2) flag(`mistakes.main.${i}.board`, "mistakes", "Bảng: nhiều hơn 2 dòng sẽ không vừa bảng");
  });

  const Q = L.finish && L.finish.quote;
  if (Q && (!Q.text || !Q.text.trim() || !Q.source || !Q.source.trim())) flag("finish.quote", "finish", "Câu kết chưa có câu hoặc nguồn", true);

  // exercises that can't work
  L.practice.items.forEach((it, i) => {
    if (it.type === "choose" && !(it.answer >= 0 && it.answer < (it.options || []).length)) flag(`practice.items.${i}.answer`, "practice", "Đáp án đúng không trỏ tới lựa chọn nào", true);
    if (it.type === "choose" && it.sentence && !it.sentence.includes("___")) flag(`practice.items.${i}.sentence`, "practice", 'Câu điền chỗ trống cần có "___"');
    if (it.type === "build" && !(it.answer || []).length) flag(`practice.items.${i}.answer`, "practice", "Chưa có các cụm của câu", true);
    if (!L.mistakes.main.some(m => m.id === it.mistake)) flag(`practice.items.${i}.mistake`, "practice", "Bài này không gắn với nhóm lỗi nào", true);
  });

  // Đậu's voice
  for (const p of leaves(L, "")) {
    if (!isVoice(p)) continue;
    const v = get(L, p);
    if (typeof v === "string" && v && lint(v).length) flag(p, moduleOf(p), "Giọng Đậu: " + lint(v).join(", "));
  }

  // anything that would stop the page from building
  if (checkLesson) for (const msg of checkLesson(L)) flag("", /^câu luyện/.test(msg) ? "practice" : /^lỗi|chỗ sửa/.test(msg) ? "mistakes" : /^viết lại/.test(msg) ? "rewrite" : /^ý /.test(msg) ? "ideas" : /lời khen/.test(msg) ? "praise" : "review", msg, true);
  return flags;
}

/* the chart value a Task 1 data item points at (series × column, either way round); undefined = not on the chart */
export function chartValue(T, it) {
  const ch = T.chart || {};
  let cols, rows;
  if (T.kind === "map") return undefined;
  if (T.kind === "pie") {
    cols = Object.keys(ch.series || {});
    rows = [...new Set(cols.flatMap(k => Object.keys(ch.series[k])))].map(cat => ({ name: cat, cells: cols.map(k => ch.series[k][cat]) }));
  } else {
    cols = (ch.years || ch.columns || []).map(String);
    rows = Object.entries(ch.series || {}).map(([name, cells]) => ({ name, cells }));
  }
  const same = (a, b) => String(a || "").trim().toLowerCase() === String(b || "").trim().toLowerCase();
  for (const [r, c] of [[it.series, it.col], [it.col, it.series]]) {
    const ri = rows.findIndex(x => same(x.name, r)), ci = cols.findIndex(x => same(x, c));
    if (ri >= 0 && ci >= 0) return rows[ri].cells[ci];
    if (ri >= 0 && !c) return null;           // a whole series: nothing single to compare
  }
  return undefined;
}

export function moduleOf(path) {
  const top = path.split(".")[0];
  return { hello: "hello", student: "hello", results: "results", framework: "framework", prompt_check: "prompt_check", ideas: "ideas", linking: "linking", t1: "t1", paraphrase: "paraphrase",
    mistakes: "mistakes", practice: "practice", rewrite: "rewrite", praise: "praise", finish: "finish" }[top] || "review";
}
