/* Build a student page from a lesson, in the browser. A port of build.py:
   same checks, same quote choice, same template filling. */

/** Problems that would stop the page from rendering (same rules as build.py check()). */
export function checkLesson(lesson) {
  const sids = new Set(lesson.essay.paragraphs.flatMap(p => p.sentences.map(s => s.id)));
  const problems = [];
  const bare = w => w.replace(/[^\p{L}\p{N}_'-]/gu, "").toLowerCase();
  const practice = lesson.practice || { items: [] };            // flow 2: only with a systematic mistake
  for (const item of practice.items) {
    if (item.type === "tap" && !item.sentence.split(/\s+/).map(bare).includes(bare(item.wrong)))
      problems.push(`câu luyện ${item.id}: chữ "${item.wrong}" không phải một chữ trong câu`);
  }
  for (const m of (lesson.mistakes || { main: [] }).main)
    for (const c of m.cids) if (!(c in lesson.corrections)) problems.push(`lỗi ${m.id}: không có chỗ sửa ${c}`);
  for (const t of lesson.task_comments)
    if (!t.sentence_ids.length) problems.push("một nhận xét không gắn với câu nào: " + t.comment.slice(0, 60));
  const praise = lesson.praise || [];
  if (praise.length > 3) problems.push(`${praise.length} lời khen: chỉ nên 2-3 cho cả bài`);
  const places = new Set(["results", "framework", "linking", "lr", "gra", "overview", "data", "paraphrase", ...((lesson.ideas || { overview: [] }).overview).map(o => "idea:" + o.tag)]);
  for (const x of praise) if (!places.has(x.at)) problems.push(`lời khen ở chỗ không có: ${x.at}`);
  const rw = lesson.rewrite;
  if (rw) {
    for (const sid of rw.sids) if (!sids.has(sid)) problems.push(`viết lại: không có câu ${sid}`);
    if (!["idea", "paragraph", "skeleton", "overview", "paraphrase"].includes(rw.target)) problems.push("viết lại: chọn một ý, một đoạn, mở bài + câu chủ đề, overview hoặc paraphrase");
    if (!rw.sids.length) problems.push("viết lại: chưa chọn câu nào");
  } else if (!practice.challenge && !(lesson.flow === 2 && rw === null)) problems.push("chưa có phần viết lại");   // flow 2: null = the teacher didn't assign one
  for (const it of (lesson.language || { items: [] }).items) {  // flow 2: the corrections shown one by one
    const r = it.ref, n = /^n(\d+)$/.exec(r);
    if (!(r in lesson.corrections) && !(n && +n[1] > 0 && +n[1] <= lesson.task_comments.length)) problems.push(`language: không có ${r} trên trang chấm`);
  }
  const used = JSON.stringify(lesson);
  for (const m of used.matchAll(/"(?:sid|sids)":\[?"(p\d+s\d+)"/g)) if (!sids.has(m[1])) problems.push(`không có câu ${m[1]}`);
  for (const d of (lesson.ideas || { details: [] }).details) for (const sid of d.sids) if (!sids.has(sid)) problems.push(`ý ${d.tag}: không có câu ${sid}`);
  return [...new Set(problems)];
}

async function sha1(text) {
  const buf = await crypto.subtle.digest("SHA-1", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

/* json.dumps(obj, sort_keys=?, ensure_ascii=?) with Python's default separators, so the page
   (and its version hash) come out byte for byte the same as build.py's */
function pyDumps(obj, sortKeys, ascii) {
  const str = s => { const j = JSON.stringify(s); return ascii ? j.replace(/[^\x00-\x7f]/g, c => "\\u" + c.charCodeAt(0).toString(16).padStart(4, "0")) : j; };
  const go = o => {
    if (o === null || o === undefined) return "null";
    if (typeof o === "string") return str(o);
    if (typeof o === "number" || typeof o === "boolean") return JSON.stringify(o);
    if (Array.isArray(o)) return "[" + o.map(go).join(", ") + "]";
    const keys = Object.keys(o).filter(k => o[k] !== undefined);
    if (sortKeys) keys.sort();
    return "{" + keys.map(k => str(k) + ": " + go(o[k])).join(", ") + "}";
  };
  return go(obj);
}

/** Fill the template. Returns { fragment, html, problems } (problems empty = ready to send). */
export async function buildPage(lessonIn, { template, assets, quotes }) {
  const lesson = structuredClone(lessonIn);
  for (const k of Object.keys(lesson)) if (k.startsWith("__") && k !== "__preview" && k !== "__start" && k !== "__startOffset" && k !== "__startName" && k !== "__essay") delete lesson[k];
  const problems = checkLesson(lesson);
  const finish = (lesson.finish = lesson.finish || {});
  if (!finish.quote) {
    const key = Array.from(lesson.student + lesson.homework).reduce((s, ch) => s + ch.codePointAt(0), 0);
    finish.quote = quotes[key % quotes.length];
  }
  lesson.version = (await sha1(pyDumps(lesson, true, true))).slice(0, 10);
  const used = Object.fromEntries(Object.entries(assets).filter(([stem]) => template.includes(stem)));
  const js = obj => pyDumps(obj, false, false).replace(/<\//g, "<\\/");
  const fragment = template
    .replaceAll("__TITLE__", () => lesson.student)
    .replaceAll("__LESSON_JSON__", () => js(lesson))
    .replaceAll("__ASSETS_JSON__", () => js(used));
  const html = '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">' +
    "</head><body>\n" + fragment + "\n</body></html>\n";
  return { fragment, html, problems };
}
