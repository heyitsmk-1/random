"""Build the student prototype page.

Usage: python3 build.py <dau-assets.json> <out.html>

The anh Đậu mascot images are not kept in this repo (same rule as student-page/).
dau-assets.json maps names like "rig_body" to data: URIs; it is made from a published
anh Đậu recap page. Without it the page still works and shows a plain "Đ" avatar.
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).parent
src = (ROOT / "index.src.html").read_text(encoding="utf-8")
assets = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8")) if len(sys.argv) > 2 else None
out = pathlib.Path(sys.argv[-1])
html = src.replace("/*__DAU_ASSETS__*/null", json.dumps(assets) if assets else "null")
out.write_text(html, encoding="utf-8")
print(f"wrote {out} ({len(html) // 1024} KB)")
