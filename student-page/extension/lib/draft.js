/* Draft a lesson with Claude, from the extracted page + the teacher's framework tagging.
   One streaming request; the reply is JSON that matches DRAFT_SCHEMA (structured outputs).
   Everything the model writes is marked "AI" in the editor until the teacher approves it. */
import Anthropic from "../vendor/anthropic.mjs";

export const MODEL = "claude-opus-5-5";

/* ---------- output schema (strict: every object closed, every field required) ---------- */
const S = { type: "string" };
const I = { type: "integer" };
const B = { type: "boolean" };
const A = items => ({ type: "array", items });
const N = schema => ({ anyOf: [schema, { type: "null" }] });
const O = props => ({ type: "object", properties: props, required: Object.keys(props), additionalProperties: false });
const ASK = O({ q: S, options: A(S), answer: I, right: S, wrong: S });

export const DRAFT_SCHEMA = O({
  call_name: S,
  hello: A(S),
  results: O({ words: A(S), score: A(S), criteria: S }),
  framework: O({
    intro: A(S), reveal_intro: A(S), ok: B, verdict: A(S),
    parts: A(O({ label: S, tone: { type: "string", enum: ["orange", "mint", "sky"] }, sids: A(S), summary: S, short: S,
      ideas: A(O({ tag: S, sid: S, text: S, short: S })) })),
  }),
  prompt_check: N(O({ intro: S, items: A(O({ sid: S, focus: S, prompt_focus: S, ask: N(ASK), line: S, fix: S, fix_line: S })) })),
  ideas: O({
    intro: A(S), prompt_focus: S,
    overview: A(O({ tag: S, text: S, ok: B, note: S, line: S })),
    details: A(O({
      tag: S, title: S, sids: A(S), chain: A(S),
      mode: { type: "string", enum: ["missing_end", "bad_link", "gap", "replace"] },
      bad_node: N(I), gap_after: N(I), ask: ASK, fix_intro: S, fix_chain: A(S), fix_label: S, fix_en: S, outro: S,
    })),
  }),
  linking: O({
    intro: A(S), count: I, result: A(S),
    groups: A(O({ label: S, items: A(O({ text: S, sid: S })) })),
    suggestions_intro: S, suggestions: A(O({ sid: S, from: S, to: S, why: S })),
  }),
  mistakes: O({
    groups: A(O({
      id: S, title: S, tab: { type: "string", enum: ["LR", "GRA"] }, cids: A(S),
      role: { type: "string", enum: ["main", "core", "optional", "other"] },
      count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S, board: A(S), rule: A(S),
      example: O({ bad: S, good: S }),
    })),
    lr_intro: A(S), gra_intro: A(S),
  }),
  practice: O({
    intro: A(S), core: A(S),
    items: A(O({
      id: S, mistake: S, type: { type: "string", enum: ["choose", "tap", "build"] }, q: S,
      sentence: N(S), options: N(A(S)), answer_index: N(I), wrong: N(S), fix: N(S),
      vi: N(S), answer_words: N(A(S)), extra: N(A(S)), explain: S,
    })),
  }),
  rewrite: O({
    target: { type: "string", enum: ["idea", "paragraph", "skeleton"] }, label: S, sids: A(S), intro: A(S), task: S,
    flow: S, starters: A(S), phrases: A(S), checklist: A(S), model: S,
  }),
  praise_candidates: A(O({ at: S, line: S, evidence: S })),
  takeaway_candidates: A(S),
  finish: O({ summary: A(S), extra_prompt: S, later: A(S), done: A(S) }),
});

/* ---------- the instructions (stable per week, so they are cached) ---------- */
export function systemBlocks(week, teacher) {
  const general = `You prepare a short, friendly review of a student's marked IELTS Writing homework. The student reads it on a phone. It is spoken by "anh Đậu", a teaching assistant of ${teacher}. You write the whole lesson as JSON; the teacher then checks and edits every line before it goes to the student.

# Who decides what
- The teacher's marking is the source of truth: corrections, comments, the framework checklist the teacher ticked, and the teacher's overall comment. Build on it; never contradict it, never re-grade, never invent new corrections.
- Comments that were AI-generated in the grading system were already filtered by the teacher: everything you are given counts as the teacher's.
- Where the teacher gave a model sentence, a flow ("->" chains) or a suggestion, use it as is (you may shorten it, never replace it with your own).
- The course framework for this week (below) is how the class is taught. Its phrases are correct by definition: never mark them as mistakes, never suggest replacing them (for example "far more impactful", "The first one is that", "On the one hand, I can understand why some people believe that").
- Where the teacher said nothing, use your own judgement sparingly: at most one extra point per module, and only when clearly true.

# Đậu's voice (Vietnamese)
- Đậu calls himself "anh" and the student "em". Mix in natural particles: "nha", "nhen", "nè", "á", "nha em", "em nhen", and the student's name.
- Never end a line with a full stop, and avoid full stops inside lines; split long thoughts into separate lines instead. Commas are fine.
- Emoticons only in these forms: ": )", ": ]]", ":)))))". Use them rarely: at most one in the hello, one in the framework verdict, one at the very end. Never use emoji.
- Cute but authoritative, like a caring older brother. Not quirky, not flamboyant, no slang overload, no exclamation marks in a row.
- Lines are short: one idea per line, usually under 20 words. English words and phrases from the essay stay in English.
- Refer to the teacher as "${teacher}".

# The lesson, module by module
- call_name: what Đậu calls the student (the given name at the end of the full name; two words if the last word alone is a common second part such as "Anh").
- hello: 2 lines. Line 1 introduces Đậu as ${teacher}'s TA. Line 2 says you'll look at the homework together.
- results: words = 2 lines about the word count (target 250 for Task 2), score = 2 lines (the overall band, then what's next), criteria = 1 line introducing the 4 scores.
- framework: intro = 2 lines naming the essay type and what the structure should be. reveal_intro = 1 line ("Em đã lập luận như sau"). parts = the essay's parts in order (Mở bài, Body 1 · <short label>, Body 2 · <short label>, Kết bài) with the teacher's sentence tags deciding which sentences belong where. Tones: intro and conclusion "orange", Body 1 "mint", Body 2 "sky". summary = 1 line saying in plain Vietnamese what that part does; short = 2-5 words. ideas (bodies only) = the supporting ideas with tag "Ý 1".."Ý 4" in order across both bodies, sid of the sentence that states the idea, text = the idea in Vietnamese (under 10 words), short = 2-4 words. ok = the structure matches the framework per the teacher's checklist. verdict = 2 lines.
- prompt_check: only when the teacher's marking shows she misread or didn't answer the question (a wrong reading of the prompt, a thesis/conclusion that doesn't answer the question type); otherwise null. Each item quotes her sentence (sid), focus = the exact words in her sentence (verbatim from the original text), prompt_focus = the exact words in the prompt (verbatim), an optional multiple-choice ask, line = what's wrong, fix = the corrected sentence (in English, following the framework), fix_line = 1 short line.
- ideas: intro = 3 lines (what the prompt asks, what every idea must reach, then a count of how many ideas are fine vs need work). prompt_focus = the key words of the prompt, verbatim. overview = one row per idea (same tags): ok = no problem found by the teacher; note = 3-7 words; line = one Đậu line about it. details = only for ideas with a problem, in order:
  - sids = the idea's sentences; chain = her reasoning as 2-5 short Vietnamese links (under 9 words each), paraphrased faithfully.
  - mode "missing_end": the chain stops before reaching the point (bad_node null, gap_after null); fix_chain = links to add at the end.
  - mode "bad_link": one link is wrong or off-topic (bad_node = its index); fix_chain = links to add after it.
  - mode "gap": a link is missing in the middle (gap_after = index of the link before the gap); fix_chain = the missing links.
  - mode "replace": the idea is wordy or circular and should be said again, shorter (fix_label = "Chuỗi ý mới" or similar); fix_chain = the new chain.
  - ask = a Socratic question with 2-3 options and the right index; right/wrong = Đậu's reply to each. fix_intro = 1 line. fix_en = the English flow ("a → b → c"), taken from the teacher's flow when given. outro = 1 line.
- linking: the linking devices she actually used (count them), grouped into 2-3 groups ("Chuyển đoạn và kết bài", "Dẫn vào ý", "Nối ý chính với phần phát triển"), each with the sid where it appears. result = 2 lines. suggestions = 0-2 upgrades (never replacing the week's framework phrases; prefer the teacher's own suggestions).
- mistakes.groups: put EVERY correction id into exactly one group. Groups are patterns (same underlying rule). Exactly one group has role "main": the most important grammar (GRA) pattern, weighing frequency and how badly it hurts meaning; sentence-level errors (missing verb, comma splice, wrong clause) beat small ones. Vocabulary (LR) patterns are "optional" unless LR is the student's weakest score or the teacher stressed vocabulary: then the biggest LR pattern is "core". Other taught patterns (2+ corrections, a clear rule) are "optional"; one-offs are "other" (fill their teaching fields with short placeholders). title = short Vietnamese name (the teacher may rename). count_line = "Em mắc lỗi này N lần". ask = "N chỗ này có lỗi gì giống nhau?" with 3 options. reason = why she probably made it (1 line, kind). board = 1-3 very short formulas. rule = 3 lines. example = a new bad/good pair (not from her essay). lr_intro and gra_intro = 3 lines each (intro, a line about the count, a line before the optional ones).
- practice: 4 core items on the main pattern, one of each kind: "choose" without sentence (3 English sentences, pick the correct one), "choose" with a sentence containing "___" (3 options), "tap" (a sentence with exactly one wrong word; wrong = that word exactly as it appears between spaces, fix = the right word), "build" (vi = a Vietnamese sentence, answer_words = 4-8 English chunks in order that form the sentence, extra = 2 wrong chunks). Then 2-4 extra items for the other taught patterns. New sentences on the essay's topic, never copied from her essay. explain = 1 short Vietnamese line. Fields that don't apply to a type are null. core = the ids of the 4 core items. intro = 2 lines ("4 câu thôi á, mỗi câu một kiểu khác nhau").
- rewrite: use the teacher's chosen target if given, else the weakest idea's development ("idea"). label = what she rewrites ("Ý 4 em đã viết"). intro = 2 lines saying it's ${teacher}'s request. task = 1 line (can be empty). flow = English chain with "→". starters = 2-3 sentence starters ending with "…". phrases = 3-4 useful phrases. checklist = 3 short checks. model = the teacher's model when given, else a model written for her level (1-3 sentences).
- praise_candidates: 4-5 specific compliments, each backed by evidence in the essay (evidence = the exact words or fact). at = where it is said: "results", "framework", "linking", "lr", "gra", or "idea:<tag>". The teacher keeps 2-3. Never praise something the teacher marked as a problem.
- takeaway_candidates: 6 short Vietnamese takeaways (the teacher keeps 4), mixing ideas, framework, grammar and vocabulary.
- finish: summary = 2 lines, extra_prompt = "Em muốn luyện thêm {n} câu nữa không?", later = 2 lines, done = 2 lines (the last ends Đậu's part warmly; the page adds a quote after it).

# Hard rules
- Sentence ids (p0s0 …) and correction ids (c1 …) must be ones given to you. Every "focus" and "prompt_focus" must be copied verbatim.
- Output only the JSON object.`;
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
  return "Here is the marked homework. Draft the lesson.\n\n" + JSON.stringify(payload, null, 1);
}

/* ---------- the call ---------- */
export class DraftError extends Error {}

export async function draftLesson({ apiKey, week, teacher, input, onProgress, fetchImpl, signal }) {
  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true, ...(fetchImpl ? { fetch: fetchImpl } : {}) });
  let chars = 0;
  try {
    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 64000,
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",                          // a declined request is re-run on a fallback model
      output_config: { effort: "high", format: { type: "json_schema", schema: DRAFT_SCHEMA } },
      system: systemBlocks(week, teacher),
      messages: [{ role: "user", content: userMessage(input) }],
    }, { signal });
    stream.on("text", t => { chars += t.length; if (onProgress) onProgress(chars); });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") throw new DraftError("Claude từ chối soạn bài này. Thử lại, hoặc soạn tay trong trình sửa.");
    if (msg.stop_reason === "max_tokens") throw new DraftError("Bản nháp dài quá nên bị cắt. Thử lại nha.");
    const text = msg.content.filter(b => b.type === "text").map(b => b.text).join("");
    let draft;
    try { draft = JSON.parse(text); } catch (e) { throw new DraftError("Claude trả về không đúng định dạng. Thử lại nha."); }
    return { draft, usage: msg.usage, model: msg.model };
  } catch (e) {
    if (e instanceof DraftError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new DraftError("API key không đúng. Kiểm tra lại trong phần Cài đặt.");
    if (e instanceof Anthropic.PermissionDeniedError) throw new DraftError("API key này không được dùng model này.");
    if (e instanceof Anthropic.RateLimitError) throw new DraftError("Đang bị giới hạn lượt gọi. Đợi một chút rồi thử lại.");
    if (e instanceof Anthropic.BadRequestError) throw new DraftError("Yêu cầu bị từ chối: " + e.message);
    if (e instanceof Anthropic.APIConnectionError) throw new DraftError("Không kết nối được tới Claude. Kiểm tra mạng rồi thử lại.");
    if (e instanceof Anthropic.APIError) throw new DraftError(`Lỗi từ Claude (${e.status}): ${e.message}`);
    throw e;
  }
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
        const out = { tag: x.tag, title: x.title, sids: x.sids, chain: x.chain, bad_node: x.mode === "bad_link" ? x.bad_node : null,
          ask: x.ask, fix_intro: x.fix_intro, fix_chain: x.fix_chain, fix_en: x.fix_en, outro: x.outro };
        if (x.mode === "gap") out.gap_after = x.gap_after ?? 0;
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
        if (it.type === "choose") return { ...base, q: it.q, ...(it.sentence ? { sentence: it.sentence } : {}), options: it.options || [], answer: it.answer_index ?? 0 };
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
