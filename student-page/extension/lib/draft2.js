/* Draft a "flow 2" lesson. The teacher has already made every decision that matters: which framework
   points the student met (the Logic checklist, with notes), how each idea is developed, which corrections
   are part of a systematic mistake (up to 3 per tab), which are only listed, praised or hidden, and the
   sentences to rewrite. Claude only writes Đậu's words around those decisions, in one pass of small parts
   (run by draftLesson in draft.js). The rest of the page is the teacher's own words, taken from the CRM. */
import { draftLesson, PARTS, S, I, A, E, O, ASK, practiceItems, practiceToLesson } from "./draft.js";

const DETAIL = O({
  tag: S, title: S, sids: A(S), chain: A(S), mode: E("missing_end", "bad_link", "gap", "replace"),
  bad_node: I, gap_after: I, ask: ASK, fix_intro: S, fix_chain: A(S), fix_label: S, fix_en: S, outro: S,
});

export const PARTS2 = {
  logic: {
    label: "Logic",
    fields: "logic",
    schema: O({ logic: O({
      summary: A(S),
      points: A(O({ line: S })),
      issues: A(O({ point: I, title: S, sids: A(S), quote: S, part: S, prompt_focus: S, rule: S, ask: ASK, missing: A(S),
        fix: S, changes: A(O({ from: S, to: S, why: S })), series: S, col: S })),
    }) }),
  },
  ideas: {
    label: "Các ý",
    fields: "ideas",
    schema: O({ ideas: O({ intro: A(S), paras: A(O({ short: S })), names: A(O({ tag: S, short: S, text: S, problem: S })), tips: A(O({ tag: S, tip: S })), details: A(DETAIL) }) }),
  },
  language: {
    label: "Cụm em dùng tốt",
    fields: "language",
    schema: O({ language: O({
      phrases: O({ line: S, groups: A(O({ label: S, items: A(O({ text: S, sid: S })) })) }),
    }) }),
  },
  systemic: {
    label: "Lỗi hệ thống",
    fields: "systemic",
    schema: O({ systemic: A(O({
      tab: E("LR", "GRA"), title: S, count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S,
      patterns: A(O({ formula: S, rule: S, refs: A(S) })), example: O({ bad: S, good: S }), better: A(O({ ref: S, text: S })),
    })) }),
  },
  practice: { ...PARTS.practice, after: "systemic" },
  // the frame without the rewrite, when the teacher didn't assign one
  frame_nr: {
    label: "Lời chào và kết thúc",
    fields: "hello, results, takeaways, finish",
    schema: O({ hello: A(S), results: O({ score: A(S), criteria: S }), takeaways: A(S), finish: O({ summary: A(S), extra_prompt: S, later: A(S), done: A(S) }) }),
  },
  frame: {
    label: "Lời chào, viết lại và kết thúc",
    fields: "hello, results, rewrite, takeaways, finish",
    schema: O({
      hello: A(S), results: O({ score: A(S), criteria: S }), rewrite: PARTS.frame.schema.properties.rewrite,
      takeaways: A(S), finish: O({ summary: A(S), extra_prompt: S, later: A(S), done: A(S) }),
    }),
  },
};

/** The parts this lesson needs, from the teacher's decisions. */
export function partsFor2(d) {
  const ideas = (d.ideas || []).length > 0;
  const systemic = d.language.systemic.length > 0;
  return ["logic", ...(ideas ? ["ideas"] : []), "language", ...(systemic ? ["systemic", "practice"] : []), d.no_rewrite ? "frame_nr" : "frame"];
}

/* ---------- the instructions (stable per week, so they are cached) ---------- */
export function systemBlocks2(week, teacher) {
  const general = `You write the words of a short, friendly review of a student's marked IELTS Writing homework. The student reads it on a phone. It is spoken by "anh Đậu", a teaching assistant of ${teacher}. The lesson is written as JSON in several parts (each request asks for one part).

# The teacher has already decided everything
The teacher went through the essay and decided (in "decisions"):
- logic_checklist: which points of this week's framework she met (ok true/false) with the teacher's notes.
- ideas (essays): how each idea is developed: "ok", "improve" (could go further) or "fix" (broken), with notes (the teacher's CRM comments on it, then anything the teacher added). A "fix" idea has a fix_type: "replace" (the idea goes the wrong way: a new direction replaces her chain), "link" (one step of her chain is wrong, the steps before it hold), "missing" (the chain is right but stops short, or skips a step).
- topics (Week 1): whether each paraphrase topic is right, with notes.
- language.items: what the student sees of each correction and note: "systemic" (taught in a systematic mistake lesson), "list" (only listed, with the teacher's own comment, in an optional list of other mistakes), "praise" (a compliment from the teacher, shown with the good phrases), "hide" (not shown), "teach" (a comment about her ideas, shown as is in the Logic part). tab = "LR" (vocabulary), "GRA" (grammar) or "LOGIC". upgrade true = her words are not wrong: the teacher suggests a better way to say it (never call it a mistake).
- language.systemic: the systematic mistakes, in order (at most 3 per tab), each named by the teacher, with the corrections and notes that belong to it (refs). Often there is none.
- rewrite_target: the exact sentences she rewrites. no_rewrite true: the teacher gave no rewrite this time: never mention rewriting anywhere.
Never change, soften or add to these decisions: no extra points, mistakes, corrections or praise of your own. Write only Đậu's words around them, short. Everything else on the page is the teacher's own words.

# Đậu's voice (Vietnamese)
- Đậu calls himself "anh" and the student "em" (use call_name now and then). Mix in natural particles: "nha", "nhen", "nè", "á", "nha em".
- Never end a line with a full stop, and avoid full stops inside lines; split long thoughts into separate lines instead. Commas are fine.
- Emoticons only in these forms: ": )", ": ]]", ":D", rarely: at most one in the hello and one at the very end. Never emoji.
- Cute but authoritative, like a caring older brother. No slang overload, no exclamation marks in a row.
- One idea per line, usually under 20 words. English words and phrases from the essay stay in English. Refer to the teacher as "${teacher}".
- No filler: don't explain what a part of the framework requires when she did it right; don't repeat what the screen already shows.
- Mistakes are counted in "chỗ" (places), never in "câu" or "lần".

# Socratic questions (logic issues, idea details, systematic mistakes)
A question makes her notice a fact; it never asks for an opinion or a guess at what someone meant.
- Ask only about something she can check: what a word means, which word fits a gap, which form a word takes, which word is missing, what the prompt (or the data) actually says or asks. Never "em nghĩ sao", "vì sao em viết vậy", "câu này hay không", or what a writer meant or felt.
- Exactly one option is clearly right, and it agrees with the teacher's correction and comment; each other option is clearly wrong for a reason she sees once told. No two options say nearly the same thing.
- 2-3 short options, each a belief a student at her level could really hold (no silly ones). No option repeats the teacher's comment, and no option offers a word or phrase the teacher corrected anywhere in the essay.
- Templates, by type: word meaning ("“provide” nghĩa là gì nè em?"), gap-fill ("Chỗ ___ này điền gì nè?", options = words), form ("Sau “enable” thì động từ ở dạng nào nè?"), missing word ("Câu này còn thiếu từ gì nè?"), a fact about the prompt ("Đề bài hỏi về nguyên nhân hay giải pháp nè?", "Đề nói ai được nhận nhà miễn phí?").
- right = 1 Đậu line that explains why it is right, adding to the teacher's comment (never just "Đúng rồi"); wrong = 1-2 lines that explain the difference, kindly.
- If no question meets these rules, leave q "", options [], right "" and wrong "": the page then skips the question.

# What you write, part by part
- logic.points: one per logic_checklist item, in the same order: line = that point in plain Vietnamese for the student, under 12 words, saying what she did or didn't do (e.g. "Em nhận ra đây là dữ liệu động", "Overview có đủ Trends và Differences", "Body 2 còn thiếu năm cho số liệu"). It must agree with the teacher's ok.
- logic.summary: 1-2 lines. If every point is ok: one specific line of praise for her logic. Otherwise: her logic is right except the ✗ points, named briefly (e.g. "Em tả đúng chart dynamic rồi, overview và body cũng đúng Framework hết á, chỉ có phần data em tả hơi thiếu nè").
- logic.issues: one per problem the teacher noted under a ✗ point (one note may list several problems: one issue each, in essay order); none for ok points. point = the checklist index. title = 2-5 Vietnamese words. sids = the sentence(s) it is about, never empty: when the problem is something missing (no overview, no conclusion), the sentence nearest to where it should be. quote = her exact words there, verbatim from the original text ("" if the problem is something missing).
  The page walks her through each issue one step at a time, so write each step:
  - part = where we are in her essay, as Đậu says it after "Mình xét": "câu thesis của em", "Body 1", "câu mở bài", "phần overview", "câu topic sentence của Body 2".
  - prompt_focus = when the problem is about what the prompt asks (off-topic, half of the question missing, the wrong position), the words of the prompt that matter, copied verbatim from the prompt (the page shows the prompt with them highlighted); else "".
  - rule = when the problem is about the framework (a part missing or wrong), that framework rule in 1 short Vietnamese line, starting "Theo Framework" (e.g. "Theo Framework, thesis phải nói rõ em đồng ý tới đâu và vì sao"); else "". Give prompt_focus, rule, or both.
  - ask = a Socratic question (rules above) that leads her to see the problem herself before it is named, e.g. "Đề bài hỏi em về nguyên nhân hay giải pháp nè?". Her sentence is shown with no marks while she answers.
  - missing = 1-2 Đậu lines naming exactly what her sentence lacks or gets wrong, built on the teacher's note (Task 1: with the right numbers and years from the data), e.g. "Vậy nên câu của em còn thiếu mức độ em đồng ý nè". The page highlights her sentence while it says them.
  - fix = the corrected sentence in English ("" if the fix isn't a sentence). The page introduces it with "${teacher} đề xuất em sửa lại như sau nhé". changes (only when fix is a sentence, else []): the changes from her sentence to fix, in order, 1-4 of them: from = her words verbatim ("" when words are added), to = the words in fix ("" when words are dropped), why = 1 short Đậu line on why, built on the teacher's note (e.g. from "I mostly agree", to "", why "mostly nghe như em chỉ đồng ý một phần, người đọc không chắc em đứng ở đâu"). One entry may keep a good part (from = to) with a line saying to keep it.
  - series and col = for a Task 1 data problem, the row and column of the figure on the chart, as written in the data (else "").
  Week 1: each paraphrase topic with ok false is an issue too (point -1, title "Topic N", part "Topic N", fix = a corrected paraphrase, the teacher's when the note gives one).
- ideas (essays): intro = 1 line said after the page counts her ideas (e.g. "Ý nào cũng có hướng rồi, mình đào sâu thêm mấy ý này nha"). paras = one per paragraph of her essay, in order: short = what that paragraph says, 2-5 Vietnamese words (e.g. "Đồng ý một phần", "Tóm lại ý chính"). names = every idea in order: tag, short = the idea in 2-4 Vietnamese words for a small chip (e.g. "Chi phí thấp"), text = the idea in Vietnamese, under 10 words, problem = for a "fix" idea what is wrong in under 8 Vietnamese words, from the teacher's note (e.g. "Người cần nhà vốn ít đi làm"), else "". tips = one per "improve" idea: tip = 1 short line from the teacher's note (what to add). details = one per "fix" idea, built on the teacher's note:
  - sids = the idea's sentences; chain = her reasoning as 2-5 short Vietnamese links (under 9 words each), paraphrased faithfully; bad_node and gap_after are -1 unless the mode uses them.
  - mode follows the teacher's fix_type, never your own reading: "replace" → mode "replace": fix_chain = the teacher's new direction as a whole chain of 3-5 links, from its start (not a continuation of hers), fix_label = "Hướng ${teacher} gợi ý". "link" → mode "bad_link": bad_node = index of the wrong link; fix_chain = the links that replace it and what follows. "missing" → mode "missing_end" (fix_chain = links to add at the end) or "gap" (gap_after = index of the link before the missing one; fix_chain = the missing links).
  - ask = a Socratic question (rules above). Her chain is shown with no marks while she answers, so the question can't be answered by looking. For "replace" ask a fact about what the prompt asks or where the idea leads; for "link" which link doesn't hold; for "missing" what is still missing. fix_intro = 1 line. fix_en = the English flow ("a → b → c"), the teacher's when given. outro = 1 line.
- language.phrases ("Cụm em đã dùng tốt"): the good phrases she used, in 2-3 groups (essays: linking devices, good vocabulary; Task 1: language of trends, comparison, figures). Each phrase verbatim from her original text with its sid; never words the teacher corrected or commented on as a problem. line = 1 line of praise. Empty groups if there is nothing worth showing. (The page shows the teacher's praise items on its own.)
- systemic: one per language.systemic entry, in the same order (a tab can have up to 3): tab, title = the teacher's name for it, tidied. count_line = 1 line said while the page shows how many places, with {n} written literally (e.g. "Lỗi này em mắc tới {n} chỗ lận á"). ask = "Mấy chỗ này có điểm gì giống nhau nè?" with 3 options (rules above: a fact the corrections share). reason = why she probably made it (1 kind line). patterns = the mistake split into 1-4 patterns, the different ways it shows up in her corrections:
  - formula = ONE formula for one chalkboard line, at most 22 characters, symbols welcome (→, =, ≠, +), e.g. "the + other + N", "give ≠ provide"; never two formulas in one line (no "/" and no lists with ",").
  - rule = 1 short Đậu line stating it, built on the teacher's corrections and comments.
  - refs = the refs of this entry that follow it. Every ref of the entry belongs to exactly one pattern; a correction that fits no other pattern gets a pattern of its own.
  example = a new bad/good pair (not from her essay). better = for each note ref (n…) in it, the better version of her sentence in English (the teacher's when given).
- practice (only with systematic mistakes): 4-6 core items covering every systematic mistake (1-2 for each), using these kinds where they fit: a "choose" item with sentence "" (3 English sentences as options), a "choose" item with a sentence containing "___" (3 options), a "tap" item (a sentence with exactly one wrong word; wrong = that word as it appears between spaces, fix = the right word), a "build" item (vi = a Vietnamese sentence, answer_words = 4-8 English chunks in order, extra = 2 wrong chunks). mistake = the id of the systematic mistake it practises. New sentences on the essay's topic, never copied from her essay. explain = 1 short line. core = their ids in order. intro = 2 lines.
- hello: 2 lines. Line 1 introduces Đậu as ${teacher}'s TA. Line 2 says you'll look at the homework together.
- results: criteria = 1 line introducing the 4 scores; score = 2 lines (the overall band, then what this lesson focuses on: only things the teacher decided, i.e. the ✗ Logic points, the ideas to fix, the systematic mistakes if any).
- rewrite: exactly rewrite_target.sids: sids = them, target = rewrite_target.target, and label, intro, task, flow and model talk about nothing else. label = what she rewrites (e.g. "Câu về swimming em đã viết"). intro = 2 lines saying it's ${teacher}'s request and what to keep in mind (from the decisions about those sentences). task = 1 line (can be empty). flow = English chain with "→". starters = 2-3 sentence starters ending with "…". phrases = 3-4 useful phrases. checklist = 2-3 short checks. model = the teacher's model when given, else one written for her level, about as long as what she wrote there.
- takeaways: 3-4 short Vietnamese lines, only from the decisions (the ✗ points, the systematic mistakes, the most useful fixes).
- finish: summary = 2 lines, extra_prompt = "Em muốn luyện thêm {n} câu nữa không?", later = 2 lines, done = 2 lines (the last ends warmly; the page adds a quote after it).

# Hard rules
- Sentence ids (p0s0 …), correction ids (c1 …) and note ids (n1 …) must be ones given to you. Every quote and phrase is copied verbatim from her original text.
- Output only the JSON object for the part you are asked for.`;

  const fw = week.framework || {};
  const t1 = week.task === 1 ? `\nThis is an IELTS Task 1 report (${week.kind.replace("task1-", "")}). Keep the English words "Trends", "Differences", "Main changes" as they are.\nData (${week.chart && week.chart.unit ? "unit: " + week.chart.unit : "no unit"}${week.chart && week.chart.time ? ", time: " + week.chart.time : ""}):\n${JSON.stringify(week.chart || {})}\n` : "";
  const course = `# This week: ${week.homework}, ${week.essay_type}
${t1}
Prompt${week.prompts.length > 1 ? "s" : ""}:
${week.prompts.map(p => `- ${p.label}: ${p.prompt}`).join("\n")}

Framework structure:
${(fw.structure || []).map(x => "- " + x).join("\n")}

Framework language (correct by definition, never a mistake):
${(fw.language || []).map(x => "- " + x).join("\n")}`;
  return [
    { type: "text", text: general },
    { type: "text", text: course, cache_control: { type: "ephemeral" } },
  ];
}

/* ---------- what we send: the marked essay and the teacher's decisions ---------- */
export function userMessage2({ page, meta, decisions }) {
  const C = page.corrections;
  const sentences = page.essay.paragraphs.flatMap((p, pi) => p.sentences.map(s => ({
    id: s.id, paragraph: pi,
    original: s.segs.map(g => typeof g === "string" ? g : C[g.c].orig).join(""),
    corrected: s.segs.map(g => typeof g === "string" ? g : C[g.c].fix).join(""),
  })));
  const payload = {
    call_name: meta.call_name, homework: meta.homework,
    scores: page.scores, overall: meta.overall,
    teacher_overall_comment: page.teacher_comment || "",
    sentences,
    corrections: Object.entries(C).map(([id, c]) => ({ id, orig: c.orig, fix: c.fix, comment: c.comment })),
    notes: page.task_comments.map((t, i) => ({ id: "n" + (i + 1), sentence_ids: t.sentence_ids, quote: t.quote, typed_by_teacher: t.added,
      teacher_rewrite: t.fix || null, comment: t.comment })),
    decisions,
  };
  return "Here is the marked homework and the teacher's decisions.\n\n" + JSON.stringify(payload, null, 1);
}

/** Draft the parts. Same return shape as draftLesson. */
export function draftLesson2({ apiKey, week, teacher, input, onProgress, fetchImpl, signal, done = {}, noStrict = [] }) {
  return draftLesson({
    apiKey, week, teacher, onProgress, fetchImpl, signal, done, noStrict,
    specs: PARTS2, list: partsFor2(input.decisions),
    system: systemBlocks2(week, teacher), essay: userMessage2(input),
    depExtra: (dep, d) => "The systematic mistake groups are drafted. Their ids, for `mistake`: " +
      JSON.stringify(d.systemic.map((g, i) => ({ id: "s" + (i + 1), title: g.title, tab: g.tab }))),
  });
}

/* ---------- parts + decisions + page -> the lesson the student page reads ---------- */
const pointOf = t => ({ sids: t.sentence_ids, quote: t.quote || "", comment: t.comment || "", ...(t.fix ? { fix: t.fix } : {}) });

export function toLesson2(parts, { page, meta, teacher, zalo, week, decisions }) {
  const P = structuredClone(parts), D = decisions;
  const sids = new Set(page.essay.paragraphs.flatMap(p => p.sentences.map(s => s.id)));
  const lg = P.logic.logic, ln = P.language.language, f = P.frame || P.frame_nr, noRw = !!D.no_rewrite || !f.rewrite;
  const noteAt = ref => page.task_comments[+ref.slice(1) - 1];
  // where each correction and note sits in the essay, so lists follow her text
  const pos = {}, sidPos = {};
  page.essay.paragraphs.flatMap(p => p.sentences).forEach((s, k) => {
    sidPos[s.id] = k * 1000;
    s.segs.forEach((g, j) => { if (typeof g !== "string" && pos[g.c] == null) pos[g.c] = k * 1000 + j; });
  });
  page.task_comments.forEach((t, i) => { pos["n" + (i + 1)] = (sidPos[(t.sentence_ids || [])[0]] ?? 1e6) + 999; });
  const byPos = (a, b) => (pos[a.ref] ?? 1e7) - (pos[b.ref] ?? 1e7);
  // the teacher's systematic mistakes (up to 3 per tab), with Claude's teaching, matched in order
  const drafted = (P.systemic && P.systemic.systemic) || [];
  const sys = D.language.systemic.map((s, i) => {
    const nth = D.language.systemic.slice(0, i).filter(x => x.tab === s.tab).length;
    const g = (drafted[i] && drafted[i].tab === s.tab ? drafted[i] : drafted.filter(x => x.tab === s.tab)[nth]) || {};
    const better = Object.fromEntries((g.better || []).map(b => [b.ref, b.text]));
    const own = new Set(s.refs);
    // patterns: one formula per board line, each with the corrections that follow it
    const patterns = (g.patterns || []).map(x => ({ formula: (x.formula || "").trim(), rule: x.rule || "", refs: (x.refs || []).filter(r => own.has(r)) })).filter(x => x.formula);
    return {
      id: "s" + (i + 1), title: g.title || s.name, tag: s.tab === "LR" ? "Vocab" : "Grammar", tab: s.tab,
      cids: s.refs.filter(r => r[0] === "c" && page.corrections[r]).sort((a, b) => pos[a] - pos[b]),
      points: s.refs.filter(r => r[0] === "n" && noteAt(r)).map(r => ({ nid: r, ...pointOf(noteAt(r)), better: noteAt(r).fix || better[r] || "" })),
      count_line: g.count_line || "Lỗi này em mắc {n} chỗ á", ask: g.ask || { q: "", options: [], answer: 0 }, reason: g.reason || "",
      board: patterns.length ? patterns.map(x => x.formula) : g.board || [], rule: patterns.length ? patterns.map(x => x.rule).filter(Boolean) : g.rule || [],
      patterns, example: g.example || { bad: "", good: "" },
    };
  });
  const items = D.language.items;
  const prompts = [meta.prompt || "", ...((week.prompts || []).map(x => x.prompt))];
  const askOf = a => a && a.q && (a.options || []).length > 1 && a.answer >= 0 && a.answer < a.options.length ? a : null;
  const ideas = P.ideas && P.ideas.ideas;
  const lesson = {
    flow: 2,
    student: meta.call_name, teacher, zalo, homework: meta.homework, essay_type: meta.essay_type, prompt: meta.prompt,
    word_target: meta.word_target || 250, overall: meta.overall,
    hello: f.hello, results: f.results,
    logic: {
      summary: lg.summary,
      points: D.checklist.map((c, i) => ({ ok: c.ok !== false, line: (lg.points[i] && lg.points[i].line) || c.item })),
      issues: lg.issues.map(x => {
        const ask = askOf(x.ask), missing = x.missing || x.say || [];
        return { title: x.title, sids: x.sids.filter(s => sids.has(s)), quote: x.quote, part: x.part || "",
          prompt_focus: x.prompt_focus && prompts.some(p => p.includes(x.prompt_focus)) ? x.prompt_focus : "", rule: x.rule || "",
          ...(ask ? { ask } : {}), missing, say: missing, fix: x.fix,
          ...(x.fix && (x.changes || []).length ? { changes: x.changes.filter(ch => ch.why && (ch.from || ch.to)) } : {}), series: x.series, col: x.col };
      }),
    },
    ...(D.ideas && D.ideas.length && ideas ? { ideas: {
      intro: ideas.intro, paras: (ideas.paras || []).map(x => x.short),
      overview: D.ideas.map(o => {
        const tip = (ideas.tips.find(t => t.tag === o.tag) || {}).tip, name = ideas.names.find(n => n.tag === o.tag) || {};
        const own = o.card_note != null ? o.card_note : o.note;
        return { tag: o.tag, text: name.text || o.tag, short: name.short || name.text || o.tag, sids: o.sids, status: o.status, ok: o.status === "ok",
          note: o.status === "improve" ? tip || own : o.status === "fix" ? name.problem || own : own };
      }),
      details: ideas.details.filter(x => (D.ideas.find(o => o.tag === x.tag) || {}).status === "fix").map(x => {
        // the picture follows the teacher's fix type: a new direction, a wrong link, or missing steps
        const ft = (D.ideas.find(o => o.tag === x.tag) || {}).fix_type;
        let mode = ft === "replace" ? "replace" : ft === "link" ? "bad_link" : ft === "missing" ? (x.mode === "gap" ? "gap" : "missing_end") : x.mode;
        if (mode === "bad_link" && !(x.bad_node >= 0 && x.bad_node < x.chain.length)) mode = "missing_end";
        const out = { tag: x.tag, title: x.title, sids: x.sids.filter(s => sids.has(s)), chain: x.chain, bad_node: mode === "bad_link" ? x.bad_node : null,
          ask: x.ask, fix_intro: x.fix_intro, fix_chain: x.fix_chain, fix_en: x.fix_en, outro: x.outro };
        if (mode === "gap") out.gap_after = x.gap_after >= 0 ? x.gap_after : 0;
        if (mode === "replace") out.replace = x.fix_label || `Hướng ${teacher} gợi ý`;
        return out;
      }),
    } } : {}),
    ...(week.task === 1 ? { t1: { kind: week.kind.replace("task1-", ""), chart: week.chart || {} } } : {}),
    language: {
      phrases: ln.phrases && ln.phrases.groups.some(g => g.items.length) ? { line: ln.phrases.line, groups: ln.phrases.groups.map(g => ({ label: g.label, items: g.items.filter(x => sids.has(x.sid)) })) } : null,
      // Khen: shown with the good phrases, with the teacher's comment
      praise: items.filter(it => it.mode === "praise" && it.tab !== "LOGIC").sort(byPos).map(it => it.ref),
      // Danh sách: the optional list of other mistakes, in essay order, with the teacher's own comment
      list: items.filter(it => it.mode === "list" && it.tab !== "LOGIC").sort(byPos).map(it => ({ ref: it.ref, tab: it.tab, ...(it.upgrade ? { upgrade: true } : {}) })),
      // comments about her ideas, shown in the Logic part
      items: items.filter(it => it.tab === "LOGIC" && it.mode === "teach").map(it => ({ ref: it.ref, tab: "LOGIC", mode: "teach" })),
    },
    mistakes: { total: Object.keys(page.corrections).length, main: sys, others: [], lr_intro: [], gra_intro: [] },
    practice: sys.length && P.practice ? practiceToLesson({ intro: P.practice.practice.intro, core: P.practice.practice.core, items: practiceItems(P.practice.practice) }) : null,
    // null: the teacher didn't assign a rewrite (the page goes from practice to the end)
    rewrite: noRw ? null : { ...f.rewrite, target: (D.rewrite && D.rewrite.target) || f.rewrite.target, sids: D.rewrite && D.rewrite.sids.length ? D.rewrite.sids : f.rewrite.sids.filter(s => sids.has(s)) },
    praise: [], praise_status: "ok",
    finish: { summary: f.finish.summary, takeaways: f.takeaways, extra_prompt: f.finish.extra_prompt, later: f.finish.later, done: f.finish.done, quote: null },
    scores: page.scores, word_count: page.word_count, essay: page.essay, corrections: page.corrections, task_comments: page.task_comments,
  };
  return lesson;
}
