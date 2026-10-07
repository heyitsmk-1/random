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
  const total = score100(doc);
  if (total != null) info.total = { score: total, max: 100 };
  return info;
}
/* the "Tổng điểm" box when the teacher marks out of 100 ("Scale 100 điểm" ticked), else null */
function score100(doc) {
  const label = [...doc.querySelectorAll("p")].find(p => p.textContent.trim() === "Tổng điểm");
  const box = label && label.parentElement.querySelector("input");
  const scale = [...doc.querySelectorAll("div")].find(d => !d.querySelector("div") && d.textContent.trim() === "Scale 100 điểm");
  const dot = scale && scale.previousElementSibling, fill = dot && dot.querySelector(".bg-primary");
  const picked = !!(fill && !/opacity:\s*0(?![.\d])/.test(fill.getAttribute("style") || ""));
  const value = box ? String(box.value || box.getAttribute("value") || "").trim().replace(",", ".") : "";
  if (!picked || !/^\d+(\.\d+)?$/.test(value)) return null;
  return +value;
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

const sameButCase = (a, b) => a.length === b.length && a.every((x, i) => x === b[i] || x.toLowerCase() === b[i].toLowerCase());
// what the teacher types into the essay, for pages with no copy of her original at all
const TEACHER_MARKS = /\(\(|\)\)|=>\s*COMMENT\b(?:\s*(?:\.{2,}|…))?|\/\/\s*[^a-z\n/]*[A-Z][^a-z\n/]*?(?=\s+[a-z]|[.,;:]?\s*$|$)/gu;
/* her essay exactly as she sent it (the CRM's "Bài gốc" tab): kept by content.js in #dau-bai-goc, or the
   tab's text in a page saved with it open; "" when the page has neither */
function baiGoc(doc) {
  const kept = doc.querySelector("#dau-bai-goc");
  if (kept && kept.textContent.trim()) return kept.textContent.replace(/\u00a0/g, " ").trim();
  for (const el of doc.querySelectorAll("#main-scroll .whitespace-pre-line")) {
    if (el.classList.contains("ielts-editor") || el.closest(".writing-ai-note") || el.querySelector(".codex-editor")) continue;
    if (el.textContent.trim()) return el.textContent.replace(/\u00a0/g, " ").trim();
  }
  return "";
}
/* for each code point of stream: is it in her original? What the teacher obviously typed ("((", "))",
   "=> COMMENT ...", "// FIX") is never hers, and is left out before comparing (so her own full stop is not
   matched to the teacher's dots) */
function studentMask(stream, original) {
  const marked = stream.map(() => false), text = stream.join("");
  for (const m of text.matchAll(TEACHER_MARKS)) { const a = cps(text.slice(0, m.index)).length, b = a + cps(m[0]).length; for (let i = a; i < b; i++) marked[i] = true; }
  let keep;
  if (!original.length) keep = marked.map(x => !x);
  else {
    const idx = []; stream.forEach((_, i) => { if (!marked[i]) idx.push(i); });
    const sub = idx.map(i => stream[i]);
    keep = stream.map(() => false);
    for (const [tag, i1, i2, j1, j2] of new SequenceMatcher(sub, original).getOpcodes()) {
      // a letter whose case differs between the copies ("Golf" / "golf") is still hers
      if (tag === "equal" || (tag === "replace" && sameButCase(sub.slice(i1, i2), original.slice(j1, j2)))) for (let i = i1; i < i2; i++) keep[idx[i]] = true;
    }
  }
  stream.forEach((ch, i) => { if (isSpace(ch)) keep[i] = true; });   // whitespace is never worth dropping on its own
  return keep;
}

const norm = t => t.replace(/\s+/g, " ").trim();
const key = t => norm(t).replace(/ ([.,;:!?])/g, "$1");   // for matching only: "16% ." is "16%."
const ACRONYMS = new Set(["UK", "US", "USA", "EU", "UAE", "GDP", "IELTS", "TV", "IT", "AI"]);
function lowerCaps(text) {                    // the teacher's CAPS lowercased ("REACHING 16% IN 2010", "CANnot"), acronyms kept
  const out = [];
  let run = [];
  for (const ch of [...cps(text), "\0"]) {
    if (isUpper(ch)) { run.push(ch); continue; }
    const word = run.join("");
    out.push(word.length >= 2 && !ACRONYMS.has(word) ? word.toLowerCase() : word);
    run = [];
    out.push(ch);
  }
  return out.join("").slice(0, -1);
}
const isUpper = c => c !== c.toLowerCase() && c === c.toUpperCase();
const isLower = c => c !== c.toUpperCase() && c === c.toLowerCase();

/* Highlights in the TR/CC editor where the teacher typed over the student's words (in CAPS, e.g.
   "factors CAUSED BY EXPANDING PRODUCT THAT bringS about" for "factors bringing about"). The TR/CC
   editor is read as the student's original, so there her words would be lost: for such a highlight,
   take her words from the corrected copy (stream). Same as teacher_rewrites() in extract_page.py. */
function teacherRewrites(stream, original, highlights) {
  const spans = [];
  let cursor = 0;
  for (const el of highlights) {                // each highlight's place in the original, in document order
    const t = cps(textWithBreaks(el));
    const k = t.length ? indexOfCps(original, t, cursor) : -1;
    spans.push(k >= 0 ? [k, k + t.length] : null);
    if (k >= 0) cursor = k + t.length;
  }
  const opcodes = new SequenceMatcher(stream, original).getOpcodes();
  const ops = opcodes.filter(op => op[0] !== "equal");
  const owner = new Map();                      // opcode -> highlight index
  spans.forEach((sp, h) => {
    if (!sp) return;
    const [s, e] = sp;
    const inside = [...ops.filter(op => op[3] < op[4] && s <= op[3] && op[4] <= e), ...ops.filter(op => op[3] === op[4] && s <= op[3] && op[3] <= e)];
    const typed = inside.flatMap(op => original.slice(op[3], op[4]));
    if (inside.length && inside.some(op => op[1] < op[2]) && typed.some(isUpper) && !typed.some(isLower)) for (const op of inside) owner.set(op, h);
  });
  if (!owner.size) return { original, rewrites: new Map() };
  const out = [], at = new Map();               // at: original position -> patched position, for the highlight edges
  let base = 0;
  for (const op of opcodes) {
    const [tag, i1, i2, j1, j2] = op, mine = owner.has(op);
    for (let j = j1; j <= j2; j++) if (!at.has(j)) at.set(j, base + (tag === "equal" || !mine ? j - j1 : j === j1 ? 0 : i2 - i1));
    const piece = mine ? stream.slice(i1, i2) : original.slice(j1, j2);
    out.push(...piece); base += piece.length;
  }
  const rewrites = new Map();
  for (const h of new Set(owner.values())) {
    const [s, e] = spans[h];
    const mine = out.slice(at.get(s), at.get(e)).join("");
    const typed = new Set();
    for (const [op, hh] of owner) if (hh === h) for (let j = op[3]; j < op[4]; j++) typed.add(j);
    const theirs = original.slice(s, e).map((c, k) => typed.has(s + k) ? c.toLowerCase() : c).join("");
    rewrites.set(h, [mine, theirs]);
  }
  return { original: out, rewrites };
}
function indexOfCps(hay, needle, from) {
  outer: for (let i = from; i + needle.length <= hay.length; i++) {
    for (let k = 0; k < needle.length; k++) if (hay[i + k] !== needle[k]) continue outer;
    return i;
  }
  return -1;
}

const isLetter = ch => !!ch && /[\p{L}'’]/u.test(ch);
const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
function editDistance(a, b) {
  a = cps(a); b = cps(b);
  let row = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next.push(Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)));
    row = next;
  }
  return row[b.length];
}
/* Same as merge_in_word() in extract_page.py. */
function mergeInWord(paragraphs, corrections, original) {
  const shown = g => typeof g === "string" ? g : corrections[g.c].fix || corrections[g.c].orig;
  const joins = (x, y) => { const l = cps(shown(x)), r = cps(shown(y)); return isLetter(l[l.length - 1]) && isLetter(r[0]); };
  for (const p of paragraphs) for (const s of p.sentences) {
    const segs = s.segs;
    for (let i = 0; i < segs.length; i++) {
      if (typeof segs[i] === "string") continue;
      let a = i, b = i, left = "", right = "";
      while (a > 0 && joins(segs[a - 1], segs[a])) {
        const g = segs[a - 1];
        if (typeof g === "string" && /\s/.test(g)) { left = g.match(/\S+$/)[0]; break; }
        a--;
      }
      while (b < segs.length - 1 && joins(segs[b], segs[b + 1])) {
        const g = segs[b + 1];
        if (typeof g === "string" && /\s/.test(g)) { right = g.match(/^\S+/)[0]; break; }
        b++;
      }
      const inner = segs.slice(a, b + 1), ids = inner.filter(g => typeof g !== "string").map(g => g.c);
      if (!left && !right && inner.length === 1) continue;           // a whole-word correction already
      const word = which => left + inner.map(g => typeof g === "string" ? g : corrections[g.c][which]).join("") + right;
      let orig = word("orig");
      const before = a > 0 && typeof segs[a - 1] === "string" ? segs[a - 1].slice(0, segs[a - 1].length - left.length) : "";
      const after = b < segs.length - 1 && typeof segs[b + 1] === "string" ? segs[b + 1].slice(right.length) : "";
      // her word: after the same word in the original, the closest in spelling to what is left of it
      const prev = (before.match(/(\S+)\s+$/) || [])[1], next = (after.match(/^\s+(\S+)/) || [])[1];
      const core = orig.replace(/^[^\p{L}]+|[^\p{L}]+$/gu, "");
      if ((prev || next) && core && !/\s/.test(orig)) {
        const re = prev ? new RegExp(escRe(prev) + "\\s+([\\p{L}'’-]+)", "gu") : new RegExp("([\\p{L}'’-]+)\\S*\\s+" + escRe(next), "gu");
        let best = null, dist = Infinity;
        for (const m of original.matchAll(re)) { const d = editDistance(m[1], core); if (d < dist) { best = m[1]; dist = d; } }
        if (best !== null && dist <= Math.max(2, Math.floor(cps(core).length / 3))) orig = orig.replace(core, best);
      }
      const cs = ids.map(id => corrections[id]);
      const kind = (cs.find(c => c.kind !== "teacher") || cs[0]).kind;
      const comment = [...new Set(cs.map(c => c.comment).filter(Boolean))].join("\n");
      corrections[ids[0]] = { orig, fix: word("fix"), kind, comment };
      for (const id of ids.slice(1)) delete corrections[id];
      const out = [...segs.slice(0, a)];
      if (a > 0 && left) out[out.length - 1] = before;
      out.push({ c: ids[0] });
      if (b < segs.length - 1) out.push(right ? after : segs[b + 1]);
      out.push(...segs.slice(b + 2));
      s.segs = out.filter(g => g !== "");
      return mergeInWord(paragraphs, corrections, original);         // segs changed: start over
    }
  }
}

/* spaces left where the teacher's typing was taken out: one space, and none before a full stop or comma
   she didn't space herself */
function tidySpaces(paragraphs, original) {
  for (const p of paragraphs) for (const s of p.sentences) {
    const out = [];
    for (const g of s.segs) { if (typeof g === "string" && typeof out[out.length - 1] === "string") out[out.length - 1] += g; else out.push(g); }
    const hersSpaced = (w, p_) => !original || new RegExp(w.replace(/'/g, "\\'") + " +\\" + p_).test(original);
    const segs = out.map(g => typeof g !== "string" ? g : g.replace(/(?<=\S) {2,}(?=\S)/g, " ")
      .replace(/([A-Za-z0-9']+) +([.,;:!?])/g, (m, w, p_) => hersSpaced(w, p_) ? m : w + p_));
    // across a note's marker (what it was about is gone): no double space, no space before her full stop
    let prev = null;
    segs.forEach((g, i) => {
      if (typeof g !== "string") { if (!("n" in g)) prev = null; return; }
      if (prev !== null && segs[prev].endsWith(" ") && g.startsWith(" ")) {
        g = g.replace(/^ +/, "");
        const m = /^[.,;:!?]/.exec(g), w = /([A-Za-z0-9']+) $/.exec(segs[prev]);
        if (m && w && !hersSpaced(w[1], m[0])) segs[prev] = segs[prev].replace(/ +$/, "");
        segs[i] = g;
      }
      prev = i;
    });
    s.segs = segs;
  }
}

export function extractPage(html) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const blocks = [...doc.querySelectorAll("#lrgr #editorjs .ce-paragraph")];
  let original = cps([...doc.querySelectorAll("#trcc .ce-paragraph")].map(textWithBreaks).join("\n").replace(/\u00a0/g, " "));
  // her essay as she sent it ("Bài gốc"): what every quote of hers is checked against
  const sent = cps(baiGoc(doc));
  const kindOf = tok => [...tok.classList].find(k => k !== "comment-inline" && k !== "focus") || "other";
  const byId = id => doc.getElementById(id);

  // 1. tokens: plain text, corrections, notes (paragraph breaks as null)
  let items = [];
  for (const [pi, toks] of blocks.flatMap(paraTokens).entries()) {
    if (pi) items.push(null);
    for (const tok of toks) {
      if (typeof tok === "string") { items.push(["t", tok.replace(/\u00a0/g, " ")]); continue; }
      const sid = tok.getAttribute("id");
      const box = sid ? byId("comment-" + sid) : null;
      // "((words)) => COMMENT": the brackets mark the words the comment is about
      const bare = tok.textContent.trim();
      if ((bare === "((" || bare === "))") && !commentText(box)) { items.push([bare === "((" ? "o" : "x", ""]); continue; }
      // her words crossed out: the editor's <s>, or a span with its strikethrough class ("small /": the
      // teacher's " /" separator is not hers)
      const s = tok.querySelector("s") || tok.querySelector(".cdx-strikethrough"), mk = tok.querySelector("mark");
      const orig = s ? s.textContent.replace(/\s*\/\s*$/, "") : "", fix = mk ? mk.textContent : "";
      const struck = s || mk ? null : tok.querySelector('[style*="line-through"]');
      if (s || mk) {
        if (orig || fix) items.push(["c", orig, fix, kindOf(tok), commentText(box)]);   // a correction may have no comment box
      } else if (struck && struck.textContent.trim()) {
        // crossed out by hand, then the teacher's version: a correction (her words may run on past the
        // crossed-out part; step 1d takes them from the original)
        const w = doc.createTreeWalker(tok, NodeFilter.SHOW_TEXT), parts = [];
        for (let t = w.nextNode(); t; t = w.nextNode()) if (!struck.contains(t)) parts.push(t.nodeValue);
        const theirs = lowerCaps(parts.join("").replace(/\s+/g, " ").trim());
        items.push(["c", struck.textContent.replace(/\u00a0/g, " "), theirs, kindOf(tok), commentText(box), "grow"]);
      } else if (tok.textContent.trim() && box) items.push(["n", tok.textContent.replace(/\u00a0/g, " "), kindOf(tok), commentText(box)]);
    }
  }
  const textOf = it => it === null ? "\n" : it[1];

  // 1b. paragraph breaks the corrected copy lost ("former.On the one hand"): take them from the original
  if (!original.length && sent.length) original = sent;   // no TR/CC copy (left empty): Bài gốc is the original
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

  // 1c. highlights where the teacher typed over her words in the TR/CC editor: her words win
  const trccMarks = [...doc.querySelectorAll("#trcc .comment-inline")];
  let rewrites = new Map();
  if (original.length) ({ original, rewrites } = teacherRewrites(cps(items.map(textOf).join("")), original, trccMarks));
  // from here on, her words are what she sent (Bài gốc) when the page has it: anything the teacher typed,
  // in either editor, is not hers
  if (sent.length) original = sent;

  // 1d. a hand-made correction whose new version swallowed some of her words ("accounting for 16%" ->
  //     "REACHING 16% IN 2010"): her words right after the crossed-out part belong to it
  const grow = items.map((it, k) => it && it[0] === "c" && it.length > 5 ? k : -1).filter(k => k >= 0);
  if (grow.length && original.length) {
    const texts = items.map(textOf).map(cps), ends = [];
    let at = 0;
    for (const t of texts) { at += t.length; ends.push(at); }
    const stream = texts.flat();
    const ops = new SequenceMatcher(stream, original).getOpcodes();
    for (const k of grow) {
      const e = ends[k];
      // right after it, or after the space that follows it ("do| not| sell")
      const gap = e < stream.length && stream[e] === " " ? " " : "";
      const op = ops.find(([tag, i1]) => tag === "insert" && (i1 === e || i1 === e + gap.length));
      const extra = op ? original.slice(op[3], op[4]).join("") : "";
      if (extra.trim() && !extra.includes("\n")) {
        const lead = /^\s/.test(extra) ? "" : gap;
        items[k] = ["c", items[k][1] + lead + extra.replace(/\s+$/, ""), ...items[k].slice(2, 5)];
      }
    }
  }
  items = items.map(it => it && it[0] === "c" ? it.slice(0, 5) : it);

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
  let bracket = null, closed = null;          // the student's words since "((", and the last closed "(( ))"
  const hers = t => { if (bracket !== null) bracket += t; };
  items.forEach((it, k) => {
    if (it === null) { close(); paragraphs.push({ sentences }); sentences = []; afterStop = false; return; }
    if (it[0] === "o") { bracket = ""; return; }
    if (it[0] === "x") { if (bracket !== null) closed = norm(bracket); bracket = null; return; }
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
        if (!ok && (chunk.trim() === "((" || chunk.trim() === "))")) {   // the brackets typed without a highlight
          if (chunk.trim() === "((") bracket = "";
          else { if (bracket !== null) closed = norm(bracket); bracket = null; }
          continue;
        }
        if (!ok && /^\s*(?:\.{2,}|…)[\s.…]*$/.test(chunk)) continue;   // "=> COMMENT ...": the teacher's dots, not a fix
        if (!ok) {
          n++;
          corrections["c" + n] = { orig: "", fix: chunk, kind: "teacher", comment: "" };
          segs.push({ c: "c" + n });
          afterStop = /[.?!]\s*$/.test(chunk);
          continue;
        }
        let text = chunk.replace(/ {2,}/g, " ");
        if (afterStop && /^\s/.test(text)) { close(); text = text.replace(/^\s+/, ""); }
        hers(text);
        if (text) textIn(text);
        afterStop = /[.?!]\s*$/.test(text);   // her full stop, then the teacher's typing
      }
      return;
    }
    if (it[0] === "n") {
      const [, , kind, comment] = it;
      let added = split[k][1], quote = null;
      if (/^\)\)/.test(added) && bracket !== null) {   // "((words)) => COMMENT"
        hers(mine); quote = norm(bracket); bracket = null; added = added.replace(/^\)\)\s*/, "");
      } else if (added.startsWith("=>") && closed) quote = closed;
      closed = null;
      const m = SLASH_FIX.exec(added);
      if (m && mine.trim()) {                 // "offspring // CHILDREN": a correction written in the essay
        n++;
        corrections["c" + n] = { orig: mine.trim(), fix: m[1].toLowerCase(), kind, comment };
        const lead = mine.slice(0, mine.length - mine.replace(/^\s+/, "").length);
        if (lead) segs.push(lead);
        segs.push({ c: "c" + n });
        hers(mine);
        afterStop = false;
        return;
      }
      const hasText = segs.some(g => (typeof g === "object" && "c" in g) || (typeof g === "string" && g.trim()));
      // "=> COMMENT" points back at what was just written
      const back = quote === null && added.startsWith("=>") && !mine.trim() && !hasText;
      notes.push({ comment, kind, quote: quote === null ? mine.trim() : quote, added, back });
      segs.push({ n: notes.length - 1 });
      if (quote === null) hers(mine);
      if (mine) textIn(mine.replace(/ {2,}/g, " "));
      if (mine.trim()) afterStop = /[.?!]\s*$/.test(mine);   // a mark with none of her words ("=> COMMENT") doesn't end or open a sentence
      return;
    }
    const [, orig, fix, kind, comment] = it;
    n++;
    hers(orig);
    corrections["c" + n] = { orig, fix, kind, comment };
    segs.push({ c: "c" + n });
    afterStop = /[.?!]\s*$/.test(fix || orig);
  });
  close();
  paragraphs.push({ sentences });
  tidySpaces(paragraphs, original.join(""));

  // 4. link notes to their sentence; a note alone in its "sentence" (a marker after a full stop)
  //    belongs to the sentence before it
  let prevSid = null;
  for (const p of paragraphs) {
    const kept = [];
    for (const s of p.sentences) {
      const marks = s.segs.filter(g => typeof g === "object" && "n" in g).map(g => g.n);
      // where each mark sits in her sentence (a typed-in linker pops in there)
      const at = {};
      let upto = "";
      for (const g of s.segs) {
        if (typeof g === "object" && "n" in g) at[g.n] = cps(upto.replace(/^\s+/, "")).length;
        else upto += typeof g === "string" ? g : corrections[g.c].orig;
      }
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
        notes[i].at = here ? at[i] : -1;
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

  // 5. an edit inside one word ("heal|th|care", an added "l") is one correction of the whole word,
  //    her spelling taken from the original
  mergeInWord(paragraphs, corrections, original.join(""));

  const sentenceText = s => s.segs.map(x => typeof x === "string" ? x : corrections[x.c].orig).join("");
  const taskComments = [];
  for (const [h, sp] of trccMarks.entries()) {
    const box = byId("comment-" + sp.getAttribute("id"));
    let text = rewrites.has(h) ? norm(rewrites.get(h)[0]) : norm(sp.textContent);
    // whole sentences inside the highlight, or the one sentence a partial highlight sits in
    let ids = paragraphs.flatMap(p => p.sentences).filter(s => { const st = key(sentenceText(s)); return st && (key(text).includes(st) || st.includes(key(text))); }).map(s => s.id);
    let added = "";
    if (rewrites.has(h)) {
      taskComments.push({ sentence_ids: ids, comment: commentText(box), kind: "trcc", quote: text, added: "", fix: norm(rewrites.get(h)[1]) });
      continue;
    }
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
  for (const x of notes) taskComments.push({ sentence_ids: x.sentence_ids || [], comment: x.comment, kind: x.kind, quote: x.quote, added: x.added, at: x.at ?? -1 });

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
