/* Draft a "flow 2" lesson. The teacher has already made every decision that matters: which framework
   points the student met (the Logic checklist, with notes), how each idea is developed, which corrections
   the student sees and how (Dạy / Socratic / Khen), the systematic mistake of each tab if any, and the
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
      issues: A(O({ point: I, title: S, sids: A(S), quote: S, say: A(S), fix: S, changes: A(O({ from: S, to: S, why: S })), series: S, col: S })),
    }) }),
  },
  ideas: {
    label: "Các ý",
    fields: "ideas",
    schema: O({ ideas: O({ intro: A(S), names: A(O({ tag: S, text: S, problem: S })), tips: A(O({ tag: S, tip: S })), details: A(DETAIL) }) }),
  },
  language: {
    label: "Language",
    fields: "language",
    schema: O({ language: O({
      focus: S,
      phrases: O({ line: S, groups: A(O({ label: S, items: A(O({ text: S, sid: S })) })) }),
      asks: A(O({ ref: S, focus: S, q: S, options: A(S), answer: I, right: S, wrong: S })),
      swaps: A(O({ ref: S, from: S, to: S })),
    }) }),
  },
  systemic: {
    label: "Lỗi hệ thống",
    fields: "systemic",
    schema: O({ systemic: A(O({
      tab: E("LR", "GRA"), title: S, count_line: S, ask: O({ q: S, options: A(S), answer: I }), reason: S,
      board: A(S), rule: A(S), example: O({ bad: S, good: S }), better: A(O({ ref: S, text: S })),
    })) }),
  },
  practice: { ...PARTS.practice, after: "systemic" },
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
  const ideasToDo = (d.ideas || []).some(x => x.status !== "ok");
  const systemic = d.language.systemic.length > 0;
  return ["logic", ...(ideasToDo ? ["ideas"] : []), "language", ...(systemic ? ["systemic", "practice"] : []), "frame"];
}

/* ---------- the instructions (stable per week, so they are cached) ---------- */
export function systemBlocks2(week, teacher) {
  const general = `You write the words of a short, friendly review of a student's marked IELTS Writing homework. The student reads it on a phone. It is spoken by "anh Đậu", a teaching assistant of ${teacher}. The lesson is written as JSON in several parts (each request asks for one part).

# The teacher has already decided everything
The teacher went through the essay and decided (in "decisions"):
- logic_checklist: which points of this week's framework she met (ok true/false) with the teacher's notes.
- ideas (essays): how each idea is developed: "ok", "improve" (could go further) or "fix" (broken), with notes (the teacher's CRM comments on it, then anything the teacher added). A "fix" idea has a fix_type: "replace" (the idea goes the wrong way: a new direction replaces her chain), "link" (one step of her chain is wrong, the steps before it hold), "missing" (the chain is right but stops short, or skips a step).
- topics (Week 1): whether each paraphrase topic is right, with notes.
- language.items: which corrections and notes the student sees, and how: "teach" (shown as is, the teacher's own words), "socratic" (she is asked first, then sees the teacher's fix), "praise" (a compliment from the teacher), "skip" (not shown). tab = where it is shown: "LR" (vocabulary), "GRA" (grammar) or "LOGIC" (a comment about her ideas, shown in the Logic part). language.groups: items the teacher put together (same point): shown on one screen, with the teacher's group note.
- language.systemic: the systematic mistake of a tab, named by the teacher, with the corrections and notes that belong to it (refs). Usually there is none.
- rewrite_target: the exact sentences she rewrites.
Never change, soften or add to these decisions: no extra points, mistakes, corrections or praise of your own. Write only Đậu's words around them, short. Everything else on the page is the teacher's own words.

# Đậu's voice (Vietnamese)
- Đậu calls himself "anh" and the student "em" (use call_name now and then). Mix in natural particles: "nha", "nhen", "nè", "á", "nha em".
- Never end a line with a full stop, and avoid full stops inside lines; split long thoughts into separate lines instead. Commas are fine.
- Emoticons only in these forms: ": )", ": ]]", ":D", rarely: at most one in the hello and one at the very end. Never emoji.
- Cute but authoritative, like a caring older brother. No slang overload, no exclamation marks in a row.
- One idea per line, usually under 20 words. English words and phrases from the essay stay in English. Refer to the teacher as "${teacher}".
- No filler: don't explain what a part of the framework requires when she did it right; don't repeat what the screen already shows.

# What you write, part by part
- logic.points: one per logic_checklist item, in the same order: line = that point in plain Vietnamese for the student, under 12 words, saying what she did or didn't do (e.g. "Em nhận ra đây là dữ liệu động", "Overview có đủ Trends và Differences", "Body 2 còn thiếu năm cho số liệu"). It must agree with the teacher's ok.
- logic.summary: 1-2 lines. If every point is ok: one specific line of praise for her logic. Otherwise: her logic is right except the ✗ points, named briefly (e.g. "Em tả đúng chart dynamic rồi, overview và body cũng đúng Framework hết á, chỉ có phần data em tả hơi thiếu nè").
- logic.issues: one per problem the teacher noted under a ✗ point (one note may list several problems: one issue each, in essay order); none for ok points. point = the checklist index. title = 2-5 Vietnamese words. sids = the sentence(s) it is about, never empty: when the problem is something missing (no overview, no conclusion), the sentence nearest to where it should be. quote = her exact words there, verbatim from the original text ("" if the problem is something missing). say = 1-2 Đậu lines explaining it, built on the teacher's note (Task 1: with the right numbers and years from the data). fix = the corrected sentence in English ("" if the fix isn't a sentence). changes (only when fix is a sentence, else []): the changes from her sentence to fix, in order, 1-4 of them: from = her words verbatim ("" when words are added), to = the words in fix ("" when words are dropped), why = 1 short Đậu line on why, built on the teacher's note (e.g. from "I mostly agree", to "", why "mostly nghe như em chỉ đồng ý một phần, người đọc không chắc em đứng ở đâu"). One entry may keep a good part (from = to) with a line saying to keep it. series and col = for a Task 1 data problem, the row and column of the figure on the chart, as written in the data (else ""). Week 1: each paraphrase topic with ok false is an issue too (point -1, title "Topic N", fix = a corrected paraphrase, the teacher's when the note gives one).
- ideas (only asked when some idea is not ok): intro = 1 line before she taps into the ideas to fix. names = every idea in order: tag, text = the idea in Vietnamese, under 10 words, problem = for a "fix" idea what is wrong in under 8 Vietnamese words, from the teacher's note (e.g. "Người cần nhà vốn ít đi làm"), else "". tips = one per "improve" idea: tip = 1 short line from the teacher's note (what to add). details = one per "fix" idea, built on the teacher's note:
  - sids = the idea's sentences; chain = her reasoning as 2-5 short Vietnamese links (under 9 words each), paraphrased faithfully; bad_node and gap_after are -1 unless the mode uses them.
  - mode follows the teacher's fix_type, never your own reading: "replace" → mode "replace": fix_chain = the teacher's new direction as a whole chain of 3-5 links, from its start (not a continuation of hers), fix_label = "Hướng ${teacher} gợi ý". "link" → mode "bad_link": bad_node = index of the wrong link; fix_chain = the links that replace it and what follows. "missing" → mode "missing_end" (fix_chain = links to add at the end) or "gap" (gap_after = index of the link before the missing one; fix_chain = the missing links).
  - ask = a Socratic question with 2-3 options and the right index; right/wrong = Đậu's reply to each. Her chain is shown with no marks while she answers, so the question can't be answered by looking. For "replace" ask whether the idea really answers the prompt or leads where the essay needs (not "which link is wrong"); for "link" which link doesn't hold; for "missing" what is still missing. fix_intro = 1 line. fix_en = the English flow ("a → b → c"), the teacher's when given. outro = 1 line.
- language.focus: only when language.systemic is not empty: 1 line that opens the systematic mistake lesson, naming the teacher's systematic mistake (e.g. "Grammar của em khá chắc rồi, chỗ mình cần chú ý nhất là mạo từ the nè"). Else "". Never name a focus, a weakness or a pattern the teacher didn't name (the page writes its own lines between the parts).
- language.phrases ("Cụm em đã dùng tốt"): the good phrases she used, in 2-3 groups (essays: linking devices, good vocabulary; Task 1: language of trends, comparison, figures). Each phrase verbatim from her original text with its sid; never words the teacher corrected or commented on as a problem. line = 1 line of praise. Empty groups if there is nothing worth showing.
- language.asks: one per item with mode "socratic" (any tab, LOGIC too), in order; for a group whose first item is socratic, one ask for the whole group with ref = the group id (its items get no ask of their own). ref; focus = the exact words the question is about, verbatim from her original sentence (they are highlighted while she thinks); q = a short question that makes her reason about the point (the meaning, the rule, what the word really says), not just find the error (e.g. for "directly addresses the root cause of homelessness": "Nhà miễn phí giải quyết trực tiếp cái gì nè em?"); options = 2-3 short Vietnamese options, each a belief a student at her level could really hold (no silly ones); no option repeats the teacher's comment, and no option suggests a word or phrase the teacher corrected anywhere in the essay (e.g. never offer "no-cost" when the teacher changed "no-cost" elsewhere); answer = index of the right one, which must agree with the teacher's correction and comment; right = 1 Đậu line when she gets it, explaining the point in a way that adds to the teacher's comment (no repeat); wrong = 1-2 Đậu lines when she doesn't, gently explaining the difference. The page then shows the teacher's fix and comment.
- language.swaps: for each shown note (n…, not skip) whose comment or teacher_rewrite replaces some of her words: ref, from = her words verbatim (the note's quote when it has one), to = the new words from the teacher's comment. None for notes where the teacher typed words into the essay (typed_by_teacher, not starting with "=>"): the page shows those itself. [] when there are none.
- systemic: one per language.systemic entry, same tab: title = the teacher's name for it, tidied. count_line = "Em mắc lỗi này {n} lần" (write {n} literally, the page fills it in). ask = "Mấy chỗ này có lỗi gì giống nhau?" with 3 options. reason = why she probably made it (1 kind line). board = 1-2 formulas, at most 20 characters each, symbols welcome (→, =, ≠, +). rule = 3 short lines. example = a new bad/good pair (not from her essay). better = for each note ref (n…) in it, the better version of her sentence in English (the teacher's when given).
- practice (only with a systematic mistake): 3-4 core items on it, one of each kind where it fits: a "choose" item with sentence "" (3 English sentences as options), a "choose" item with a sentence containing "___" (3 options), a "tap" item (a sentence with exactly one wrong word; wrong = that word as it appears between spaces, fix = the right word), a "build" item (vi = a Vietnamese sentence, answer_words = 4-8 English chunks in order, extra = 2 wrong chunks). mistake = the systematic group's id. New sentences on the essay's topic, never copied from her essay. explain = 1 short line. core = their ids in order. intro = 2 lines.
- hello: 2 lines. Line 1 introduces Đậu as ${teacher}'s TA. Line 2 says you'll look at the homework together.
- results: criteria = 1 line introducing the 4 scores; score = 2 lines (the overall band, then what this lesson focuses on: only things the teacher decided, i.e. the ✗ Logic points, the ideas to fix, the systematic mistake if any).
- rewrite: exactly rewrite_target.sids: sids = them, target = rewrite_target.target, and label, intro, task, flow and model talk about nothing else. label = what she rewrites (e.g. "Câu về swimming em đã viết"). intro = 2 lines saying it's ${teacher}'s request and what to keep in mind (from the decisions about those sentences). task = 1 line (can be empty). flow = English chain with "→". starters = 2-3 sentence starters ending with "…". phrases = 3-4 useful phrases. checklist = 2-3 short checks. model = the teacher's model when given, else one written for her level, about as long as what she wrote there.
- takeaways: 3-4 short Vietnamese lines, only from the decisions (the ✗ points, the systematic mistake, the most useful fixes).
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
  const lg = P.logic.logic, ln = P.language.language, f = P.frame;
  const noteAt = ref => page.task_comments[+ref.slice(1) - 1];
  // the teacher's systematic mistakes, with Claude's teaching
  const sys = D.language.systemic.map((s, i) => {
    const g = ((P.systemic && P.systemic.systemic) || []).find(x => x.tab === s.tab) || ((P.systemic && P.systemic.systemic) || [])[i] || {};
    const better = Object.fromEntries((g.better || []).map(b => [b.ref, b.text]));
    return {
      id: "s" + (i + 1), title: g.title || s.name, tag: s.tab === "LR" ? "Vocab" : "Grammar", tab: s.tab,
      cids: s.refs.filter(r => r[0] === "c" && page.corrections[r]),
      points: s.refs.filter(r => r[0] === "n" && noteAt(r)).map(r => ({ nid: r, ...pointOf(noteAt(r)), better: noteAt(r).fix || better[r] || "" })),
      count_line: g.count_line || "Em mắc lỗi này {n} lần", ask: g.ask || { q: "", options: [], answer: 0 }, reason: g.reason || "",
      board: g.board || [], rule: g.rule || [], example: g.example || { bad: "", good: "" },
    };
  });
  const asks = Object.fromEntries((ln.asks || []).map(a => [a.ref, { q: a.q, options: a.options, answer: a.answer, ...(a.right ? { right: a.right } : {}), ...(a.wrong ? { wrong: a.wrong } : {}), ...(a.focus ? { focus: a.focus } : {}) }]));
  const swaps = Object.fromEntries((ln.swaps || []).filter(x => x.from && x.to).map(x => [x.ref, { from: x.from, to: x.to }]));
  const groups = (D.language.groups || []).filter(g => g.refs.length > 1);
  const groupOf = Object.fromEntries(groups.flatMap(g => g.refs.map(r => [r, g.id])));
  const inSys = new Set(D.language.systemic.flatMap(s => s.refs));
  const ideas = P.ideas && P.ideas.ideas;
  const lesson = {
    flow: 2,
    student: meta.call_name, teacher, zalo, homework: meta.homework, essay_type: meta.essay_type, prompt: meta.prompt,
    word_target: meta.word_target || 250, overall: meta.overall,
    hello: f.hello, results: f.results,
    logic: {
      summary: lg.summary,
      points: D.checklist.map((c, i) => ({ ok: c.ok !== false, line: (lg.points[i] && lg.points[i].line) || c.item })),
      issues: lg.issues.map(x => ({ title: x.title, sids: x.sids.filter(s => sids.has(s)), quote: x.quote, say: x.say, fix: x.fix,
        ...(x.fix && (x.changes || []).length ? { changes: x.changes.filter(ch => ch.why && (ch.from || ch.to)) } : {}), series: x.series, col: x.col })),
    },
    ...(D.ideas && D.ideas.length && ideas ? { ideas: {
      intro: ideas.intro,
      overview: D.ideas.map(o => {
        const tip = (ideas.tips.find(t => t.tag === o.tag) || {}).tip, name = ideas.names.find(n => n.tag === o.tag) || {};
        const own = o.card_note != null ? o.card_note : o.note;
        return { tag: o.tag, text: name.text || o.tag, sids: o.sids, status: o.status, ok: o.status === "ok",
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
      focus: D.language.systemic.length ? ln.focus || "" : "",
      phrases: ln.phrases && ln.phrases.groups.some(g => g.items.length) ? { line: ln.phrases.line, groups: ln.phrases.groups.map(g => ({ label: g.label, items: g.items.filter(x => sids.has(x.sid)) })) } : null,
      items: D.language.items.filter(it => it.mode !== "skip" && !inSys.has(it.ref))
        .map(it => ({ ref: it.ref, tab: it.tab, mode: it.mode, ...(groupOf[it.ref] ? { group: groupOf[it.ref] } : {}),
          ...(it.mode === "socratic" && asks[it.ref] ? { ask: asks[it.ref] } : {}), ...(swaps[it.ref] ? { swap: swaps[it.ref] } : {}) }))
        .map(it => it.mode === "socratic" && !it.ask && !(it.group && asks[it.group]) ? { ...it, mode: "teach" } : it),
      groups: groups.filter(g => D.language.items.some(it => it.ref === g.refs[0] && it.mode !== "skip" && !inSys.has(it.ref)))
        .map(g => ({ id: g.id, refs: g.refs.filter(r => !inSys.has(r)), note: g.note || "", ...(asks[g.id] ? { ask: asks[g.id] } : {}) })),
    },
    mistakes: { total: Object.keys(page.corrections).length, main: sys, others: [], lr_intro: [], gra_intro: [] },
    practice: sys.length && P.practice ? practiceToLesson({ intro: P.practice.practice.intro, core: P.practice.practice.core, items: practiceItems(P.practice.practice) }) : null,
    rewrite: { ...f.rewrite, target: (D.rewrite && D.rewrite.target) || f.rewrite.target, sids: D.rewrite && D.rewrite.sids.length ? D.rewrite.sids : f.rewrite.sids.filter(s => sids.has(s)) },
    praise: [], praise_status: "ok",
    finish: { summary: f.finish.summary, takeaways: f.takeaways, extra_prompt: f.finish.extra_prompt, later: f.finish.later, done: f.finish.done, quote: null },
    scores: page.scores, word_count: page.word_count, essay: page.essay, corrections: page.corrections, task_comments: page.task_comments,
  };
  return lesson;
}
