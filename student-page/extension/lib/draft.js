/* Draft a lesson with Claude, from the extracted page + the teacher's framework tagging.
   One streaming request; the reply is JSON that matches DRAFT_SCHEMA (structured outputs).
   Everything the model writes is marked "AI" in the editor until the teacher approves it. */
import Anthropic from "../vendor/anthropic.mjs";

export const MODEL = "claude-opus-5-5";

/* ---------- output schemas ----------
   One schema for the whole lesson, then 3 schemas of ~50 fields, were rejected by the API
   ("compiled grammar is too large"); a ~22-field schema was accepted. So the lesson is drafted
   in 6 parts of at most ~24 fields. Every object is closed and every field required; no nullable
   fields (empty string / empty list / -1 mean "none"); the three exercise types are separate lists.
   If a part's schema is still refused, that part is asked again without the strict format and
   its JSON is checked here against the same schema (see draftPart). */
const S = { type: "string" };
const I = { type: "integer" };
const B = { type: "boolean" };
const A = items => ({ type: "array", items });
const E = (...values) => ({ type: "string", enum: values });
const O = props => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });
const ASK = O({ q: S, options: A(S), answer: I, right: S, wrong: S });

export const PARTS = {
  structure: {
    label: "Khung bài",
    fields: "call_name, framework",
    schema: O({
      call_name: S,
      framework: O({
        intro: A(S), reveal_intro: A(S), ok: B, verdict: A(S),
        parts: A(O({ label: S, tone: E("orange", "mint", "sky"), sids: A(S), summary: S, short: S,
          ideas: A(O({ tag: S, sid: S, text: S, short: S })) })),
      }),
    }),
  },
  ideas: {
    label: "Phát triển ý",
    fields: "ideas",
    schema: O({
      ideas: O({
        intro: A(S), prompt_focus: S,
        overview: A(O({ tag: S, text: S, ok: B, note: S, line: S })),
        details: A(O({
          tag: S, title: S, sids: A(S), chain: A(S), mode: E("missing_end", "bad_link", "gap", "replace"),
          bad_node: I, gap_after: I, ask: ASK, fix_intro: S, fix_chain: A(S), fix_label: S, fix_en: S, outro: S,
        })),
      }),
    }),
  },
  reading: {
    label: "Đọc đề và linking",
    fields: "prompt_check, linking",
    schema: O({
      prompt_check: O({ intro: S, items: A(O({ sid: S, focus: S, prompt_focus: S, ask_q: S, ask_options: A(S), ask_answer: I,
        ask_right: S, ask_wrong: S, line: S, fix: S, fix_line: S })) }),
      linking: O({
        intro: A(S), count: I, result: A(S),
        groups: A(O({ label: S, items: A(O({ text: S, sid: S })) })),
        suggestions_intro: S, suggestions: A(O({ sid: S, from: S, to: S, why: S })),
      }),
    }),
  },
  mistakes: {
    label: "Lỗi sai",
    fields: "mistakes",
    schema: O({
      mistakes: O({
        groups: A(O({
          id: S, title: S, tab: E("LR", "GRA"), cids: A(S), role: E("main", "core", "optional", "other"),
          count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S, board: A(S), rule: A(S),
          example: O({ bad: S, good: S }),
        })),
        lr_intro: A(S), gra_intro: A(S),
      }),
    }),
  },
  // drafted after "mistakes": its exercises point at those mistake groups
  practice: {
    label: "Bài luyện",
    fields: "practice",
    after: "mistakes",
    schema: O({
      practice: O({
        intro: A(S), core: A(S),
        choose: A(O({ id: S, mistake: S, q: S, sentence: S, options: A(S), answer: I, explain: S })),
        tap: A(O({ id: S, mistake: S, q: S, sentence: S, wrong: S, fix: S, explain: S })),
        build: A(O({ id: S, mistake: S, vi: S, answer_words: A(S), extra: A(S), explain: S })),
      }),
    }),
  },
  frame: {
    label: "Lời chào, viết lại, lời khen và kết thúc",
    fields: "hello, results, rewrite, praise_candidates, takeaway_candidates, finish",
    schema: O({
      hello: A(S),
      results: O({ words: A(S), score: A(S), criteria: S }),
      rewrite: O({
        target: E("idea", "paragraph", "skeleton"), label: S, sids: A(S), intro: A(S), task: S,
        flow: S, starters: A(S), phrases: A(S), checklist: A(S), model: S,
      }),
      praise_candidates: A(O({ at: S, line: S, evidence: S })),
      takeaway_candidates: A(S),
      finish: O({ summary: A(S), extra_prompt: S, later: A(S), done: A(S) }),
    }),
  },
};

/** Problems with `value` against one of the schemas above (for replies drafted without the strict format). */
export function checkAgainst(schema, value, path = "$", out = []) {
  if (out.length > 20) return out;
  if (schema.enum) { if (!schema.enum.includes(value)) out.push(`${path}: phải là một trong ${schema.enum.join(", ")}`); return out; }
  const t = schema.type;
  if (t === "string" && typeof value !== "string") out.push(`${path}: cần chuỗi`);
  else if (t === "integer" && !Number.isInteger(value)) out.push(`${path}: cần số nguyên`);
  else if (t === "boolean" && typeof value !== "boolean") out.push(`${path}: cần true/false`);
  else if (t === "array") {
    if (!Array.isArray(value)) out.push(`${path}: cần danh sách`);
    else value.forEach((v, i) => checkAgainst(schema.items, v, `${path}[${i}]`, out));
  } else if (t === "object") {
    if (!value || typeof value !== "object" || Array.isArray(value)) out.push(`${path}: cần object`);
    else for (const k of schema.required) {
      if (!(k in value)) out.push(`${path}.${k}: thiếu`);
      else checkAgainst(schema.properties[k], value[k], `${path}.${k}`, out);
    }
  }
  return out;
}

/* ---------- the instructions (stable per week, so they are cached) ---------- */
export function systemBlocks(week, teacher) {
  const general = `You prepare a short, friendly review of a student's marked IELTS Writing homework. The student reads it on a phone. It is spoken by "anh Đậu", a teaching assistant of ${teacher}. The lesson is written as JSON in several parts (each request asks for one part); the teacher then checks and edits every line before it goes to the student.

# Who decides what
- The teacher's marking is the source of truth: corrections, comments, the framework checklist the teacher ticked, and the teacher's overall comment. Build on it; never contradict it, never re-grade, never invent new corrections.
- Comments that were AI-generated in the grading system were already filtered by the teacher: everything you are given counts as the teacher's.
- Where the teacher gave a model sentence, a flow ("->" chains) or a suggestion, use it as is (you may shorten it, never replace it with your own).
- The course framework for this week (below) is how the class is taught. Its phrases are correct by definition: never mark them as mistakes, never suggest replacing them (for example "far more impactful", "The first one is that", "On the one hand, I can understand why some people believe that").
- Where the teacher said nothing, use your own judgement sparingly: at most one extra point per module, and only when clearly true.

# Đậu's voice (Vietnamese)
- Đậu calls himself "anh" and the student "em". Mix in natural particles: "nha", "nhen", "nè", "á", "nha em", "em nhen", and the student's name.
- Never end a line with a full stop, and avoid full stops inside lines; split long thoughts into separate lines instead. Commas are fine.
- Emoticons only in these forms: ": )", ": ]]", ":)))))", ":D". Use them rarely: at most one in the hello, one in the framework verdict, one at the very end. Never use emoji.
- Cute but authoritative, like a caring older brother. Not quirky, not flamboyant, no slang overload, no exclamation marks in a row.
- Lines are short: one idea per line, usually under 20 words. English words and phrases from the essay stay in English.
- Refer to the teacher as "${teacher}".

# The lesson, module by module
- call_name: what Đậu calls the student (the given name at the end of the full name; two words if the last word alone is a common second part such as "Anh").
- hello: 2 lines. Line 1 introduces Đậu as ${teacher}'s TA. Line 2 says you'll look at the homework together.
- results: words = 2 lines about the word count (target 250 for Task 2), score = 2 lines (the overall band, then what's next), criteria = 1 line introducing the 4 scores.
- framework: intro = 2 lines naming the essay type and what the structure should be. reveal_intro = 1 line ("Em đã lập luận như sau"). parts = the essay's parts in order (Mở bài, Body 1 · <short label>, Body 2 · <short label>, Kết bài) with the teacher's sentence tags deciding which sentences belong where. Tones: intro and conclusion "orange", Body 1 "mint", Body 2 "sky". summary = 1 line saying in plain Vietnamese what that part does; short = 2-5 words. ideas (bodies only) = the supporting ideas with tag "Ý 1".."Ý 4" in order across both bodies, sid of the sentence that states the idea, text = the idea in Vietnamese (under 10 words), short = 2-4 words. ok = the structure matches the framework per the teacher's checklist. verdict = 2 lines.
- prompt_check: only when the teacher's marking shows she misread or didn't answer the question (a wrong reading of the prompt, a thesis/conclusion that doesn't answer the question type); otherwise intro "" and items []. Each item quotes her sentence (sid), focus = the exact words in her sentence (verbatim from the original text), prompt_focus = the exact words in the prompt (verbatim), an optional multiple-choice question (ask_q, ask_options, ask_answer = right index, ask_right/ask_wrong = Đậu's replies; ask_q "" and ask_options [] when there is no question), line = what's wrong (used when there is no question), fix = the corrected sentence (in English, following the framework), fix_line = 1 short line.
- ideas: intro = 3 lines (what the prompt asks, what every idea must reach, then a count of how many ideas are fine vs need work). prompt_focus = the key words of the prompt, verbatim. overview = one row per idea (same tags): ok = no problem found by the teacher; note = 3-7 words; line = one Đậu line about it. details = only for ideas with a problem, in order:
  - sids = the idea's sentences; chain = her reasoning as 2-5 short Vietnamese links (under 9 words each), paraphrased faithfully.
  - bad_node and gap_after are -1 unless the mode uses them.
  - mode "missing_end": the chain stops before reaching the point; fix_chain = links to add at the end.
  - mode "bad_link": one link is wrong or off-topic (bad_node = its index); fix_chain = links to add after it.
  - mode "gap": a link is missing in the middle (gap_after = index of the link before the gap); fix_chain = the missing links.
  - mode "replace": the idea is wordy or circular and should be said again, shorter (fix_label = "Chuỗi ý mới" or similar); fix_chain = the new chain.
  - ask = a Socratic question with 2-3 options and the right index; right/wrong = Đậu's reply to each. fix_intro = 1 line. fix_en = the English flow ("a → b → c"), taken from the teacher's flow when given. outro = 1 line.
- linking: the linking devices she actually used (count them), grouped into 2-3 groups ("Chuyển đoạn và kết bài", "Dẫn vào ý", "Nối ý chính với phần phát triển"), each with the sid where it appears. result = 2 lines. suggestions = 0-2 upgrades (never replacing the week's framework phrases; prefer the teacher's own suggestions).
- mistakes.groups: put EVERY correction id into exactly one group. Groups are patterns (same underlying rule). Exactly one group has role "main": the most important grammar (GRA) pattern, weighing frequency and how badly it hurts meaning; sentence-level errors (missing verb, comma splice, wrong clause) beat small ones. Vocabulary (LR) patterns are "optional" unless LR is the student's weakest score or the teacher stressed vocabulary: then the biggest LR pattern is "core". Other taught patterns (2+ corrections, a clear rule) are "optional"; one-offs are "other" (fill their teaching fields with short placeholders). title = short Vietnamese name (the teacher may rename). count_line = "Em mắc lỗi này N lần". ask = "N chỗ này có lỗi gì giống nhau?" with 3 options. reason = why she probably made it (1 line, kind). board = 1-2 formulas for a small chalkboard: at most 20 characters each, symbols welcome (→, =, ≠, +), no Vietnamese explanations in brackets (those go in rule), e.g. "children → children's", "decline ≠ reduce sth". rule = 3 lines. example = a new bad/good pair (not from her essay). lr_intro and gra_intro = 3 lines each (intro, a line about the count, a line before the optional ones).
- practice: 4 core items on the main pattern, one of each kind: a "choose" item with sentence "" (3 English sentences as options, pick the correct one), a "choose" item with a sentence containing "___" (3 options), a "tap" item (a sentence with exactly one wrong word; wrong = that word exactly as it appears between spaces, fix = the right word), a "build" item (vi = a Vietnamese sentence, answer_words = 4-8 English chunks in order that form the sentence, extra = 2 wrong chunks). Then 2-4 extra items for the other taught patterns. Each item goes in the list for its kind (choose, tap, build); mistake = the id of its mistake group; ids are unique across the three lists. New sentences on the essay's topic, never copied from her essay. explain = 1 short Vietnamese line. core = the ids of the 4 core items, in the order above. intro = 2 lines ("4 câu thôi á, mỗi câu một kiểu khác nhau").
- rewrite: use the teacher's chosen target if given, else the weakest idea's development ("idea"). label = what she rewrites ("Ý 4 em đã viết"). intro = 2 lines saying it's ${teacher}'s request. task = 1 line (can be empty). flow = English chain with "→". starters = 2-3 sentence starters ending with "…". phrases = 3-4 useful phrases. checklist = 3 short checks. model = the teacher's model when given, else a model written for her level (1-3 sentences).
- praise_candidates: 4-5 specific compliments, each backed by evidence in the essay (evidence = the exact words or fact). at = where it is said: "results", "framework", "linking", "lr", "gra", or "idea:<tag>". The teacher keeps 2-3. Never praise something the teacher marked as a problem.
- takeaway_candidates: 6 short Vietnamese takeaways (the teacher keeps 4), mixing ideas, framework, grammar and vocabulary.
- finish: summary = 2 lines, extra_prompt = "Em muốn luyện thêm {n} câu nữa không?", later = 2 lines, done = 2 lines (the last ends Đậu's part warmly; the page adds a quote after it).

# Hard rules
- Sentence ids (p0s0 …) and correction ids (c1 …) must be ones given to you. Every "focus" and "prompt_focus" must be copied verbatim.
- Idea tags are always "Ý 1".."Ý 4" in essay order, in every part, so the parts fit together.
- Output only the JSON object for the part you are asked for.`;
  const fw = week.framework || {};
  const course = `# This week: ${week.homework}, ${week.essay_type}
Prompt${week.prompts.length > 1 ? "s" : ""}:
${week.prompts.map(p => `- ${p.label}: ${p.prompt}`).join("\n")}

Framework structure:
${(fw.structure || []).map(x => "- " + x).join("\n")}

Framework checklist:
${(fw.checklist || []).map(x => "- " + x).join("\n")}

Framework language (correct by definition):
${(fw.language || []).map(x => "- " + x).join("\n")}`;
  return [
    { type: "text", text: general },
    { type: "text", text: course, cache_control: { type: "ephemeral" } },
  ];
}

/* ---------- what we send about this essay ---------- */
export function userMessage({ page, meta, tags, checklist, notes, rewriteTarget }) {
  const C = page.corrections;
  const sentences = page.essay.paragraphs.flatMap((p, pi) => p.sentences.map(s => ({
    id: s.id, paragraph: pi,
    original: s.segs.map(g => typeof g === "string" ? g : C[g.c].orig).join(""),
    corrected: s.segs.map(g => typeof g === "string" ? g : C[g.c].fix).join(""),
    corrections: s.segs.filter(g => typeof g !== "string").map(g => g.c),
    tag: tags[s.id] || null,
  })));
  const payload = {
    student_full_name: meta.student_full || "",
    homework: meta.homework, track: meta.track || null,
    scores: page.scores, overall: meta.overall, word_count: page.word_count,
    teacher_overall_comment: page.teacher_comment || "",
    sentences,
    corrections: Object.entries(C).map(([id, c]) => ({ id, orig: c.orig, fix: c.fix, kind: c.kind, comment: c.comment })),
    teacher_comments: page.task_comments.map(t => ({ sentence_ids: t.sentence_ids, quote: t.quote, typed_by_teacher: t.added, comment: t.comment })),
    framework_checklist: checklist,                  // [{ item, ok, note }]
    teacher_notes: notes || "",
    rewrite_target: rewriteTarget || null,           // { target, sids } chosen by the teacher, or null
  };
  return "Here is the marked homework.\n\n" + JSON.stringify(payload, null, 1);
}

/* the essay block is the same in every call (cached); the last block names the part */
function partContent(essay, part, extra) {
  return [
    { type: "text", text: essay, cache_control: { type: "ephemeral" } },
    { type: "text", text: `Draft this part of the lesson only: ${PARTS[part].fields}.${extra ? "\n\n" + extra : ""}` },
  ];
}

/* ---------- the calls ---------- */
export class DraftError extends Error {}
const TOO_BIG = /grammar is too large|schema is too (large|complex)/i;

function friendly(e) {
  if (e instanceof DraftError) return e.message;
  if (e instanceof Anthropic.AuthenticationError) return "API key không đúng. Kiểm tra lại trong phần Cài đặt.";
  if (e instanceof Anthropic.PermissionDeniedError) return "API key này không được dùng model này.";
  if (e instanceof Anthropic.RateLimitError) return "Đang bị giới hạn lượt gọi. Đợi một chút rồi thử lại.";
  if (e instanceof Anthropic.APIConnectionError) return "Không kết nối được tới Claude. Kiểm tra mạng rồi thử lại.";
  if (e instanceof Anthropic.APIError) {
    const detail = (e.error && e.error.error && e.error.error.message) || e.message;
    return `Claude báo lỗi (${e.status}): ${detail}`;
  }
  if (e && e.name === "AbortError") return "Đã dừng.";
  return String((e && e.message) || e);
}

function parseJson(text) {
  const t = text.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  try { return JSON.parse(t); } catch (e) { /* fall through */ }
  const i = t.indexOf("{"), j = t.lastIndexOf("}");
  if (i >= 0 && j > i) { try { return JSON.parse(t.slice(i, j + 1)); } catch (e) { /* fall through */ } }
  return undefined;
}

/* one request. strict = structured outputs; otherwise the schema goes in the prompt and the
   reply is checked here (once more with the problems listed if it doesn't fit) */
async function requestPart(client, { part, system, essay, extra, strict, onChars, onFirstEvent, signal }) {
  let hint = "";
  for (let attempt = 0; attempt < (strict ? 1 : 2); attempt++) {
    const ask = strict ? extra : [extra,
      "Reply with only one JSON object that matches this JSON Schema exactly (every field present, no extra fields, no prose, no code fences):",
      JSON.stringify(PARTS[part].schema), hint].filter(Boolean).join("\n\n");
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",                          // a declined request is re-run on a fallback model
      output_config: strict ? { effort: "high", format: { type: "json_schema", schema: PARTS[part].schema } } : { effort: "high" },
      system,
      messages: [{ role: "user", content: partContent(essay, part, ask) }],
    }, { signal });
    let first = true;
    stream.on("streamEvent", () => { if (first) { first = false; if (onFirstEvent) onFirstEvent(); } });
    stream.on("text", t => onChars(t.length));
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new DraftError("Claude từ chối soạn phần này.");
    if (msg.stop_reason === "max_tokens") throw new DraftError("Phần này dài quá nên bị cắt.");
    const data = parseJson(msg.content.filter(b => b.type === "text").map(b => b.text).join(""));
    const problems = data === undefined ? ["không phải JSON"] : checkAgainst(PARTS[part].schema, data);
    if (!problems.length) return { data, usage: msg.usage, model: msg.model };
    if (strict) throw new DraftError("Claude trả về không đúng định dạng.");
    hint = "Your previous reply did not fit the schema: " + problems.slice(0, 10).join("; ") + ". Reply again with the complete JSON.";
  }
  throw new DraftError("Claude trả về không đúng định dạng, kể cả khi thử lại.");
}

/**
 * Draft the lesson: one request per part (PARTS). `done` holds parts already drafted (from an
 * earlier try), which are not asked again. `noStrict` lists parts whose schema the API refused
 * before: they go straight to the checked-here mode. Returns { parts, failed, usage, model, noStrict }:
 * failed = [{ part, label, message }] for the parts that didn't work (retry just those).
 */
export async function draftLesson({ apiKey, week, teacher, input, onProgress, fetchImpl, signal, done = {}, noStrict = [] }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const system = systemBlocks(week, teacher), essay = userMessage(input);
  const refused = new Set(noStrict);
  let chars = 0;
  const onChars = n => { chars += n; if (onProgress) onProgress(chars); };
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let model = MODEL;

  // keep only finished parts that still fit the current schemas
  const have = {};
  for (const [k, v] of Object.entries(done)) if (PARTS[k] && !checkAgainst(PARTS[k].schema, v).length) have[k] = v;
  const todo = Object.keys(PARTS).filter(p => !have[p]);

  async function one(part, extra, onFirstEvent) {
    const args = { part, system, essay, extra, onChars, onFirstEvent, signal };
    let r;
    if (!refused.has(part)) {
      try { r = await requestPart(client, { ...args, strict: true }); }
      catch (e) {
        if (!(e instanceof Anthropic.BadRequestError && TOO_BIG.test(friendly(e)))) throw e;
        refused.add(part);                           // the API can't compile this schema: check it here instead
      }
    }
    if (!r) r = await requestPart(client, { ...args, strict: false });
    model = r.model || model;
    for (const k of Object.keys(usage)) usage[k] += r.usage[k] || 0;
    return r.data;
  }

  const running = {};
  const run = (part, onFirstEvent) => running[part] || (running[part] = (async () => {
    const dep = PARTS[part].after;
    let extra = "";
    if (dep) {
      let d;
      try { d = have[dep] || await run(dep); }
      catch (e) { throw new DraftError(`Cần phần "${PARTS[dep].label}" xong trước.`); }
      extra = "The mistake groups are already drafted. Use these ids for `mistake`, and base the 4 core items on the group with role \"main\":\n" +
        JSON.stringify(d.mistakes.groups.map(g => ({ id: g.id, title: g.title, tab: g.tab, role: g.role, cids: g.cids })));
    }
    return one(part, extra, onFirstEvent);
  })());

  // start one part first, and the others once its essay block is cached (its first event)
  const lead = todo.find(p => !PARTS[p].after || have[PARTS[p].after]);
  if (lead) {
    let go;
    const warm = new Promise(r => { go = r; });
    run(lead, go).catch(() => {}).finally(go);
    await warm;
  }
  const results = await Promise.allSettled(todo.map(p => run(p)));
  const parts = { ...have }, failed = [];
  results.forEach((r, i) => {
    const part = todo[i];
    if (r.status === "fulfilled") parts[part] = r.value;
    else failed.push({ part, label: PARTS[part].label, message: friendly(r.reason) });
  });
  return { parts, failed, usage, model, noStrict: [...refused] };
}

/* the parts -> one draft in the shape draftToLesson reads */
export function mergeParts({ structure, ideas, reading, mistakes, practice, frame }) {
  const P = practice.practice;
  const items = [
    ...P.choose.map(x => ({ ...x, type: "choose" })),
    ...P.tap.map(x => ({ ...x, type: "tap" })),
    ...P.build.map(x => ({ ...x, type: "build" })),
  ];
  const rank = id => { const k = P.core.indexOf(id); return k < 0 ? P.core.length : k; };
  items.sort((a, b) => rank(a.id) - rank(b.id));        // core items first, in the core order (stable)
  const pc = reading.prompt_check;
  return {
    call_name: structure.call_name, framework: structure.framework, ideas: ideas.ideas,
    prompt_check: pc && pc.items.length ? {
      intro: pc.intro,
      items: pc.items.map(it => ({
        sid: it.sid, focus: it.focus, prompt_focus: it.prompt_focus,
        ask: it.ask_q ? { q: it.ask_q, options: it.ask_options, answer: it.ask_answer, right: it.ask_right, wrong: it.ask_wrong } : null,
        line: it.line, fix: it.fix, fix_line: it.fix_line,
      })),
    } : null,
    linking: reading.linking, mistakes: mistakes.mistakes,
    practice: { intro: P.intro, core: P.core, items },
    ...frame,
  };
}

/* ---------- draft + page -> lesson (what the student page reads) ---------- */
export function draftToLesson(draft, { page, meta, teacher, zalo }) {
  const d = structuredClone(draft);
  const groups = d.mistakes.groups;
  const taught = groups.filter(g => g.role !== "other");
  // the page teaches the first GRA pattern in order: put the main one first
  taught.sort((a, b) => (b.role === "main") - (a.role === "main"));
  const lesson = {
    student: d.call_name, teacher, zalo, homework: meta.homework, essay_type: meta.essay_type, prompt: meta.prompt,
    word_target: meta.word_target || 250, overall: meta.overall,
    hello: d.hello, results: d.results,
    framework: { ...d.framework, pairs: [], checklist: [] },
    ...(d.prompt_check && d.prompt_check.items.length ? { prompt_check: {
      intro: d.prompt_check.intro,
      items: d.prompt_check.items.map(it => ({ ...it, ...(it.ask ? {} : { ask: undefined }) })),
    } } : {}),
    ideas: {
      intro: d.ideas.intro, prompt_focus: d.ideas.prompt_focus, overview: d.ideas.overview,
      details: d.ideas.details.map(x => {
        const out = { tag: x.tag, title: x.title, sids: x.sids, chain: x.chain, bad_node: x.mode === "bad_link" && x.bad_node >= 0 ? x.bad_node : null,
          ask: x.ask, fix_intro: x.fix_intro, fix_chain: x.fix_chain, fix_en: x.fix_en, outro: x.outro };
        if (x.mode === "gap") out.gap_after = x.gap_after >= 0 ? x.gap_after : 0;
        if (x.mode === "replace") out.replace = x.fix_label || "Chuỗi ý mới";
        return out;
      }),
    },
    linking: d.linking,
    mistakes: {
      total: Object.keys(page.corrections).length,
      main: taught.map(g => ({ id: g.id, title: g.title, tag: g.tab === "LR" ? "Vocab" : "Grammar", cids: g.cids,
        count_line: g.count_line, ask: g.ask, reason: g.reason, board: g.board, rule: g.rule, example: g.example, tab: g.tab,
        ...(g.role === "core" && g.tab === "LR" ? { core: true } : {}) })),
      others: groups.filter(g => g.role === "other").map(g => ({ label: g.title, cids: g.cids, tag: g.tab })),
      lr_intro: d.mistakes.lr_intro, gra_intro: d.mistakes.gra_intro,
    },
    practice: {
      intro: d.practice.intro, core: d.practice.core,
      items: d.practice.items.map(it => {
        const base = { id: it.id, mistake: it.mistake, type: it.type, explain: it.explain };
        if (it.type === "choose") return { ...base, q: it.q, ...(it.sentence ? { sentence: it.sentence } : {}), options: it.options || [], answer: it.answer ?? 0 };
        if (it.type === "tap") return { ...base, q: it.q || "Chạm vào chữ sai", sentence: it.sentence || "", wrong: it.wrong || "", fix: it.fix || "" };
        return { ...base, vi: it.vi || "", answer: it.answer_words || [], extra: it.extra || [] };
      }),
    },
    rewrite: d.rewrite,
    praise: [], praise_status: "draft",
    finish: { summary: d.finish.summary, takeaways: d.takeaway_candidates.slice(0, 4), extra_prompt: d.finish.extra_prompt, later: d.finish.later, done: d.finish.done, quote: null },
    // page data
    scores: page.scores, word_count: page.word_count, essay: page.essay, corrections: page.corrections, task_comments: page.task_comments,
    // editor-only: what the teacher still has to choose from
    __candidates: { praise: d.praise_candidates, takeaways: d.takeaway_candidates },
    __mistake_roles: Object.fromEntries(groups.map(g => [g.id, g.role])),
  };
  if (lesson.prompt_check) lesson.prompt_check.items.forEach(it => { if (it.ask === undefined) delete it.ask; });
  return lesson;
}
