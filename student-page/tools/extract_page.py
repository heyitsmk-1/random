"""Extract essay, corrections and comments from a saved admin.ielts1984.vn writing page.

Usage: python3 extract_page.py saved_page.html out.json [saved_page_with_Bai_goc_open.html]

Her own words are checked against "Bài gốc" (the essay as she sent it): the copy the extension keeps
in #dau-bai-goc, a third argument saved with the Bài gốc tab open, or the tab itself if the page was
saved with it open; else the "Lập luận và Mạch lạc" editor; with neither, the obvious teacher marks
("((", "))", "=> COMMENT", "// FIX") are dropped.

Output shape (consumed by the lesson author, and later by the extension):
  essay.paragraphs[].sentences[] = {id, segs: [str | {c: correction_id}]}
  corrections[id] = {orig, fix, kind, comment}
  task_comments[] = {sentence_ids, comment, kind, quote, added}

Highlights in the grammar/vocab editor come in three shapes:
  - a correction: <s>student's words</s><mark>fix</mark>
  - a note: a highlight with no <s>/<mark> (the neutral "default" colour, or a marker in any colour);
    it becomes a task comment on the sentence it sits in
  - teacher typing inside the essay ("// CHILDREN", "IN PARTICULAR,", "=> COMMENT"): anything that is
    not in the student's original essay (the "Lập luận và Mạch lạc" editor) is dropped from the essay
    and kept on the note as `added`. "words // FIX" on a note becomes a correction words -> fix.
  - a hand-made correction: words crossed out with the line-through style (not the editor's <s>)
    followed by the teacher's version, often in CAPS; it reads as a correction, the CAPS lowercased.
A letter that only changed case ("Golf" in one copy, "golf" in the other) is still the student's.
"""
import difflib
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString, Tag

SENT_END = re.compile(r"(?<=[.?!])\s+")
ABBREV = re.compile(r"(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|approx)\.)$", re.I)
SLASH_FIX = re.compile(r"^\s*//\s*(.+?)\s*$")


def norm(t):
    return re.sub(r"\s+", " ", t).strip()


def split_sentences(text):
    """Split on sentence punctuation, but not after common abbreviations."""
    parts = []
    for part in SENT_END.split(text):
        if parts and ABBREV.search(parts[-1]):
            parts[-1] += " " + part
        else:
            parts.append(part)
    return parts


def comment_text(box):
    """The comment's text, or '' if the box has no editable body."""
    body = box.select_one("[contenteditable]") if box else None
    if not body:
        return ""
    # the editor writes each line as a <div> (an empty line is <div><br></div>): keep the lines
    for br in body.find_all("br"):
        br.replace_with("\n")
    for div in body.find_all(["div", "p"]):
        div.insert_before("\n")
    text = re.sub(r"[ \t\xa0]+", " ", body.get_text())
    text = re.sub(r" *\n *", "\n", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def page_word_count(soup):
    """The word count the admin page shows next to the essay ("274 từ"), if present."""
    m = re.search(r"(\d+)\s*\n\s*từ\b", soup.get_text("\n"))
    return int(m.group(1)) if m else None


def page_info(soup):
    """Student name, homework title, overall band and the teacher's comment on the whole essay."""
    info = {}
    email = soup.find(string=re.compile(r"^\s*\S+@\S+\.\w+\s*$"))
    if email:
        prev = email.find_previous(string=lambda s: s.strip() and not re.fullmatch(r"[A-ZĐ]{1,3}|\d+", s.strip()))
        if prev:
            info["student_full"] = prev.strip()
    overall = soup.select_one(".o-spin.input-otp")
    if overall and overall.get_text().strip():
        info["overall"] = overall.get_text().strip()
    box = soup.select_one('[placeholder^="Nhập comment cho toàn bộ bài"]')
    if box and box.get_text().strip():
        info["teacher_comment"] = box.get_text().strip()
    m = re.search(r"Writing Week \d+", soup.get_text(" "))
    if m:
        info["homework"] = m.group(0)
    total = score100(soup)
    if total is not None:
        info["total"] = {"score": total, "max": 100}
    return info


def score100(soup):
    """The "Tổng điểm" box when the teacher marks out of 100 ("Scale 100 điểm" ticked), else None."""
    label = soup.find(lambda t: t.name == "p" and t.get_text(strip=True) == "Tổng điểm")
    box = label.find_next("input") if label else None
    scale = soup.find(lambda t: t.name == "div" and t.get_text(strip=True) == "Scale 100 điểm" and not t.find("div"))
    dot = scale.find_previous_sibling("div") if scale else None
    picked = bool(dot and dot.select_one(".bg-primary") and "opacity: 0" not in (dot.select_one(".bg-primary").get("style") or "").replace(";", ""))
    value = (box.get("value") or "").strip().replace(",", ".") if box else ""
    if not picked or not re.fullmatch(r"\d+(\.\d+)?", value):
        return None
    n = float(value)
    return int(n) if n == int(n) else n


def para_tokens(p):
    """Split an editor paragraph on <br> into paragraphs of text/highlight tokens."""
    paras, cur = [], []
    for node in p.children:
        if isinstance(node, Tag) and node.name == "br":
            if cur:
                paras.append(cur)
            cur = []
        elif isinstance(node, Tag) and "comment-inline" in node.get("class", []):
            cur.append(node)
        elif isinstance(node, (NavigableString, Tag)):
            text = node.get_text() if isinstance(node, Tag) else str(node)
            if text:
                cur.append(text)
    if cur:
        paras.append(cur)
    return paras


def same_but_case(a, b):
    return len(a) == len(b) and all(x == y or x.lower() == y.lower() for x, y in zip(a, b))


# what the teacher types into the essay, for pages with no copy of her original at all
TEACHER_MARKS = re.compile(r"\(\(|\)\)|=>\s*COMMENT\b(?:\s*(?:\.{2,}|…))?|//\s*[^a-z\n/]*[A-Z][^a-z\n/]*?(?=\s+[a-z]|[.,;:]?\s*$|$)")


def bai_goc(soup):
    """Her essay exactly as she sent it (the CRM's "Bài gốc" tab): kept by the extension in #dau-bai-goc,
    or the tab's text in a page saved with it open. "" when the page has neither."""
    kept = soup.select_one("#dau-bai-goc")
    if kept and kept.get_text().strip():
        return kept.get_text().replace("\xa0", " ").strip()
    for el in soup.select("#main-scroll .whitespace-pre-line"):
        if "ielts-editor" in (el.get("class") or []) or el.find_parent(class_="writing-ai-note") or el.select_one(".codex-editor"):
            continue
        if el.get_text().strip():
            return el.get_text().replace("\xa0", " ").strip()
    return ""


def student_mask(stream, original):
    """For each character of `stream`, whether it is in the student's original essay. What the teacher
    obviously typed ("((", "))", "=> COMMENT ...", "// FIX") is never hers, and is left out before comparing
    (so her own full stop is not matched to the teacher's dots)."""
    marked = [False] * len(stream)
    for m in TEACHER_MARKS.finditer(stream):
        for i in range(m.start(), m.end()):
            marked[i] = True
    if not original:
        keep = [not x for x in marked]
    else:
        idx = [i for i in range(len(stream)) if not marked[i]]
        sub = "".join(stream[i] for i in idx)
        keep = [False] * len(stream)
        sm = difflib.SequenceMatcher(None, sub, original, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            # a letter whose case differs between the copies ("Golf" / "golf") is still hers
            if tag == "equal" or (tag == "replace" and same_but_case(sub[i1:i2], original[j1:j2])):
                for i in range(i1, i2):
                    keep[idx[i]] = True
    # whitespace is never worth dropping on its own
    for i, ch in enumerate(stream):
        if ch.isspace():
            keep[i] = True
    return keep


ACRONYMS = {"UK", "US", "USA", "EU", "UAE", "GDP", "IELTS", "TV", "IT", "AI"}


def lower_caps(text):
    """The teacher's CAPS lowercased ("REACHING 16% IN 2010", "CANnot"), acronyms kept."""
    out, run = [], []
    for ch in text + "\0":
        if ch.isupper():
            run.append(ch)
            continue
        word = "".join(run)
        out.append(word.lower() if len(word) >= 2 and word not in ACRONYMS else word)
        run = []
        out.append(ch)
    return "".join(out)[:-1]


def brtext(el):  # get_text() with <br> as a newline
    return BeautifulSoup(re.sub(r"<br\s*/?>", "\n", str(el)), "html.parser").get_text()


def teacher_rewrites(stream, original, highlights):
    """Highlights in the TR/CC editor where the teacher typed over the student's words (in CAPS,
    e.g. "factors CAUSED BY EXPANDING PRODUCT THAT bringS about" for "factors bringing about").
    The TR/CC editor is read as the student's original, so there her words would be lost: for such a
    highlight, take her words from the corrected copy (stream). Returns the patched original and
    {highlight index: (her words, the teacher's version, lowercased)}."""
    spans, cursor = [], 0
    for el in highlights:  # each highlight's place in the original, in document order
        t = brtext(el)
        k = original.find(t, cursor) if t else -1
        spans.append((k, k + len(t)) if k >= 0 else None)
        if k >= 0:
            cursor = k + len(t)
    ops = [op for op in difflib.SequenceMatcher(None, stream, original, autojunk=False).get_opcodes() if op[0] != "equal"]
    owner = {}  # opcode -> highlight index
    for h, sp in enumerate(spans):
        if not sp:
            continue
        s, e = sp
        inside = [op for op in ops if (s <= op[3] and op[4] <= e) if op[3] < op[4]] + [op for op in ops if op[3] == op[4] and s <= op[3] <= e]
        typed = "".join(original[op[3]:op[4]] for op in inside)
        if inside and any(op[1] < op[2] for op in inside) and any(c.isupper() for c in typed) and not any(c.islower() for c in typed):
            for op in inside:
                owner[op] = h
    if not owner:
        return original, {}
    out, at = [], {}  # at: original position -> patched position, for the highlight edges
    for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, stream, original, autojunk=False).get_opcodes():
        base = sum(len(x) for x in out)
        for j in range(j1, j2 + 1):
            at.setdefault(j, base + (j - j1 if tag == "equal" or (tag, i1, i2, j1, j2) not in owner else (0 if j == j1 else i2 - i1)))
        out.append(stream[i1:i2] if (tag, i1, i2, j1, j2) in owner else original[j1:j2])
    patched = "".join(out)
    found = {}
    for h in set(owner.values()):
        s, e = spans[h]
        mine = patched[at[s]:at[e]]
        typed = set()
        for op, hh in owner.items():
            if hh == h:
                typed.update(range(op[3], op[4]))
        theirs = "".join(c.lower() if j in typed else c for j, c in enumerate(original[s:e], start=s))
        found[h] = (mine, theirs)
    return patched, found


LETTERS_AFTER = r"\s+((?:[^\W\d_]|['’-])+)"
LETTERS_BEFORE = r"((?:[^\W\d_]|['’-])+)\S*\s+"


def edit_distance(a, b):
    row = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        nxt = [i]
        for j in range(1, len(b) + 1):
            nxt.append(min(row[j] + 1, nxt[j - 1] + 1, row[j - 1] + (a[i - 1] != b[j - 1])))
        row = nxt
    return row[-1]


def merge_in_word(paragraphs, corrections, original):
    """Same as mergeInWord() in extension/lib/extract.js."""
    def shown(g):
        return g if isinstance(g, str) else corrections[g["c"]]["fix"] or corrections[g["c"]]["orig"]

    def joins(x, y):
        l, r = shown(x), shown(y)
        return bool(l) and bool(r) and (l[-1].isalpha() or l[-1] in "'’") and (r[0].isalpha() or r[0] in "'’")

    again = True
    while again:
        again = False
        for p in paragraphs:
            for s in p["sentences"]:
                segs = s["segs"]
                for i, g0 in enumerate(segs):
                    if isinstance(g0, str):
                        continue
                    a = b = i
                    left = right = ""
                    while a > 0 and joins(segs[a - 1], segs[a]):
                        g = segs[a - 1]
                        if isinstance(g, str) and re.search(r"\s", g):
                            left = re.search(r"\S+$", g).group(0)
                            break
                        a -= 1
                    while b < len(segs) - 1 and joins(segs[b], segs[b + 1]):
                        g = segs[b + 1]
                        if isinstance(g, str) and re.search(r"\s", g):
                            right = re.match(r"\S+", g).group(0)
                            break
                        b += 1
                    inner = segs[a:b + 1]
                    ids = [g["c"] for g in inner if not isinstance(g, str)]
                    if not left and not right and len(inner) == 1:  # a whole-word correction already
                        continue

                    def word(which):
                        return left + "".join(g if isinstance(g, str) else corrections[g["c"]][which] for g in inner) + right
                    orig = word("orig")
                    before = segs[a - 1][:len(segs[a - 1]) - len(left)] if a > 0 and isinstance(segs[a - 1], str) else ""
                    after = segs[b + 1][len(right):] if b < len(segs) - 1 and isinstance(segs[b + 1], str) else ""
                    # her word: after the same word in the original, the closest in spelling to what is left of it
                    pm, nm = re.search(r"(\S+)\s+$", before), re.match(r"\s+(\S+)", after)
                    prev, nxt = pm.group(1) if pm else None, nm.group(1) if nm else None
                    core = re.sub(r"^[\W\d_]+|[\W\d_]+$", "", orig)
                    if (prev or nxt) and core and not re.search(r"\s", orig):
                        pat = re.escape(prev) + LETTERS_AFTER if prev else LETTERS_BEFORE + re.escape(nxt)
                        best, dist = None, None
                        for m in re.finditer(pat, original):
                            d = edit_distance(m.group(1), core)
                            if dist is None or d < dist:
                                best, dist = m.group(1), d
                        if best is not None and dist <= max(2, len(core) // 3):
                            orig = orig.replace(core, best, 1)
                    cs = [corrections[x] for x in ids]
                    kind = next((c for c in cs if c["kind"] != "teacher"), cs[0])["kind"]
                    comment = "\n".join(dict.fromkeys(c["comment"] for c in cs if c["comment"]))
                    corrections[ids[0]] = {"orig": orig, "fix": word("fix"), "kind": kind, "comment": comment}
                    for x in ids[1:]:
                        del corrections[x]
                    out = segs[:a]
                    if a > 0 and left:
                        out[-1] = before
                    out.append({"c": ids[0]})
                    if b < len(segs) - 1:
                        out.append(after if right else segs[b + 1])
                    out += segs[b + 2:]
                    s["segs"] = [g for g in out if g != ""]
                    again = True
                    break
                if again:
                    break
            if again:
                break


def tidy_spaces(paragraphs, original):
    """Spaces left where the teacher's typing was taken out: one space, and none before a full stop or comma
    she didn't space herself."""
    for p in paragraphs:
        for s in p["sentences"]:
            out = []
            for g in s["segs"]:
                if isinstance(g, str) and out and isinstance(out[-1], str):
                    out[-1] += g
                else:
                    out.append(g)
            hers_spaced = lambda w, p_: not original or re.search(re.escape(w) + r" +" + re.escape(p_), original)
            def fix(g):
                g = re.sub(r"(?<=\S) {2,}(?=\S)", " ", g)
                return re.sub(r"([A-Za-z0-9']+) +([.,;:!?])", lambda m: m.group(0) if hers_spaced(m.group(1), m.group(2)) else m.group(1) + m.group(2), g)
            out = [fix(g) if isinstance(g, str) else g for g in out]
            # across a note's marker (what it was about is gone): no double space, no space before her full stop
            prev = None
            for i, g in enumerate(out):
                if not isinstance(g, str):
                    if "n" not in g:
                        prev = None
                    continue
                if prev is not None and out[prev][-1:] == " " and g[:1] == " ":
                    g = g.lstrip(" ")
                    m = re.match(r"[.,;:!?]", g)
                    w = re.search(r"([A-Za-z0-9']+) $", out[prev])
                    if m and w and not hers_spaced(w.group(1), m.group(0)):
                        out[prev] = out[prev].rstrip(" ")
                    out[i] = g
                prev = i
            s["segs"] = out


def main(src, dst, bai_goc_src=None):
    soup = BeautifulSoup(open(src, encoding="utf-8").read(), "html.parser")
    # her essay as she sent it ("Bài gốc"): what every quote of hers is checked against
    sent = bai_goc(BeautifulSoup(open(bai_goc_src, encoding="utf-8").read(), "html.parser")) if bai_goc_src else bai_goc(soup)
    blocks = soup.select("#lrgr #editorjs .ce-paragraph")  # the editor may split the essay into blocks
    # the student's original, with its line breaks (<br>) kept
    original = "\n".join(BeautifulSoup(re.sub(r"<br\s*/?>", "\n", str(b)), "html.parser").get_text()
                         for b in soup.select("#trcc .ce-paragraph")).replace("\xa0", " ")
    kind_of = lambda tok: next((k for k in tok.get("class", []) if k not in ("comment-inline", "focus")), "other")

    # 1. tokens: plain text, corrections, notes (paragraph breaks as None)
    items = []
    for pi, toks in enumerate(t for b in blocks for t in para_tokens(b)):
        if pi:
            items.append(None)
        for tok in toks:
            if isinstance(tok, str):
                items.append(("t", tok.replace("\xa0", " ")))
                continue
            sid = tok.get("id")
            box = soup.find(id=f"comment-{sid}") if sid else None
            # "((words)) => COMMENT": the brackets mark the words the comment is about
            bare = tok.get_text().strip()
            if bare in ("((", "))") and not comment_text(box):
                items.append(("o" if bare == "((" else "x", ""))
                continue
            # her words crossed out: the editor's <s>, or a span with its strikethrough class ("small /": the
            # teacher's " /" separator is not hers)
            s_el = tok.s or tok.select_one(".cdx-strikethrough")
            orig = re.sub(r"\s*/\s*$", "", s_el.get_text()) if s_el else ""
            fix = tok.mark.get_text() if tok.mark else ""
            struck = None if s_el is not None or tok.mark is not None else tok.find(
                lambda t: "line-through" in (t.get("style") or ""))
            if s_el is not None or tok.mark is not None:
                if orig or fix:  # a correction may have no comment box
                    items.append(("c", orig, fix, kind_of(tok), comment_text(box)))
            elif struck is not None and struck.get_text().strip():
                # crossed out by hand, then the teacher's version: a correction (her words may run on
                # past the crossed-out part; step 1d takes them from the original)
                theirs = lower_caps(re.sub(r"\s+", " ", "".join(t for t in tok.find_all(string=True) if struck not in t.parents)).strip())
                items.append(("c", struck.get_text().replace("\xa0", " "), theirs, kind_of(tok), comment_text(box), "grow"))
            elif tok.get_text().strip() and box is not None:
                items.append(("n", tok.get_text().replace("\xa0", " "), kind_of(tok), comment_text(box)))

    # 1b. paragraph breaks the corrected copy lost ("former.On the one hand"): take them from the original
    if not original and sent:
        original = sent                                  # no TR/CC copy (left empty): Bài gốc is the original
    if original:
        text_of = lambda it: "\n" if it is None else it[1]
        stream = "".join(text_of(it) for it in items)
        cuts = set()
        sm = difflib.SequenceMatcher(None, stream, original, autojunk=False)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            near = stream[max(0, i1 - 3):i2 + 3]  # a break right beside it is the same break, shifted
            if tag in ("insert", "replace") and "\n" in original[j1:j2] and "\n" not in near:
                cuts.add(i1)
        if cuts:
            out, pos = [], 0
            for it in items:
                text = text_of(it)
                inner = sorted(c - pos for c in cuts if pos < c < pos + len(text)) if it and it[0] == "t" else []
                if it and it[0] == "t" and pos in cuts and out and out[-1] is not None:
                    out.append(None)
                if inner:
                    prev = 0
                    for c in inner:
                        out += [("t", text[prev:c]), None]
                        prev = c
                    out.append(("t", text[prev:]))
                else:
                    out.append(it)
                pos += len(text)
            items = out

    # 1c. highlights where the teacher typed over her words in the TR/CC editor: her words win
    trcc_marks = soup.select("#trcc .comment-inline")
    if original:
        original, rewrites = teacher_rewrites("".join("\n" if it is None else it[1] for it in items), original, trcc_marks)
    else:
        rewrites = {}
    # from here on, her words are what she sent (Bài gốc) when the page has it: anything the teacher typed,
    # in either editor, is not hers
    if sent:
        original = sent

    # 1d. a hand-made correction whose new version swallowed some of her words ("accounting for 16%" ->
    #     "REACHING 16% IN 2010"): her words right after the crossed-out part belong to it
    grow = [k for k, it in enumerate(items) if it and it[0] == "c" and len(it) > 5]
    if grow and original:
        texts = ["\n" if it is None else it[1] for it in items]
        ends, pos = [], 0
        for t in texts:
            pos += len(t)
            ends.append(pos)
        ops = difflib.SequenceMatcher(None, "".join(texts), original, autojunk=False).get_opcodes()
        stream = "".join(texts)
        for k in grow:
            e = ends[k]
            # right after it, or after the space that follows it ("do| not| sell")
            gap = " " if e < len(stream) and stream[e] == " " else ""
            extra = next((original[j1:j2] for tag, i1, i2, j1, j2 in ops if tag == "insert" and i1 in (e, e + len(gap))), "")
            if extra.strip() and "\n" not in extra:
                lead = gap if not extra[:1].isspace() else ""
                items[k] = ("c", items[k][1] + lead + extra.rstrip(), *items[k][2:5])
    items = [it[:5] if it and it[0] == "c" else it for it in items]

    # 2. which characters of what the student wrote (plain text, <s>, note text) are really hers
    stream, owner = [], []
    for k, it in enumerate(items):
        text = "\n" if it is None else it[1] if it[0] in ("t", "c", "n") else ""
        stream.append(text)
        owner += [k] * len(text)
    keep = student_mask("".join(stream), original)
    split, flags_of = {}, {}
    pos = 0
    for k, text in enumerate(stream):
        flags = keep[pos:pos + len(text)]
        mine = "".join(ch for ch, ok in zip(text, flags) if ok)
        # the teacher's words, with their own spacing: drop the student's letters, keep the gaps
        added = " ".join("".join(ch if not ok or ch.isspace() else "\0" for ch, ok in zip(text, flags)).replace("\0", " \0 ").split()).replace("\0", "")
        added = re.sub(r"\s+", " ", added).strip()
        split[k] = (mine, added)
        flags_of[k] = flags
        pos += len(text)

    # 3. sentences
    corrections, notes, paragraphs = {}, [], []
    sentences, segs = [], []
    n = 0

    def close():
        while segs and isinstance(segs[0], str) and not segs[0].strip():
            segs.pop(0)
        if segs and isinstance(segs[0], str):
            segs[0] = segs[0].lstrip()
        if segs:
            sentences.append({"id": f"p{len(paragraphs)}s{len(sentences)}", "segs": list(segs)})
            segs.clear()

    def text_in(text):
        parts = split_sentences(text)
        for i, part in enumerate(parts):
            if i > 0:
                close()
            if part:
                segs.append(part if i == len(parts) - 1 else part + " ")

    after_stop = False  # the last highlight ended a sentence
    bracket, closed = None, None  # the student's words since "((", and the last closed "(( ))"

    def hers(t):
        nonlocal bracket
        if bracket is not None:
            bracket += t

    for k, it in enumerate(items):
        if it is None:
            close(); paragraphs.append({"sentences": sentences}); sentences = []
            after_stop = False
            continue
        if it[0] == "o":
            bracket = ""
            continue
        if it[0] == "x":
            if bracket is not None:
                closed = norm(bracket)
            bracket = None
            continue
        mine, added = split[k]
        if it[0] == "t":
            # the student's text, with anything the teacher typed into it (no highlight) as a correction
            runs = []
            for ch, ok in zip(it[1], flags_of[k]):
                if runs and runs[-1][1] == ok:
                    runs[-1][0] += ch
                else:
                    runs.append([ch, ok])
            for i in range(len(runs) - 2, 0, -1):  # "The high": teacher words split by a kept space
                if runs[i][1] and not runs[i][0].strip() and not runs[i - 1][1] and not runs[i + 1][1]:
                    runs[i - 1][0] += runs[i][0] + runs.pop(i + 1)[0]
                    runs.pop(i)
            for chunk, ok in runs:
                if not ok and chunk.strip() in ("((", "))"):  # the brackets typed without a highlight
                    if chunk.strip() == "((":
                        bracket = ""
                    else:
                        if bracket is not None:
                            closed = norm(bracket)
                        bracket = None
                    continue
                if not ok and re.fullmatch(r"\s*(?:\.{2,}|…)[\s.…]*", chunk):  # "=> COMMENT ...": the teacher's dots, not a fix
                    continue
                if not ok:
                    n += 1
                    corrections[f"c{n}"] = {"orig": "", "fix": chunk, "kind": "teacher", "comment": ""}
                    segs.append({"c": f"c{n}"})
                    after_stop = bool(re.search(r"[.?!]\s*$", chunk))
                    continue
                text = re.sub(r" {2,}", " ", chunk)
                if after_stop and text[:1].isspace():
                    close()
                    text = text.lstrip()
                hers(text)
                if text:
                    text_in(text)
                after_stop = bool(re.search(r"[.?!]\s*$", text))  # her full stop, then the teacher's typing
            continue
        if it[0] == "n":
            _, _, kind, comment = it
            quote = None
            if added.startswith("))") and bracket is not None:  # "((words)) => COMMENT"
                hers(mine)
                quote, bracket = norm(bracket), None
                added = re.sub(r"^\)\)\s*", "", added)
            elif added.startswith("=>") and closed:
                quote = closed
            closed = None
            m = SLASH_FIX.match(added)
            if m and mine.strip():  # "offspring // CHILDREN": a correction written in the essay
                n += 1
                corrections[f"c{n}"] = {"orig": mine.strip(), "fix": m.group(1).lower(), "kind": kind, "comment": comment}
                lead = mine[:len(mine) - len(mine.lstrip())]
                if lead:
                    segs.append(lead)
                segs.append({"c": f"c{n}"})
                hers(mine)
                after_stop = False
                continue
            has_text = any(isinstance(g, dict) and "c" in g or isinstance(g, str) and g.strip() for g in segs)
            # "=> COMMENT" points back at what was just written
            back = quote is None and added.startswith("=>") and not mine.strip() and not has_text
            notes.append({"comment": comment, "kind": kind, "quote": mine.strip() if quote is None else quote, "added": added, "back": back})
            segs.append({"n": len(notes) - 1})
            if quote is None:
                hers(mine)
            if mine:
                text_in(re.sub(r" {2,}", " ", mine))
            if mine.strip():  # a mark with none of her words ("=> COMMENT") doesn't end or open a sentence
                after_stop = bool(re.search(r"[.?!]\s*$", mine))
            continue
        _, orig, fix, kind, comment = it
        n += 1
        hers(orig)
        corrections[f"c{n}"] = {"orig": orig, "fix": fix, "kind": kind, "comment": comment}
        segs.append({"c": f"c{n}"})
        after_stop = bool(re.search(r"[.?!]\s*$", fix or orig))
    close()
    paragraphs.append({"sentences": sentences})
    tidy_spaces(paragraphs, original)

    # 4. link notes to their sentence; a note alone in its "sentence" (a marker after a full stop)
    #    belongs to the sentence before it
    prev_sid = None
    for p in paragraphs:
        kept = []
        for s in p["sentences"]:
            marks = [g["n"] for g in s["segs"] if isinstance(g, dict) and "n" in g]
            # where each mark sits in her sentence (a typed-in linker pops in there)
            at, upto = {}, ""
            for g in s["segs"]:
                if isinstance(g, dict) and "n" in g:
                    at[g["n"]] = len(upto.lstrip())
                else:
                    upto += g if isinstance(g, str) else corrections[g["c"]]["orig"]
            s["segs"] = [g for g in s["segs"] if not (isinstance(g, dict) and "n" in g)]
            while s["segs"] and isinstance(s["segs"][0], str) and not s["segs"][0].strip():
                s["segs"].pop(0)
            if s["segs"] and isinstance(s["segs"][0], str):
                s["segs"][0] = s["segs"][0].lstrip()
            merged = []
            for g in s["segs"]:
                if isinstance(g, str) and merged and isinstance(merged[-1], str):
                    merged[-1] += g
                else:
                    merged.append(g)
            s["segs"] = merged
            has_text = any(isinstance(g, dict) or g.strip() for g in s["segs"])
            for i in marks:
                here = has_text and not notes[i]["back"]
                notes[i]["sentence_ids"] = [s["id"] if here or prev_sid is None else prev_sid]
                notes[i]["at"] = at[i] if here else -1
            if has_text:
                kept.append(s)
                prev_sid = s["id"]
        p["sentences"] = kept
    paragraphs = [p for p in paragraphs if p["sentences"]]
    for pi, p in enumerate(paragraphs):  # renumber after dropping marker-only sentences
        for si, s in enumerate(p["sentences"]):
            old, s["id"] = s["id"], f"p{pi}s{si}"
            for note in notes:
                note["sentence_ids"] = [s["id"] if x == old else x for x in note.get("sentence_ids", [])]

    # 5. an edit inside one word ("heal|th|care", an added "l") is one correction of the whole word,
    #    her spelling taken from the original
    merge_in_word(paragraphs, corrections, original)

    def sentence_text(s):
        return "".join(x if isinstance(x, str) else corrections[x["c"]]["orig"] for x in s["segs"])

    key = lambda t: re.sub(r" ([.,;:!?])", r"\1", norm(t))  # for matching only: "16% ." is "16%."
    task_comments = []
    for h, sp in enumerate(trcc_marks):
        box = soup.find(id=f"comment-{sp.get('id')}")
        text = norm(rewrites[h][0]) if h in rewrites else norm(sp.get_text())
        # whole sentences inside the highlight, or the one sentence a partial highlight sits in
        ids = [s["id"] for p in paragraphs for s in p["sentences"]
               if key(sentence_text(s)) and (key(sentence_text(s)) in key(text) or key(text) in key(sentence_text(s)))]
        added = ""
        if h in rewrites:
            task_comments.append({"sentence_ids": ids, "comment": comment_text(box), "kind": "trcc", "quote": text, "added": "", "fix": norm(rewrites[h][1])})
            continue
        if not ids:
            # text the teacher typed into the essay (a sentence the student should add): hang it on the
            # sentence it follows in the TR/CC editor
            block = sp.find_parent(class_="ce-paragraph")
            before = norm("".join(t for t in block.find_all(string=True) if t.find_parent() is not None and sp not in t.parents
                                  and (t.find_previous(lambda x: x is sp) is None))) if block else ""
            for p_ in paragraphs:
                for s_ in p_["sentences"]:
                    st = norm(sentence_text(s_))
                    if st and st[:40] in before:
                        ids = [s_["id"]]
            added, text = text, ""
        task_comments.append({"sentence_ids": ids[-1:] if added else ids, "comment": comment_text(box), "kind": "trcc", "quote": text, "added": added})
    task_comments += [{"sentence_ids": x.get("sentence_ids", []), **{k: x[k] for k in ("comment", "kind", "quote", "added")}, "at": x.get("at", -1)} for x in notes]

    scores = [i.get("value") for i in soup.select("#right-partial input.input-otp")][:4]
    essay_text = " ".join(sentence_text(s) for p in paragraphs for s in p["sentences"])
    json.dump({
        **page_info(soup),
        "scores": dict(zip(["TR", "CC", "LR", "GR"], scores)),
        "word_count": page_word_count(soup) or len(essay_text.split()),
        "essay": {"paragraphs": paragraphs},
        "corrections": corrections,
        "task_comments": task_comments,
    }, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:4])
