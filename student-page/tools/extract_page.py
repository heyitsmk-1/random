"""Extract essay, corrections and comments from a saved admin.ielts1984.vn writing page.

Usage: python3 extract_page.py saved_page.html out.json

Output shape (consumed by the lesson author, and later by the extension):
  essay.paragraphs[].sentences[] = {id, segs: [str | {c: correction_id}]}
  corrections[id] = {orig, fix, kind, comment}
  task_comments[] = {sentence_ids, comment}
"""
import json
import re
import sys

from bs4 import BeautifulSoup, NavigableString, Tag

SENT_END = re.compile(r"(?<=[.?!])\s+")
ABBREV = re.compile(r"(?:\b(?:e\.g|i\.e|etc|vs|Mr|Mrs|Ms|Dr|St|approx)\.)$", re.I)


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
    return body.get_text().strip() if body else ""


def page_word_count(soup):
    """The word count the admin page shows next to the essay ("274 từ"), if present."""
    m = re.search(r"(\d+)\s*\n\s*từ\b", soup.get_text("\n"))
    return int(m.group(1)) if m else None


def para_tokens(p):
    """Split the editor paragraph on <br> into paragraphs of text/correction tokens."""
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


def main(src, dst):
    soup = BeautifulSoup(open(src, encoding="utf-8").read(), "html.parser")
    editor = soup.select_one("#lrgr #editorjs .ce-paragraph")
    corrections, paragraphs = {}, []
    n = 0
    for pi, toks in enumerate(para_tokens(editor)):
        sentences, segs = [], []

        def close():
            if segs:
                sentences.append({"id": f"p{pi}s{len(sentences)}", "segs": list(segs)})
                segs.clear()

        after_stop = False  # the last correction ended a sentence
        for tok in toks:
            if isinstance(tok, Tag):
                sid = tok.get("id")
                orig = tok.s.get_text() if tok.s else ""
                fix = tok.mark.get_text() if tok.mark else ""
                box = soup.find(id=f"comment-{sid}") if sid else None
                if not (orig or fix) or box is None:
                    continue  # empty highlight left behind in the editor
                n += 1
                cid = f"c{n}"
                kinds = [k for k in tok.get("class", []) if k != "comment-inline"]
                corrections[cid] = {"orig": orig, "fix": fix, "kind": kinds[0] if kinds else "other", "comment": comment_text(box)}
                segs.append({"c": cid})
                after_stop = bool(re.search(r"[.?!]\s*$", fix or orig))
                continue
            if after_stop and tok[:1].isspace():
                close()
                tok = tok.lstrip()
            after_stop = False
            parts = split_sentences(tok)
            for i, part in enumerate(parts):
                if i > 0:
                    close()
                if part:
                    segs.append(part if i == len(parts) - 1 else part + " ")
        close()
        paragraphs.append({"sentences": sentences})

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
        task_comments.append({"sentence_ids": ids, "comment": comment_text(box)})

    scores = [i.get("value") for i in soup.select("#right-partial input.input-otp")][:4]
    original = " ".join(sentence_text(s) for p in paragraphs for s in p["sentences"])
    json.dump({
        "scores": dict(zip(["TR", "CC", "LR", "GR"], scores)),
        "word_count": page_word_count(soup) or len(original.split()),
        "essay": {"paragraphs": paragraphs},
        "corrections": corrections,
        "task_comments": task_comments,
    }, open(dst, "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main(*sys.argv[1:3])
