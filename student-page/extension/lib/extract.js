/* Extract essay, corrections and comments from an admin.ielts1984.vn writing page.
   A line-for-line port of tools/extract_page.py; tests/extract.test.js checks the two agree
   on every saved page.

   Output: { student_full, overall, teacher_comment, homework, scores, word_count,
             essay: { paragraphs: [{ sentences: [{ id, segs: [string | { c }] }] }] },
             corrections: { cN: { orig, fix, kind, comment } },
             task_comments: [{ sentence_ids, comment, kind, quote, added }] } */

const SENT_END = /(?<=[.?!])\s+/;
const ABBREV = /(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|approx)\.)$/i;
const SLASH_FIX = /^\s*\/\/\s*(.+?)\s*$/;

export function splitSentences(text) {
  const parts = [];
  for (const part of text.split(SENT_END)) {
    if (parts.length && ABBREV.test(parts[parts.length - 1])) parts[parts.length - 1] += " " + part;
    else parts.push(part);
  }
  return parts;
}

/* ---------- a port of Python's difflib.SequenceMatcher (autojunk=False, no junk) ---------- */
export class SequenceMatcher {
  constructor(a, b) {
    this.a = a; this.b = b;                 // arrays of code points
    this.b2j = new Map();
    b.forEach((ch, i) => { if (!this.b2j.has(ch)) this.b2j.set(ch, []); this.b2j.get(ch).push(i); });
  }
  findLongestMatch(alo, ahi, blo, bhi) {
    const { a, b, b2j } = this;
    let besti = alo, bestj = blo, bestsize = 0;
    let j2len = new Map();
    for (let i = alo; i < ahi; i++) {
      const newj2len = new Map();
      for (const j of b2j.get(a[i]) || []) {
        if (j < blo) continue;
        if (j >= bhi) break;
        const k = (j2len.get(j - 1) || 0) + 1;
        newj2len.set(j, k);
        if (k > bestsize) { besti = i - k + 1; bestj = j - k + 1; bestsize = k; }
      }
      j2len = newj2len;
    }
    while (besti > alo && bestj > blo && a[besti - 1] === b[bestj - 1]) { besti--; bestj--; bestsize++; }
    while (besti + bestsize < ahi && bestj + bestsize < bhi && a[besti + bestsize] === b[bestj + bestsize]) bestsize++;
    return [besti, bestj, bestsize];
  }
  getMatchingBlocks() {
    if (this._blocks) return this._blocks;
    const la = this.a.length, lb = this.b.length;
    const queue = [[0, la, 0, lb]], blocks = [];
    while (queue.length) {
      const [alo, ahi, blo, bhi] = queue.pop();
      const [i, j, k] = this.findLongestMatch(alo, ahi, blo, bhi);
      if (k) {
        blocks.push([i, j, k]);
        if (alo < i && blo < j) queue.push([alo, i, blo, j]);
        if (i + k < ahi && j + k < bhi) queue.push([i + k, ahi, j + k, bhi]);
      }
    }
    blocks.sort((x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2]);
    const out = [];
    let [i1, j1, k1] = [0, 0, 0];
    for (const [i2, j2, k2] of blocks) {
      if (i1 + k1 === i2 && j1 + k1 === j2) k1 += k2;
      else { if (k1) out.push([i1, j1, k1]); [i1, j1, k1] = [i2, j2, k2]; }
    }
    if (k1) out.push([i1, j1, k1]);
    out.push([la, lb, 0]);
    return (this._blocks = out);
  }
  getOpcodes() {
    let i = 0, j = 0;
    const answer = [];
    for (const [ai, bj, size] of this.getMatchingBlocks()) {
      let tag = "";
      if (i < ai && j < bj) tag = "replace";
      else if (i < ai) tag = "delete";
      else if (j < bj) tag = "insert";
      if (tag) answer.push([tag, i, ai, j, bj]);
      i = ai + size; j = bj + size;
      if (size) answer.push(["equal", ai, i, bj, j]);
    }
    return answer;
  }
}

/* ---------- page helpers ---------- */
const isSpace = ch => /\s/u.test(ch);
const cps = s => Array.from(s);               // Python indexes strings by code point

function textWithBreaks(el) {                 // get_text() after <br> -> "\n"
  const c = el.cloneNode(true);
  c.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  return c.textContent;
}

export function commentText(box) {
  const body = box ? box.querySelector("[contenteditable]") : null;
  if (!body) return "";
  const c = body.cloneNode(true);
  // the editor writes each line as a <div> (an empty line is <div><br></div>): keep the lines
  c.querySelectorAll("br").forEach(br => br.replaceWith("\n"));
  c.querySelectorAll("div, p").forEach(d => d.before("\n"));
  let text = c.textContent.replace(/[ \t ]+/g, " ");
  text = text.replace(/ *\n */g, "\n");
  return text.replace(/\n{3,}/g, "\n\n").trim();
}

function allText(doc, sep) {
  const w = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT);
  const out = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) out.push(n.nodeValue);
  return out.join(sep);
}

function pageWordCount(doc) {
  const m = /(\d+)\s*\n\s*từ(?![\p{L}\p{N}_])/u.exec(allText(doc, "\n"));
  return m ? parseInt(m[1], 10) : null;
}

function pageInfo(doc) {
  const info = {};
  const w = doc.createTreeWalker(doc.documentElement, NodeFilter.SHOW_TEXT);
  const texts = [];
  for (let n = w.nextNode(); n; n = w.nextNode()) texts.push(n.nodeValue);
  const e = texts.findIndex(t => /^\s*\S+@\S+\.\w+\s*$/.test(t));
  if (e >= 0) {
    for (let i = e - 1; i >= 0; i--) {
      const t = texts[i].trim();
      if (t && !/^(?:[A-ZĐ]{1,3}|\d+)$/.test(t)) { info.student_full = t; break; }
    }
  }
  const overall = doc.querySelector(".o-spin.input-otp");
  if (overall && overall.textContent.trim()) info.overall = overall.textContent.trim();
  const box = doc.querySelector('[placeholder^="Nhập comment cho toàn bộ bài"]');
  if (box && box.textContent.trim()) info.teacher_comment = box.textContent.trim();
  const m = /Writing Week \d+/.exec(allText(doc, " "));
  if (m) info.homework = m[0];
  return info;
}

function paraTokens(p) {                      // split on <br> into paragraphs of text / highlight tokens
  const paras = [];
  let cur = [];
  for (const node of p.childNodes) {
    if (node.nodeType === 1 && node.tagName === "BR") { if (cur.length) paras.push(cur); cur = []; }
    else if (node.nodeType === 1 && node.classList.contains("comment-inline")) cur.push(node);
    else if (node.nodeType === 1 || node.nodeType === 3) { const t = node.textContent; if (t) cur.push(t); }
  }
  if (cur.length) paras.push(cur);
  return paras;
}

function studentMask(stream, original) {      // for each code point of stream: is it in her original?
  if (!original.length) return stream.map(() => true);
  const keep = stream.map(() => false);
  for (const [a, , n] of new SequenceMatcher(stream, original).getMatchingBlocks()) for (let i = a; i < a + n; i++) keep[i] = true;
  stream.forEach((ch, i) => { if (isSpace(ch)) keep[i] = true; });   // whitespace is never worth dropping on its own
  return keep;
}

const norm = t => t.replace(/\s+/g, " ").trim();

export function extractPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = [...doc.querySelectorAll("#lrgr #editorjs .ce-paragraph")];
  const original = cps([...doc.querySelectorAll("#trcc .ce-paragraph")].map(textWithBreaks).join("\n"));
  const kindOf = tok => [...tok.classList].find(k => k !== "comment-inline" && k !== "focus") || "other";
  const byId = id => doc.getElementById(id);

  // 1. tokens: plain text, corrections, notes (paragraph breaks as null)
  let items = [];
  for (const [pi, toks] of blocks.flatMap(paraTokens).entries()) {
    if (pi) items.push(null);
    for (const tok of toks) {
      if (typeof tok === "string") { items.push(["t", tok]); continue; }
      const sid = tok.getAttribute("id");
      const box = sid ? byId("comment-" + sid) : null;
      const s = tok.querySelector("s"), mk = tok.querySelector("mark");
      const orig = s ? s.textContent : "", fix = mk ? mk.textContent : "";
      if (s || mk) {
        if (orig || fix) items.push(["c", orig, fix, kindOf(tok), commentText(box)]);   // a correction may have no comment box
      } else if (tok.textContent.trim() && box) items.push(["n", tok.textContent, kindOf(tok), commentText(box)]);
    }
  }
  const textOf = it => it === null ? "\n" : it[1];

  // 1b. paragraph breaks the corrected copy lost ("former.On the one hand"): take them from the original
  if (original.length) {
    const stream = cps(items.map(textOf).join(""));
    const cuts = new Set();
    for (const [tag, i1, i2, j1, j2] of new SequenceMatcher(stream, original).getOpcodes()) {
      const near = stream.slice(Math.max(0, i1 - 3), i2 + 3).join("");   // a break right beside it is the same break, shifted
      if ((tag === "insert" || tag === "replace") && original.slice(j1, j2).includes("\n") && !near.includes("\n")) cuts.add(i1);
    }
    if (cuts.size) {
      const out = [];
      let pos = 0;
      for (const it of items) {
        const text = cps(textOf(it));
        const isT = it && it[0] === "t";
        const inner = isT ? [...cuts].filter(c => pos < c && c < pos + text.length).map(c => c - pos).sort((x, y) => x - y) : [];
        if (isT && cuts.has(pos) && out.length && out[out.length - 1] !== null) out.push(null);
        if (inner.length) {
          let prev = 0;
          for (const c of inner) { out.push(["t", text.slice(prev, c).join("")], null); prev = c; }
          out.push(["t", text.slice(prev).join("")]);
        } else out.push(it);
        pos += text.length;
      }
      items = out;
    }
  }

  // 2. which characters of what the student wrote (plain text, <s>, note text) are really hers
  const streams = items.map(it => cps(it === null ? "\n" : ["t", "c", "n"].includes(it[0]) ? it[1] : ""));
  const keep = studentMask(streams.flat(), original);
  const split = [], flagsOf = [];
  let pos = 0;
  streams.forEach((text, k) => {
    const flags = keep.slice(pos, pos + text.length);
    const mine = text.filter((ch, i) => flags[i]).join("");
    // the teacher's words, with their own spacing: drop the student's letters, keep the gaps
    let added = text.map((ch, i) => !flags[i] || isSpace(ch) ? ch : "\0").join("").replace(/\0/g, " \0 ");
    added = added.split(/\s+/).filter(Boolean).join(" ").replace(/\0/g, "");
    added = added.replace(/\s+/g, " ").trim();
    split[k] = [mine, added]; flagsOf[k] = flags;
    pos += text.length;
  });

  // 3. sentences
  const corrections = {}, notes = [];
  let paragraphs = [], sentences = [], segs = [], n = 0;
  const close = () => {
    while (segs.length && typeof segs[0] === "string" && !segs[0].trim()) segs.shift();
    if (segs.length && typeof segs[0] === "string") segs[0] = segs[0].replace(/^\s+/, "");
    if (segs.length) { sentences.push({ id: `p${paragraphs.length}s${sentences.length}`, segs: [...segs] }); segs = []; }
  };
  const textIn = text => {
    const parts = splitSentences(text);
    parts.forEach((part, i) => {
      if (i > 0) close();
      if (part) segs.push(i === parts.length - 1 ? part : part + " ");
    });
  };
  let afterStop = false;                      // the last highlight ended a sentence
  items.forEach((it, k) => {
    if (it === null) { close(); paragraphs.push({ sentences }); sentences = []; afterStop = false; return; }
    const [mine, added] = split[k];
    if (it[0] === "t") {
      // the student's text, with anything the teacher typed into it (no highlight) as a correction
      const runs = [];
      cps(it[1]).forEach((ch, i) => {
        const ok = flagsOf[k][i];
        if (runs.length && runs[runs.length - 1][1] === ok) runs[runs.length - 1][0] += ch;
        else runs.push([ch, ok]);
      });
      for (let i = runs.length - 2; i > 0; i--) {  // "The high": teacher words split by a kept space
        if (runs[i][1] && !runs[i][0].trim() && !runs[i - 1][1] && !runs[i + 1][1]) {
          runs[i - 1][0] += runs[i][0] + runs.splice(i + 1, 1)[0][0];
          runs.splice(i, 1);
        }
      }
      for (const [chunk, ok] of runs) {
        if (!ok) {
          n++;
          corrections["c" + n] = { orig: "", fix: chunk, kind: "teacher", comment: "" };
          segs.push({ c: "c" + n });
          afterStop = /[.?!]\s*$/.test(chunk);
          continue;
        }
        let text = chunk.replace(/ {2,}/g, " ");
        if (afterStop && /^\s/.test(text)) { close(); text = text.replace(/^\s+/, ""); }
        afterStop = false;
        if (text) textIn(text);
      }
      return;
    }
    if (it[0] === "n") {
      const [, , kind, comment] = it;
      const m = SLASH_FIX.exec(added);
      if (m && mine.trim()) {                 // "offspring // CHILDREN": a correction written in the essay
        n++;
        corrections["c" + n] = { orig: mine.trim(), fix: m[1].toLowerCase(), kind, comment };
        const lead = mine.slice(0, mine.length - mine.replace(/^\s+/, "").length);
        if (lead) segs.push(lead);
        segs.push({ c: "c" + n });
        afterStop = false;
        return;
      }
      const hasText = segs.some(g => (typeof g === "object" && "c" in g) || (typeof g === "string" && g.trim()));
      // "=> COMMENT" points back at what was just written
      const back = added.startsWith("=>") && !mine.trim() && !hasText;
      notes.push({ comment, kind, quote: mine.trim(), added, back });
      segs.push({ n: notes.length - 1 });
      if (mine) textIn(mine.replace(/ {2,}/g, " "));
      afterStop = /[.?!]\s*$/.test(mine);
      return;
    }
    const [, orig, fix, kind, comment] = it;
    n++;
    corrections["c" + n] = { orig, fix, kind, comment };
    segs.push({ c: "c" + n });
    afterStop = /[.?!]\s*$/.test(fix || orig);
  });
  close();
  paragraphs.push({ sentences });

  // 4. link notes to their sentence; a note alone in its "sentence" (a marker after a full stop)
  //    belongs to the sentence before it
  let prevSid = null;
  for (const p of paragraphs) {
    const kept = [];
    for (const s of p.sentences) {
      const marks = s.segs.filter(g => typeof g === "object" && "n" in g).map(g => g.n);
      s.segs = s.segs.filter(g => !(typeof g === "object" && "n" in g));
      while (s.segs.length && typeof s.segs[0] === "string" && !s.segs[0].trim()) s.segs.shift();
      if (s.segs.length && typeof s.segs[0] === "string") s.segs[0] = s.segs[0].replace(/^\s+/, "");
      const merged = [];
      for (const g of s.segs) {
        if (typeof g === "string" && merged.length && typeof merged[merged.length - 1] === "string") merged[merged.length - 1] += g;
        else merged.push(g);
      }
      s.segs = merged;
      const hasText = s.segs.some(g => typeof g === "object" || g.trim());
      for (const i of marks) {
        const here = hasText && !notes[i].back;
        notes[i].sentence_ids = [here || prevSid === null ? s.id : prevSid];
      }
      if (hasText) { kept.push(s); prevSid = s.id; }
    }
    p.sentences = kept;
  }
  paragraphs = paragraphs.filter(p => p.sentences.length);
  paragraphs.forEach((p, pi) => p.sentences.forEach((s, si) => {   // renumber after dropping marker-only sentences
    const old = s.id; s.id = `p${pi}s${si}`;
    for (const note of notes) note.sentence_ids = (note.sentence_ids || []).map(x => x === old ? s.id : x);
  }));

  const sentenceText = s => s.segs.map(x => typeof x === "string" ? x : corrections[x.c].orig).join("");
  const taskComments = [];
  for (const sp of doc.querySelectorAll("#trcc span.comment-inline")) {
    const box = byId("comment-" + sp.getAttribute("id"));
    let text = norm(sp.textContent);
    // whole sentences inside the highlight, or the one sentence a partial highlight sits in
    let ids = paragraphs.flatMap(p => p.sentences).filter(s => { const st = norm(sentenceText(s)); return st && (text.includes(st) || st.includes(text)); }).map(s => s.id);
    let added = "";
    if (!ids.length) {
      // text the teacher typed into the essay (a sentence the student should add): hang it on the
      // sentence it follows in the TR/CC editor
      const block = sp.closest(".ce-paragraph");
      let before = "";
      if (block) {
        const w = doc.createTreeWalker(block, NodeFilter.SHOW_TEXT);
        const parts = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) {
          if (sp.contains(t)) break;
          parts.push(t.nodeValue);
        }
        before = norm(parts.join(""));
      }
      for (const p of paragraphs) for (const s of p.sentences) {
        const st = norm(sentenceText(s));
        if (st && before.includes(st.slice(0, 40))) ids = [s.id];
      }
      added = text; text = "";
    }
    taskComments.push({ sentence_ids: added ? ids.slice(-1) : ids, comment: commentText(box), kind: "trcc", quote: text, added });
  }
  for (const x of notes) taskComments.push({ sentence_ids: x.sentence_ids || [], comment: x.comment, kind: x.kind, quote: x.quote, added: x.added });

  const scores = [...doc.querySelectorAll("#right-partial input.input-otp")].slice(0, 4).map(i => i.getAttribute("value"));
  const essayText = paragraphs.flatMap(p => p.sentences).map(sentenceText).join(" ");
  return {
    ...pageInfo(doc),
    scores: Object.fromEntries(["TR", "CC", "LR", "GR"].map((k, i) => [k, scores[i]]).filter(([, v]) => v !== undefined)),
    word_count: pageWordCount(doc) || essayText.split(/\s+/).filter(Boolean).length,
    essay: { paragraphs },
    corrections,
    task_comments: taskComments,
  };
}
