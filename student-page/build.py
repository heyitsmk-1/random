"""Bundle a lesson into one self-contained student page.

Usage: python3 build.py data/lesson-thu-week2.json
Writes dist/<lesson>.html (standalone) and dist/<lesson>.fragment.html (for the Artifact publisher,
which supplies its own <html>/<head>/<body> skeleton).
"""
import base64
import hashlib
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent


def main(lesson_path):
    lesson_path = pathlib.Path(lesson_path)
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    page = json.loads((lesson_path.parent / lesson.pop("page")).read_text(encoding="utf-8"))
    lesson.update({k: page[k] for k in ("scores", "essay", "corrections", "task_comments")})
    lesson.setdefault("word_count", page["word_count"])  # the page's own count unless the lesson overrides it
    check(lesson)
    if lesson.get("praise_status") == "draft":
        print("note: the compliments in this lesson are drafts, waiting for the teacher's OK")

    finish = lesson.setdefault("finish", {})
    if not finish.get("quote"):
        quotes = json.loads((ROOT / "content" / "quotes.json").read_text(encoding="utf-8"))["quotes"]
        key = sum(map(ord, lesson["student"] + lesson["homework"]))  # stable per student and homework
        finish["quote"] = quotes[key % len(quotes)]

    # saved progress in the browser is only reused for this exact lesson build
    lesson["version"] = hashlib.sha1(json.dumps(lesson, sort_keys=True).encode()).hexdigest()[:10]

    template = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
    # only embed images the template actually names
    assets = {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
              for p in sorted((ROOT / "assets").glob("*.webp")) if p.stem in template}

    def js(obj):  # safe inside <script type="application/json">
        return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")

    fragment = template
    fragment = (fragment.replace("__TITLE__", lesson["student"])
                        .replace("__LESSON_JSON__", js(lesson))
                        .replace("__ASSETS_JSON__", js(assets)))

    out = ROOT / "dist"
    out.mkdir(exist_ok=True)
    name = lesson_path.stem.removeprefix("lesson-")
    (out / f"{name}.fragment.html").write_text(fragment, encoding="utf-8")
    (out / f"{name}.html").write_text(
        '<!doctype html>\n<html lang="vi"><head><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">'
        "</head><body>\n" + fragment + "\n</body></html>\n", encoding="utf-8")
    print(f"dist/{name}.html  {len(fragment) // 1024} KB")


def check(lesson):
    """Fail the build on lesson data the page cannot render."""
    sids = {s["id"] for p in lesson["essay"]["paragraphs"] for s in p["sentences"]}
    problems = []
    practice = lesson.get("practice") or {"items": []}  # flow 2: only with a systematic mistake
    for item in practice["items"]:
        if item["type"] == "tap":
            bare = lambda w: re.sub(r"[^\w'-]", "", w).lower()
            if bare(item["wrong"]) not in [bare(w) for w in item["sentence"].split()]:
                problems.append(f"tap item {item.get('id')}: '{item['wrong']}' is not a single word of its sentence")
    for m in (lesson.get("mistakes") or {"main": []})["main"]:
        problems += [f"mistake {m['id']}: unknown correction {c}" for c in m["cids"] if c not in lesson["corrections"]]
    for t in lesson["task_comments"]:
        if not t["sentence_ids"]:
            problems.append("a task comment is not linked to any sentence: " + t["comment"][:60])
    praise = lesson.get("praise", [])
    if len(praise) > 3:
        problems.append(f"{len(praise)} compliments: keep it to 2-3 per essay")
    ideas = lesson.get("ideas") or {"overview": []}
    places = {"results", "framework", "linking", "lr", "gra", "overview", "data", "paraphrase"} | {"idea:" + o["tag"] for o in ideas["overview"]}
    problems += [f"compliment at unknown place '{x['at']}'" for x in praise if x["at"] not in places]
    rw = lesson.get("rewrite")
    if rw:
        problems += [f"rewrite: unknown sentence id {sid}" for sid in rw["sids"] if sid not in sids]
        if rw.get("target") not in ("idea", "paragraph", "skeleton", "overview", "paraphrase"):
            problems.append("rewrite target must be idea, paragraph, skeleton, overview or paraphrase")
    elif not practice.get("challenge"):
        problems.append("no rewrite section (lesson.rewrite)")
    for it in (lesson.get("language") or {"items": []})["items"]:  # flow 2: the corrections shown one by one
        ref = it["ref"]
        if not (ref in lesson["corrections"] or (ref[:1] == "n" and ref[1:].isdigit() and 0 < int(ref[1:]) <= len(lesson["task_comments"]))):
            problems.append(f"language item {ref}: not on the page")
    used = json.dumps(lesson)
    problems += [f"unknown sentence id {sid}" for sid in set(re.findall(r'"(?:sid|sids)": \[?"(p\d+s\d+)"', used)) if sid not in sids]
    if problems:
        sys.exit("Lesson problems:\n  " + "\n  ".join(problems))


if __name__ == "__main__":
    main(sys.argv[1])
