# Đậu: tạo bài ôn (Chrome extension)

Turns a marked writing homework on `admin.ielts1984.vn/writing/*` into anh Đậu's review page.
It only reads the grading page; it never edits the CRM.

## Build and install
```
python3 tools/build_extension.py        # from student-page/
```
This fills `extension/bundle/` (template, mascot art, quotes, course file, icon) and
`extension/vendor/anthropic.mjs` (the Anthropic SDK bundled with esbuild), then writes
`dist/dau-extension-<version>.zip`. Both folders are gitignored: they hold the course file and
the mascot art.

In Chrome: `chrome://extensions` → Developer mode → **Load unpacked** → pick `extension/`
(or unzip the zip somewhere and pick that folder). Then open **Cài đặt** (the extension's
options) and add the Claude API key; the Netlify token is optional.

## How it works
1. **Tạo bài ôn Đậu** (orange button on a grading page) copies the page and opens the editor.
2. **Bài**: week, track and prompt, detected from the homework title; the teacher confirms.
3. **Framework**: tag the idea sentences, pick the rewrite target, tick the week's checklist.
4. **Nháp**: Claude drafts the lesson in 6 small parts (`lib/draft.js`, structured JSON output; bigger schemas were refused by the API as "too large"). One part goes first so the essay is cached for the rest; exercises wait for the mistake groups. If the API still refuses a schema, that part is asked without it and checked in the editor. A part that fails can be retried on its own.
5. **Chỉnh sửa**: every line is editable, with a live phone preview. AI lines stay purple until
   the teacher approves or edits them. Mistake groups: rename, re-tag, drag corrections between groups.
6. **Xuất**: download the `.html` (built exactly like `build.py`), save the lesson `.json`,
   or publish a Netlify link (`lib/netlify.js`: every publish is a new unguessable
   `/r/<random>/` address; old pages are never removed).

Drafts autosave in `chrome.storage.local`, keyed by the CRM writing id.

## Tests
All run in headless Chromium with the network faked (no Claude or Netlify calls).
```
node extension/tests/extract.test.mjs <saved CRM pages...>     # JS extractor == tools/extract_page.py
node extension/tests/build.test.mjs                             # lib/build.js == build.py, byte for byte
CRM=<page.html> LESSON=data/lesson-x.json node extension/tests/editor.test.mjs   # the whole editor flow
CRM=<page.html> node extension/tests/extension.test.mjs         # the unpacked extension on a faked CRM address
```
