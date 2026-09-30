// Checks extension/lib/extract.js against tools/extract_page.py on saved CRM pages.
// Usage: node extension/tests/extract.test.mjs page1.html [page2.html ...]
// (runs the JS extractor inside Chromium, the Python one with python3, and compares)
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const pages = process.argv.slice(2);
const tmp = mkdtempSync(path.join(tmpdir(), "extract-"));
const extractSrc = readFileSync(path.join(root, "extension/lib/extract.js"), "utf8");

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent("<!doctype html><html><body></body></html>");
await page.addScriptTag({ type: "module", content: extractSrc.replace(/^export /gm, "") + "\nwindow.extractPage = extractPage;" });
await page.waitForFunction(() => typeof window.extractPage === "function");

let failed = 0;
for (const file of pages) {
  const out = path.join(tmp, path.basename(file) + ".json");
  execFileSync("python3", [path.join(root, "tools/extract_page.py"), file, out]);
  const py = JSON.parse(readFileSync(out, "utf8"));
  const js = await page.evaluate(html => window.extractPage(html), readFileSync(file, "utf8"));
  const diffs = [];
  (function cmp(a, b, where) {
    if (typeof a !== typeof b || Array.isArray(a) !== Array.isArray(b) || (a === null) !== (b === null)) return diffs.push(`${where}: ${JSON.stringify(a)?.slice(0, 80)} vs ${JSON.stringify(b)?.slice(0, 80)}`);
    if (a && typeof a === "object") {
      const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
      for (const k of keys) cmp(a[k], b[k], `${where}.${k}`);
    } else if (a !== b) diffs.push(`${where}: ${JSON.stringify(a).slice(0, 80)} vs ${JSON.stringify(b).slice(0, 80)}`);
  })(py, js, "$");
  console.log(`${diffs.length ? "FAIL" : "ok  "} ${path.basename(file)}${diffs.length ? "\n  " + diffs.slice(0, 8).join("\n  ") : ""}`);
  if (diffs.length) failed++;
}
await browser.close();
process.exit(failed ? 1 : 0);
