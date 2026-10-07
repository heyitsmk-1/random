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
        intro: A(S), reveal_intro: A(S), ok: B, verdict: A(S), focus: S,
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
        overview: A(O({ tag: S, text: S, status: E("ok", "improve", "fix"), note: S })),
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
          id: S, title: S, tab: E("LR", "GRA"), cids: A(S), nids: A(S), role: E("main", "core", "optional", "other"),
          count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S, board: A(S), rule: A(S),
          example: O({ bad: S, good: S }),
        })),
        lr_intro: A(S), gra_intro: A(S),
        note_fixes: A(O({ nid: S, better: S })),
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
      results: O({ score: A(S), criteria: S }),
      rewrite: O({
        target: E("idea", "paragraph", "skeleton", "overview", "paraphrase"), label: S, sids: A(S), intro: A(S), task: S,
        flow: S, starters: A(S), phrases: A(S), checklist: A(S), model: S,
      }),
      praise_candidates: A(O({ at: S, line: S, evidence: S })),
      takeaway_candidates: A(S),
      finish: O({ summary: A(S), extra_prompt: S, later: A(S), done: A(S) }),
    }),
  },
};

// Task 1 (Weeks 7–10): the overview against the week's main features, and the data check
PARTS.t1 = {
  label: "Overview và số liệu",
  fields: "t1",
  schema: O({
    t1: O({
      overview: O({ intro: A(S), sids: A(S), features: A(O({ type: E("trend", "difference", "change"), text: S, caught: B, sid: S, note: S })), lines: A(S), model: S }),
      data: O({ intro: S, items: A(O({ sid: S, quote: S, ok: B, fix: S, note: S, series: S, col: S })), verdict: A(S) }),
    }),
  }),
};
// Week 1, exercise 2: one paraphrase per topic
PARTS.paraphrase = {
  label: "Paraphrase",
  fields: "paraphrase",
  schema: O({
    paraphrase: O({ intro: A(S), items: A(O({ topic: S, sid: S, qtype: E("opinion", "two-views", "fact"), checks: A(O({ rule: S, ok: B })), line: S, fix: S })), outro: S }),
  }),
};
/** The parts a week's lesson is drafted in. */
export function partsFor(week) {
  if (week && week.task === 1) return ["structure", "t1", "reading", "mistakes", "practice", "frame"];
  if (week && week.kind === "paragraph+paraphrase") return ["ideas", "paraphrase", "mistakes", "practice", "frame"];
  return ["structure", "ideas", "reading", "mistakes", "practice", "frame"];
}

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
- results: criteria = 1 line introducing the 4 scores, score = 2 lines (the overall band, then what's next). No word count.
- framework: intro = 2 lines naming the essay type and what the structure should be. reveal_intro = 1 line ("Em đã lập luận như sau"). parts = the essay's parts in order (Mở bài, Body 1 · <short label>, Body 2 · <short label>, Kết bài) with the teacher's sentence tags deciding which sentences belong where. Tones: intro and conclusion "orange", Body 1 "mint", Body 2 "sky". summary = 1 line saying in plain Vietnamese what that part does; short = 2-5 words. ideas (bodies only) = the supporting ideas with tag "Ý 1".."Ý 4" in order across both bodies, sid of the sentence that states the idea, text = the idea in Vietnamese (under 10 words), short = 2-4 words. ok = the structure matches the framework per the teacher's checklist. verdict = 2 lines (the last one names what needs work most). focus = that in 2-6 Vietnamese words, shown big on screen (e.g. "cách phát triển từng ý"); "" if nothing needs work.
- prompt_check: only when the teacher's marking shows she misread or didn't answer the question (a wrong reading of the prompt, a thesis/conclusion that doesn't answer the question type); otherwise intro "" and items []. Each item quotes her sentence (sid), focus = the exact words in her sentence (verbatim from the original text), prompt_focus = the exact words in the prompt (verbatim), an optional multiple-choice question (ask_q, ask_options, ask_answer = right index, ask_right/ask_wrong = Đậu's replies; ask_q "" and ask_options [] when there is no question), line = what's wrong (used when there is no question), fix = the corrected sentence (in English, following the framework), fix_line = 1 short line.
- ideas: intro = 3 lines (what the prompt asks, what every idea must reach, then a count such as "2 ý ổn, 1 ý nâng cấp thêm, 1 ý cần sửa"). prompt_focus = the key words of the prompt, verbatim. overview = one row per idea (same tags) with a status: "fix" = the logic breaks (off-topic, a wrong or missing link, the chain never reaches the point; anything the teacher commented on as a problem); "improve" = the logic holds but it could go deeper (an example, a mechanism, a clearer final effect); "ok" = nothing to add. note = 3-7 words (shown on the card; Đậu says nothing per idea). details = one for every idea with status "improve" or "fix", in order (for "improve", the chain is not broken: use mode "missing_end" or "gap" for the step up, and frame ask/fix_intro/outro as an upgrade):
  - sids = the idea's sentences; chain = her reasoning as 2-5 short Vietnamese links (under 9 words each), paraphrased faithfully.
  - bad_node and gap_after are -1 unless the mode uses them.
  - mode "missing_end": the chain stops before reaching the point; fix_chain = links to add at the end.
  - mode "bad_link": one link is wrong or off-topic (bad_node = its index); fix_chain = links to add after it.
  - mode "gap": a link is missing in the middle (gap_after = index of the link before the gap); fix_chain = the missing links.
  - mode "replace": the idea is wordy or circular and should be said again, shorter (fix_label = "Chuỗi ý mới" or similar); fix_chain = the new chain.
  - ask = a Socratic question with 2-3 options and the right index; right/wrong = Đậu's reply to each. fix_intro = 1 line. fix_en = the English flow ("a → b → c"), taken from the teacher's flow when given. outro = 1 line.
- linking: the linking devices she actually used (count them), grouped into 2-3 groups ("Chuyển đoạn và kết bài", "Dẫn vào ý", "Nối ý chính với phần phát triển"), each with the sid where it appears. result = 2 lines. suggestions = 0-2 upgrades (never replacing the week's framework phrases; prefer the teacher's own suggestions). When a line counts the suggestions (suggestions_intro, result), write {n} for the number, never a figure: the page fills it in.
- teacher_comments (ids n1, n2, ...) are spots the teacher highlighted without correcting. Decide from what the comment says: if it says she made a language mistake (grammar, vocabulary, sentence structure, e.g. "hạn chế viết câu đơn"), it belongs in a mistake group (its id in nids) and counts like a correction; idea or logic comments stay out of the groups (they are used for the ideas); praise or neutral remarks stay out. For every note you put in a group, note_fixes gives the better version of her sentence(s) in English (use the teacher's suggestion when the comment has one). teacher_rewrite = the teacher's own rewrite of the highlighted words (quote → teacher_rewrite): it is the teacher's suggestion, use it as is wherever that spot is taught.
- mistakes.groups: put EVERY correction id into exactly one group (cids); notes that are language mistakes go in nids; a group can hold only notes. Groups are patterns (same underlying rule). Exactly one group has role "main": the most important grammar (GRA) pattern, weighing frequency and how badly it hurts meaning; sentence-level errors (missing verb, comma splice, wrong clause) beat small ones. Vocabulary (LR) patterns are "optional" unless LR is the student's weakest score or the teacher stressed vocabulary: then the biggest LR pattern is "core". Other taught patterns (2+ corrections, a clear rule) are "optional"; one-offs are "other" (fill their teaching fields with short placeholders). title = short Vietnamese name (the teacher may rename). count_line = "Em mắc lỗi này {n} lần" (write {n} literally: the page fills in the group's size, so it stays right when the teacher moves things). ask = "N chỗ này có lỗi gì giống nhau?" with 3 options. reason = why she probably made it (1 line, kind). board = 1-2 formulas for a small chalkboard: at most 20 characters each, symbols welcome (→, =, ≠, +), no Vietnamese explanations in brackets (those go in rule), e.g. "children → children's", "decline ≠ reduce sth". rule = 3 lines. example = a new bad/good pair (not from her essay). lr_intro and gra_intro = 3 lines each (intro, a line about the count, a line before the optional ones); for the number of mistakes in that tab write {n}, never a figure.
- practice: 4 core items on the main pattern, one of each kind: a "choose" item with sentence "" (3 English sentences as options, pick the correct one), a "choose" item with a sentence containing "___" (3 options), a "tap" item (a sentence with exactly one wrong word; wrong = that word exactly as it appears between spaces, fix = the right word), a "build" item (vi = a Vietnamese sentence, answer_words = 4-8 English chunks in order that form the sentence, extra = 2 wrong chunks). Then 2-4 extra items for the other taught patterns. Each item goes in the list for its kind (choose, tap, build); mistake = the id of its mistake group; ids are unique across the three lists. New sentences on the essay's topic, never copied from her essay. explain = 1 short Vietnamese line. core = the ids of the 4 core items, in the order above. intro = 2 lines ("4 câu thôi á, mỗi câu một kiểu khác nhau").
- rewrite: use the teacher's chosen target if given, else the weakest idea's development ("idea"). When the teacher picked sentences (rewrite_target.sids), the rewrite is exactly those sentences: sids = them, and label, intro, task, flow and model talk about nothing else (no other sentence, idea or paragraph); the model is about as long as what she wrote there. label = what she rewrites ("Ý 4 em đã viết"). intro = 2 lines saying it's ${teacher}'s request. task = 1 line (can be empty). flow = English chain with "→". starters = 2-3 sentence starters ending with "…". phrases = 3-4 useful phrases. checklist = 3 short checks. model = the teacher's model when given, else a model written for her level (1-3 sentences).
- praise_candidates: 4-5 specific compliments, each backed by evidence in the essay (evidence = the exact words or fact). at = where it is said: "results", "framework", "linking", "lr", "gra", or "idea:<tag>". The teacher keeps 2-3. Never praise something the teacher marked as a problem.
- takeaway_candidates: 6 short Vietnamese takeaways (the teacher keeps 4), mixing ideas, framework, grammar and vocabulary.
- finish: summary = 2 lines, extra_prompt = "Em muốn luyện thêm {n} câu nữa không?", later = 2 lines, done = 2 lines (the last ends Đậu's part warmly; the page adds a quote after it).

# Hard rules
- Sentence ids (p0s0 …) and correction ids (c1 …) must be ones given to you. Every "focus" and "prompt_focus" must be copied verbatim.
- Idea tags are always "Ý 1".."Ý 4" in essay order, in every part, so the parts fit together.
- Output only the JSON object for the part you are asked for.`;
  const fw = week.framework || {};
  const course = `# This week: ${week.homework}, ${week.essay_type}
${kindNotes(week)}

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

/* what is different about this homework type (Task 1 reports, Week 1 exercises) */
function kindNotes(week) {
  if (week.task === 1) {
    const kind = week.kind.replace("task1-", "");
    const overview = kind === "pie" ? "Differences (the largest/smallest parts and the biggest differences between the charts; a pie shows one moment, so there are no trends)"
      : kind === "map" ? "Main changes (what is added, removed, moved or replaced overall)"
      : "Trends (the main rises/falls over the period) and Differences (the biggest gaps between the items)";
    return `
## This is an IELTS Task 1 report (${kind}), not an essay
The student describes the data; there are no arguments, so there is no ideas part. The teacher's tags are: Introduction, ${kind === "map" ? "Main changes" : kind === "pie" ? "Differences" : "Trends, Differences"}, Body 1, Body 2. Keep the English words "Trends", "Differences", "Main changes", "Data" as they are in Đậu's lines.
- structure (framework): parts = Introduction (tone "orange"), Overview (tone "orange", ideas = one chip per overview element: tag "Trends"/"Differences"/"Main changes", short = 2-4 words), Body 1 (tone "mint", ideas = the data groups it covers, e.g. tag "Nhóm 1", short "Football, Golf"), Body 2 (tone "sky", same). ok = the structure and the grouping follow the checklist (e.g. the grouping rule). verdict says whether the grouping follows the week's rule.
- t1.overview: sids = her overview sentence(s) ([] if she wrote none). features = the week's main features (main_features in the data below; if there are none, the 2-3 most important ${overview.split(" (")[0]} you read from the data yourself), one each: type "trend"/"difference"/"change", text = the feature in short English, caught = her overview names it, sid = where (or ""), note = 3-8 Vietnamese words. intro = 2 lines (what an overview must have: ${overview}). lines = 2 lines (what she caught, what to add). model = a better overview for her essay in 1-2 English sentences (the teacher's version when given).
- t1.data: check the numbers and comparisons in her bodies against the data below (tolerance as given). items = 3-6 checks, wrong ones first then a few right ones: sid, quote = her exact words with the figure, ok, fix = the correct statement in English ("" when ok), note = 1 Đậu line, series and col = the row and column of the figure in the data (e.g. series "Rugby", col "2010"; for a pie: the chart name and the category; for a map: the area and "Now"/"Future"). intro = 1 line, verdict = 1-2 lines.
- reading.linking: instead of linking devices, the language of ${kind === "map" ? "change and location" : kind === "pie" ? "comparison and proportion" : "trends and comparison"} she used (groups like "Xu hướng", "So sánh", "Số liệu"), with suggestions to upgrade. prompt_check: intro "" and items [].
- rewrite target: "overview" or "paragraph" (one body).
- praise "at" can also be "overview" or "data".

Data (${week.chart && week.chart.unit ? "unit: " + week.chart.unit : "no unit"}${week.chart && week.chart.time ? ", time: " + week.chart.time : ""}):
${JSON.stringify(week.chart || {})}`;
  }
  if (week.kind === "paragraph+paraphrase") return `
## This is the Week 1 homework: two exercises, not an essay
- Exercise 1: one body paragraph (topic sentence + 2 supporting ideas, each core idea → development) on the Exercise 1 prompt. The ideas part covers this paragraph: overview = its 2 ideas ("Ý 1", "Ý 2"); intro talks about the topic sentence and what each idea must reach.
- Exercise 2: the student paraphrases each topic's prompt (lines starting "Topic N:"), with no thesis. paraphrase.items = one per topic, in order: topic = "Topic N", sid, qtype from the prompt ("opinion", "two-views", "fact"), checks = 3-4 rules from the checklist with ok true/false (e.g. "Đúng cấu trúc cho đề ý kiến: Opinions are divided on whether…", "Không có thesis", "Giữ đúng nghĩa đề", "Thay từ đồng nghĩa"), line = 1 Đậu line, fix = a corrected paraphrase in English (the teacher's when the comment gives one, else only when a check fails, else ""). intro = 2 lines, outro = 1 line.
- There are no band scores: results.score and results.criteria can be short and general.
- rewrite target: "paraphrase" (one topic) or "paragraph".
- praise "at" can also be "paraphrase".`;
  return "";
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
    teacher_comments: page.task_comments.map((t, i) => ({ id: "n" + (i + 1), highlight: t.kind || null, sentence_ids: t.sentence_ids, quote: t.quote, typed_by_teacher: t.added,
      teacher_rewrite: t.fix || null, comment: t.comment })),
    framework_checklist: checklist,                  // [{ item, ok, note }]
    teacher_notes: notes || "",
    rewrite_target: rewriteTarget || null,           // { target, sids } chosen by the teacher, or null
  };
  return "Here is the marked homework.\n\n" + JSON.stringify(payload, null, 1);
}

/* the essay block is the same in every call (cached); the last block names the part */
/* essay: one text, or several (flow 2: the marked essay, then the teacher's decisions), each cached:
   a later request with other decisions still reads the essay from the cache */
function partContent(essay, fields, extra) {
  return [
    ...[essay].flat().map(text => ({ type: "text", text, cache_control: { type: "ephemeral" } })),
    { type: "text", text: `Draft this part of the lesson only: ${fields}.${extra ? "\n\n" + extra : ""}` },
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
async function requestPart(client, { part, spec, system, essay, extra, strict, onChars, onFirstEvent, signal, onUsage = () => {}, model = MODEL, effort = "high" }) {
  const P = spec || PARTS[part];
  let hint = "";
  for (let attempt = 0; attempt < (strict ? 1 : 2); attempt++) {
    const ask = strict ? extra : [extra,
      "Reply with only one JSON object that matches this JSON Schema exactly (every field present, no extra fields, no prose, no code fences):",
      JSON.stringify(P.schema), hint].filter(Boolean).join("\n\n");
    const stream = client.beta.messages.stream({
      model,
      max_tokens: 32000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",                          // a declined request is re-run on a fallback model
      output_config: strict ? { effort, format: { type: "json_schema", schema: P.schema } } : { effort },
      system,
      messages: [{ role: "user", content: partContent(essay, P.fields, ask) }],
    }, { signal });
    let first = true;
    stream.on("streamEvent", () => { if (first) { first = false; if (onFirstEvent) onFirstEvent(); } });
    stream.on("text", t => onChars(t.length));
    const msg = await stream.finalMessage();
    onUsage(msg.usage, msg.model);                   // every attempt is billed, kept or not
    if (msg.stop_reason === "refusal") throw new DraftError("Claude từ chối soạn phần này.");
    if (msg.stop_reason === "max_tokens") throw new DraftError("Phần này dài quá nên bị cắt.");
    const data = parseJson(msg.content.filter(b => b.type === "text").map(b => b.text).join(""));
    const problems = data === undefined ? ["không phải JSON"] : checkAgainst(P.schema, data);
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
export async function draftLesson({ apiKey, week, teacher, input, onProgress, fetchImpl, signal, done = {}, noStrict = [],
  specs = PARTS, list = null, system = null, essay = null, depExtra = null }) {
  // specs/list/system/essay/depExtra let another lesson layout (draft2.js) run its own parts through the same machinery
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  system = system || systemBlocks(week, teacher); essay = essay || userMessage(input);
  const refused = new Set(noStrict);
  let chars = 0;
  const onChars = n => { chars += n; if (onProgress) onProgress(chars); };
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let model = MODEL;

  // keep only finished parts that still fit the current schemas
  const have = {};
  for (const [k, v] of Object.entries(done)) if (specs[k] && !checkAgainst(specs[k].schema, v).length) have[k] = v;
  const todo = (list || partsFor(week)).filter(p => !have[p]);

  async function one(part, extra, onFirstEvent) {
    const onUsage = (u, m) => { for (const k of Object.keys(usage)) usage[k] += (u && u[k]) || 0; model = m || model; };
    const args = { part, spec: specs[part], system, essay, extra, onChars, onFirstEvent, signal, onUsage };
    let r;
    if (!refused.has(part)) {
      try { r = await requestPart(client, { ...args, strict: true }); }
      catch (e) {
        if (!(e instanceof Anthropic.BadRequestError && TOO_BIG.test(friendly(e)))) throw e;
        refused.add(part);                           // the API can't compile this schema: check it here instead
      }
    }
    if (!r) r = await requestPart(client, { ...args, strict: false });
    return r.data;
  }

  const running = {};
  const run = (part, onFirstEvent) => running[part] || (running[part] = (async () => {
    const dep = specs[part].after;
    let extra = "";
    if (dep) {
      let d;
      try { d = have[dep] || await run(dep); }
      catch (e) { throw new DraftError(`Cần phần "${specs[dep].label}" xong trước.`); }
      extra = depExtra ? depExtra(dep, d) : "The mistake groups are already drafted. Use these ids for `mistake`, and base the 4 core items on the group with role \"main\":\n" +
        JSON.stringify(d.mistakes.groups.map(g => ({ id: g.id, title: g.title, tab: g.tab, role: g.role, cids: g.cids, nids: g.nids })));
    }
    return one(part, extra, onFirstEvent);
  })());

  // start one part first, and the others once its essay block is cached (its first event)
  const lead = todo.find(p => !specs[p].after || have[specs[p].after] || !todo.includes(specs[p].after));
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
    else failed.push({ part, label: specs[part].label, message: friendly(r.reason) });
  });
  return { parts, failed, usage, model, noStrict: [...refused] };
}

/* ---------- small calls from the editor ---------- */
const GROUP_SPEC = {
  fields: "the teaching of one mistake group",
  schema: O({ count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S, board: A(S), rule: A(S), example: O({ bad: S, good: S }), better: A(S) }),
};
function groupBrief(L, g) {
  const C = L.corrections || {};
  return {
    title: g.title, tab: g.tab,
    corrections: g.cids.map(c => C[c] && { orig: C[c].orig, fix: C[c].fix, comment: C[c].comment }).filter(Boolean),
    notes: (g.points || []).map(p => ({ sentence_ids: p.sids, quote: p.quote, comment: p.comment, better: p.better })),
  };
}
async function smallCall({ apiKey, week, teacher, input, spec, extra, fetchImpl, signal }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const args = { spec, system: systemBlocks(week, teacher), essay: userMessage(input), extra, onChars: () => {}, signal };
  try {
    try { return (await requestPart(client, { ...args, strict: true })).data; }
    catch (e) {
      if (!(e instanceof Anthropic.BadRequestError && TOO_BIG.test(friendly(e)))) throw e;
      return (await requestPart(client, { ...args, strict: false })).data;
    }
  } catch (e) { throw new DraftError(friendly(e)); }
}

/** Teaching for one mistake group the teacher made or changed. Returns the fields + better[] (one per note). */
export async function draftGroup({ group, lesson, ...rest }) {
  return smallCall({ ...rest, spec: GROUP_SPEC,
    extra: "The teacher set up this mistake group. Write its teaching with the same rules as mistakes.groups (count_line, ask with 3 options, reason, board, rule, example). better = for each of its notes, in order, the better version of her sentence(s) in English (keep the teacher's version when the note already has one).\nGroup: " + JSON.stringify(groupBrief(lesson, group)) });
}

/** New exercises for the current mistake groups (after the teacher changed the main one). */
export async function redraftPractice({ lesson, ...rest }) {
  const roles = lesson.__mistake_roles || {};
  const M = lesson.mistakes;
  const groups = [
    ...M.main.map((g, i) => ({ id: g.id, role: roles[g.id] || (i === 0 && g.tab === "GRA" ? "main" : g.core ? "core" : "optional"), ...groupBrief(lesson, g) })),
    ...M.others.map(o => ({ title: o.label, tab: o.tag, role: "other" })),
  ];
  const data = await smallCall({ ...rest, spec: PARTS.practice,
    extra: "The mistake groups are set. Use these ids for `mistake`, and base the 4 core items on the group with role \"main\":\n" + JSON.stringify(groups) });
  return practiceToLesson({ intro: data.practice.intro, core: data.practice.core, items: practiceItems(data.practice) });
}

/* the parts -> one draft in the shape draftToLesson reads */
/* the practice part (three lists by kind) -> one list, core items first in the core order */
function practiceItems(P) {
  const items = [
    ...P.choose.map(x => ({ ...x, type: "choose" })),
    ...P.tap.map(x => ({ ...x, type: "tap" })),
    ...P.build.map(x => ({ ...x, type: "build" })),
  ];
  const rank = id => { const k = P.core.indexOf(id); return k < 0 ? P.core.length : k; };
  return items.sort((a, b) => rank(a.id) - rank(b.id));
}
/* practice in draft shape -> what the student page reads */
function practiceToLesson(p) {
  return {
    intro: p.intro, core: p.core,
    items: p.items.map(it => {
      const base = { id: it.id, mistake: it.mistake, type: it.type, explain: it.explain };
      if (it.type === "choose") return { ...base, q: it.q, ...(it.sentence ? { sentence: it.sentence } : {}), options: it.options || [], answer: it.answer ?? 0 };
      if (it.type === "tap") return { ...base, q: it.q || "Chạm vào chữ sai", sentence: it.sentence || "", wrong: it.wrong || "", fix: it.fix || "" };
      return { ...base, vi: it.vi || "", answer: it.answer_words || [], extra: it.extra || [] };
    }),
  };
}

export function mergeParts({ structure, ideas, reading, mistakes, practice, frame, t1, paraphrase }) {
  const P = practice.practice;
  const items = practiceItems(P);
  const pc = reading && reading.prompt_check;
  return {
    call_name: structure ? structure.call_name : "", framework: structure ? structure.framework : null, ideas: ideas ? ideas.ideas : null,
    t1: t1 ? t1.t1 : null, paraphrase: paraphrase ? paraphrase.paraphrase : null,
    prompt_check: pc && pc.items.length ? {
      intro: pc.intro,
      items: pc.items.map(it => ({
        sid: it.sid, focus: it.focus, prompt_focus: it.prompt_focus,
        ask: it.ask_q ? { q: it.ask_q, options: it.ask_options, answer: it.ask_answer, right: it.ask_right, wrong: it.ask_wrong } : null,
        line: it.line, fix: it.fix, fix_line: it.fix_line,
      })),
    } : null,
    linking: reading ? reading.linking : null, mistakes: mistakes.mistakes,
    practice: { intro: P.intro, core: P.core, items },
    ...frame,
  };
}

export const pointOf = t => ({ sids: t.sentence_ids, quote: t.quote || "", comment: t.comment || "", ...(t.fix ? { fix: t.fix } : {}) });

/* ---------- draft + page -> lesson (what the student page reads) ---------- */
export function draftToLesson(draft, { page, meta, teacher, zalo, week = null }) {
  const d = structuredClone(draft);
  const groups = d.mistakes.groups;
  // a highlighted note in a group: her sentence(s), the teacher's comment, a better version
  const fixes = Object.fromEntries((d.mistakes.note_fixes || []).map(f => [f.nid, f.better]));
  const points = g => (g.nids || []).map(nid => page.task_comments[+nid.slice(1) - 1] && ({ nid, ...pointOf(page.task_comments[+nid.slice(1) - 1]), better: page.task_comments[+nid.slice(1) - 1].fix || fixes[nid] || "" })).filter(Boolean);
  const taught = groups.filter(g => g.role !== "other");
  // the page teaches the first GRA pattern in order: put the main one first
  taught.sort((a, b) => (b.role === "main") - (a.role === "main"));
  const lesson = {
    student: d.call_name, teacher, zalo, homework: meta.homework, essay_type: meta.essay_type, prompt: meta.prompt,
    word_target: meta.word_target || 250, overall: meta.overall,
    hello: d.hello, results: d.results,
    ...(d.framework ? { framework: { ...d.framework, pairs: [], checklist: [] } } : {}),
    ...(d.prompt_check && d.prompt_check.items.length ? { prompt_check: {
      intro: d.prompt_check.intro,
      items: d.prompt_check.items.map(it => ({ ...it, ...(it.ask ? {} : { ask: undefined }) })),
    } } : {}),
    ...(d.ideas ? { ideas: {
      intro: d.ideas.intro, prompt_focus: d.ideas.prompt_focus,
      overview: d.ideas.overview.map(o => ({ ...o, ok: o.status === "ok" })),
      details: d.ideas.details.map(x => {
        const out = { tag: x.tag, title: x.title, sids: x.sids, chain: x.chain, bad_node: x.mode === "bad_link" && x.bad_node >= 0 ? x.bad_node : null,
          ask: x.ask, fix_intro: x.fix_intro, fix_chain: x.fix_chain, fix_en: x.fix_en, outro: x.outro };
        if (x.mode === "gap") out.gap_after = x.gap_after >= 0 ? x.gap_after : 0;
        if (x.mode === "replace") out.replace = x.fix_label || "Chuỗi ý mới";
        return out;
      }),
    } } : {}),
    ...(d.linking ? { linking: { ...d.linking, ...(week && week.task === 1 ? { title: week.kind === "task1-map" ? "Language of change" : "Language of trends & comparison", count_label: "cụm em đã dùng" } : {}) } } : {}),
    // Task 1: the chart travels with the lesson, so the page can draw it
    ...(d.t1 && week ? { t1: { kind: week.kind.replace("task1-", ""), chart: week.chart || {}, ...d.t1 } } : {}),
    // Week 1: each topic with its prompt
    ...(d.paraphrase && week ? { paraphrase: { ...d.paraphrase, items: d.paraphrase.items.map(it => {
      const n = +((/\d+/.exec(it.topic) || [])[0]);
      const p = week.prompts.find(x => x.id === "ex2-" + n);
      return { ...it, prompt: p ? p.prompt : "" };
    }) } } : {}),
    ...(week && week.kind === "paragraph+paraphrase" ? { tabs: [["TR", "EX1", null, "Exercise 1 · Đoạn văn"], ["PARA", "EX2", null, "Exercise 2 · Paraphrase"], ["LR", "LR", null, "Từ vựng"], ["GRA", "GRA", null, "Ngữ pháp"]] } : {}),
    ...(week && week.task === 1 ? { tabs: [["TR", "TA", "TR", "Overview & data"], ["CC", "CC", "CC", "Liên kết"], ["LR", "LR", "LR", "Từ vựng"], ["GRA", "GRA", "GR", "Ngữ pháp"]] } : {}),
    mistakes: {
      total: Object.keys(page.corrections).length,
      main: taught.map(g => ({ id: g.id, title: g.title, tag: g.tab === "LR" ? "Vocab" : "Grammar", cids: g.cids, points: points(g),
        count_line: g.count_line, ask: g.ask, reason: g.reason, board: g.board, rule: g.rule, example: g.example, tab: g.tab,
        ...(g.role === "core" && g.tab === "LR" ? { core: true } : {}) })),
      others: groups.filter(g => g.role === "other").map(g => ({ label: g.title, cids: g.cids, points: points(g), tag: g.tab })),
      lr_intro: d.mistakes.lr_intro, gra_intro: d.mistakes.gra_intro,
    },
    practice: practiceToLesson(d.practice),
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

/* one standalone request with its own model (flow 2's suggestions): strict, else checked here */
export async function oneCall({ apiKey, spec, system, essay, extra = "", model, effort = "medium", fetchImpl, signal }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  const usage = { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 };
  let used = model;
  const onUsage = (u, m) => { for (const k of Object.keys(usage)) usage[k] += (u && u[k]) || 0; used = m || used; };
  const args = { spec, system, essay, extra, onChars: () => {}, signal, onUsage, model, effort };
  try {
    let r;
    try { r = await requestPart(client, { ...args, strict: true }); }
    catch (e) {
      if (!(e instanceof Anthropic.BadRequestError && TOO_BIG.test(friendly(e)))) throw e;
      r = await requestPart(client, { ...args, strict: false });
    }
    return { data: r.data, usage, model: used };
  } catch (e) { const err = new DraftError(friendly(e)); err.usage = usage; err.model = used; throw err; }
}

/* the building blocks draft2.js (the flow-2 lesson) shares */
export { S, I, B, A, E, O, ASK, practiceItems, practiceToLesson };
