"""Build the Chrome extension: fill extension/bundle/ and extension/vendor/, then zip it.

    python3 tools/build_extension.py

extension/ can then be loaded unpacked in Chrome (chrome://extensions, Developer mode,
"Load unpacked"), or install dist/dau-extension-<version>.zip. The bundle holds the course
file and the mascot art, so it is gitignored like data/ and assets/.
"""
import base64
import io
import json
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXT = ROOT / "extension"
BUNDLE = EXT / "bundle"
VENDOR = EXT / "vendor"
SKIP = {"tests", "node_modules", "package.json", "package-lock.json"}


def vendor_sdk():
    if not (EXT / "node_modules" / "@anthropic-ai" / "sdk").exists():
        subprocess.run(["npm", "install", "--no-audit", "--no-fund"], cwd=EXT, check=True)
    VENDOR.mkdir(exist_ok=True)
    entry = VENDOR / "_entry.mjs"
    entry.write_text('export { default } from "@anthropic-ai/sdk";\n', encoding="utf-8")
    try:
        subprocess.run([str(EXT / "node_modules" / ".bin" / "esbuild"), str(entry), "--bundle", "--format=esm",
                        "--platform=browser", "--target=chrome114", "--minify", "--legal-comments=eof",
                        "--outfile=" + str(VENDOR / "anthropic.mjs")], cwd=EXT, check=True)
    finally:
        entry.unlink()


def icon():
    from PIL import Image
    im = Image.open(ROOT / "assets" / "icon_dau.webp").convert("RGBA")
    im.thumbnail((128, 128), Image.LANCZOS)
    out = Image.new("RGBA", (128, 128))
    out.paste(im, ((128 - im.width) // 2, (128 - im.height) // 2))
    buf = io.BytesIO()
    out.save(buf, "PNG")
    return buf.getvalue()


def main():
    BUNDLE.mkdir(exist_ok=True)
    shutil.copy(ROOT / "src" / "template.html", BUNDLE / "template.html")
    assets = {p.stem: "data:image/webp;base64," + base64.b64encode(p.read_bytes()).decode()
              for p in sorted((ROOT / "assets").glob("*.webp"))}
    (BUNDLE / "assets.json").write_text(json.dumps(assets), encoding="utf-8")
    shutil.copy(ROOT / "content" / "quotes.json", BUNDLE / "quotes.json")
    course = json.loads((ROOT / "data" / "course.json").read_text(encoding="utf-8"))
    (BUNDLE / "course.json").write_text(json.dumps(course, ensure_ascii=False), encoding="utf-8")
    (BUNDLE / "icon128.png").write_bytes(icon())
    vendor_sdk()

    version = json.loads((EXT / "manifest.json").read_text(encoding="utf-8"))["version"]
    dist = ROOT / "dist"
    dist.mkdir(exist_ok=True)
    zpath = dist / f"dau-extension-{version}.zip"
    with zipfile.ZipFile(zpath, "w", zipfile.ZIP_DEFLATED) as z:
        for p in sorted(EXT.rglob("*")):
            rel = p.relative_to(EXT)
            if p.is_file() and rel.parts[0] not in SKIP:
                z.write(p, str(rel))
    size = zpath.stat().st_size
    print(f"extension/ ready to load unpacked; {zpath.relative_to(ROOT)} ({size // 1024} KB)")


if __name__ == "__main__":
    sys.exit(main())
