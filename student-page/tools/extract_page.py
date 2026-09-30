"""Extract essay, corrections and comments from a saved admin.ielts1984.vn writing page.

Usage: python3 extract_page.py saved_page.html out.json

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
"""
import difflib
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString, Tag

SENT_END = re.compile(r"(?<=[.?!])\s+")
ABBREV = re.compile(r"(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|approx)\.)$", re.I)
SLASH_FIX = re.compile(r"^\s*//\s*(.+?)\s*$")


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
    return info


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


def student_mask(stream, original):
    """For each character of `stream`, whether it is in the student's original essay."""
    if not original:
        return [True] * len(stream)
    keep = [False] * len(stream)
    sm = difflib.SequenceMatcher(None, stream, original, autojunk=False)
    for a, _, n in sm.get_matching_blocks():
        for i in range(a, a + n):
            keep[i] = True
    # whitespace is never worth dropping on its own
    for i, ch in enumerate(stream):
        if ch.isspace():
            keep[i] = True
    return keep


def main(src, dst):
    soup = BeautifulSoup(open(src, encoding="utf-8").read(), "html.parser")
    blocks = soup.select("#lrgr #editorjs .ce-paragraph")  # the editor may split the essay into blocks
    # the student's original, with its line breaks (<br>) kept
    original = "\n".join(BeautifulSoup(re.sub(r"<br\s*/?>", "\n", str(b)), "html.parser").get_text()
                         for b in soup.select("#trcc .ce-paragraph"))
    kind_of = lambda tok: next((k for k in tok.get("class", []) if k not in ("comment-inline", "focus")), "other")

    # 1. tokens: plain text, corrections, notes (paragraph breaks as None)
    items = []
    for pi, toks in enumerate(t for b in blocks for t in para_tokens(b)):
        if pi:
            items.append(None)
        for tok in toks:
            if isinstance(tok, str):
                items.append(("t", tok))
                continue
            sid = tok.get("id")
            box = soup.find(id=f"comment-{sid}") if sid else None
            orig = tok.s.get_text() if tok.s else ""
            fix = tok.mark.get_text() if tok.mark else ""
            if tok.s is not None or tok.mark is not None:
                if orig or fix:  # a correction may have no comment box
                    items.append(("c", orig, fix, kind_of(tok), comment_text(box)))
            elif tok.get_text().strip() and box is not None:
                items.append(("n", tok.get_text(), kind_of(tok), comment_text(box)))

    # 1b. paragraph breaks the corrected copy lost ("former.On the one hand"): take them from the original
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
    for k, it in enumerate(items):
        if it is None:
            close(); paragraphs.append({"sentences": sentences}); sentences = []
            after_stop = False
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
                after_stop = False
                if text:
                    text_in(text)
            continue
        if it[0] == "n":
            _, _, kind, comment = it
            m = SLASH_FIX.match(added)
            if m and mine.strip():  # "offspring // CHILDREN": a correction written in the essay
                n += 1
                corrections[f"c{n}"] = {"orig": mine.strip(), "fix": m.group(1).lower(), "kind": kind, "comment": comment}
                lead = mine[:len(mine) - len(mine.lstrip())]
                if lead:
                    segs.append(lead)
                segs.append({"c": f"c{n}"})
                after_stop = False
                continue
            has_text = any(isinstance(g, dict) and "c" in g or isinstance(g, str) and g.strip() for g in segs)
            # "=> COMMENT" points back at what was just written
            back = added.startswith("=>") and not mine.strip() and not has_text
            notes.append({"comment": comment, "kind": kind, "quote": mine.strip(), "added": added, "back": back})
            segs.append({"n": len(notes) - 1})
            if mine:
                text_in(re.sub(r" {2,}", " ", mine))
            after_stop = bool(re.search(r"[.?!]\s*$", mine))
            continue
        _, orig, fix, kind, comment = it
        n += 1
        corrections[f"c{n}"] = {"orig": orig, "fix": fix, "kind": kind, "comment": comment}
        segs.append({"c": f"c{n}"})
        after_stop = bool(re.search(r"[.?!]\s*$", fix or orig))
    close()
    paragraphs.append({"sentences": sentences})

    # 4. link notes to their sentence; a note alone in its "sentence" (a marker after a full stop)
    #    belongs to the sentence before it
    prev_sid = None
    for p in paragraphs:
        kept = []
        for s in p["sentences"]:
            marks = [g["n"] for g in s["segs"] if isinstance(g, dict) and "n" in g]
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

    def sentence_text(s):
        return "".join(x if isinstance(x, str) else corrections[x["c"]]["orig"] for x in s["segs"])

    norm = lambda t: re.sub(r"\s+", " ", t).strip()
    task_comments = []
    for sp in soup.select("#trcc span.comment-inline"):
        box = soup.find(id=f"comment-{sp.get('id')}")
        text = norm(sp.get_text())
        # whole sentences inside the highlight, or the one sentence a partial highlight sits in
        ids = [s["id"] for p in paragraphs for s in p["sentences"]
               if norm(sentence_text(s)) and (norm(sentence_text(s)) in text or text in norm(sentence_text(s)))]
        added = ""
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
    task_comments += [{"sentence_ids": x.get("sentence_ids", []), **{k: x[k] for k in ("comment", "kind", "quote", "added")}} for x in notes]

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
    main(*sys.argv[1:3])
