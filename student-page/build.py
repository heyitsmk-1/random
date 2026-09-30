"""Bundle a lesson into one self-contained student page.

Usage: python3 build.py data/lesson-thu-week2.json
Writes dist/<lesson>.html (standalone) and dist/<lesson>.fragment.html (for the Artifact publisher,
which supplies its own <html>/<head>/<body> skeleton).
"""
import base64
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent


def main(lesson_path):
    lesson_path = pathlib.Path(lesson_path)
    lesson = json.loads(lesson_path.read_text(encoding="utf-8"))
    page = json.loads((lesson_path.parent / lesson.pop("page")).read_text(encoding="utf-8"))
    lesson.update({k: page[k] for k in ("scores", "essay", "corrections", "task_comments")})

    assets = {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
              for p in sorted((ROOT / "assets").glob("*.webp"))}

    def js(obj):  # safe inside <script type="application/json">
        return json.dumps(obj, ensure_ascii=False).replace("</", "<\\/")

    fragment = (ROOT / "src" / "template.html").read_text(encoding="utf-8")
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


if __name__ == "__main__":
    main(sys.argv[1])
