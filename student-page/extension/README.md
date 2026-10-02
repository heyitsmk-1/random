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
2. **Bài**: week and prompt, detected from the homework title; the teacher confirms.

New lessons (**flow 2**: the teacher decides, Claude writes little):

3. **Logic** (TR/TA · CC): the week's framework checklist from `course.json`, blank: ✓ / ✗ and a note for
   each point (data mistakes go in the note: "56% là năm 2010 không phải 2000"). Essays: the idea sentences
   are guessed (Ý 1–4: "The first…", the sentence after the topic sentence, "Moreover / On top of that / In
   terms of / Regarding…"); the teacher fixes the tags (sentences tagged with the same Ý are one idea) and
   marks each idea ✓ / ~ / ✗. The teacher's CRM comments on an idea's sentences (TR/CC comments and plain
   "=> COMMENT" notes) are filled in under it, each with a tick to leave it out, plus a note box. A ✗ idea
   needs its fix type: **Đổi hướng** (a new direction), **Sửa mắt xích** (a wrong link) or **Thiếu bước**.
   Week 1: each paraphrase topic ✓ / ✗.
4. **Language** (LR · GRA): per tab, the systematic mistake (a name, then tick the corrections that belong to
   it) or "Không có lỗi hệ thống". Every correction and note from the grammar/vocab editor, in essay order:
   **Dạy** (shown as the teacher wrote it) / **Socratic** (asked first) / **Khen** / **Bỏ qua**, and its part
   (Từ vựng / Ngữ pháp / **Logic**: plain "=> COMMENT" notes start in Logic). **Gộp với…** puts corrections
   that are the same point on one screen, with an optional group note; **Chuyển nhận xét sang…** moves a
   comment to the correction it belongs to (only in the lesson: the CRM is never touched). A note already
   used in a ✗ / ~ idea starts as Bỏ qua.
5. **Viết lại**: the exact sentences to rewrite.
6. **Soạn**: one Claude pass in small parts (`lib/draft2.js`), only Đậu's words around those decisions: the
   Logic summary and one screen per problem, the chains of ✗ ideas, "Cụm em đã dùng tốt", the Socratic
   questions, the systematic mistake's mini-lesson and exercises (only when one is named), the rewrite,
   hello and goodbye. Nothing is asked for what the teacher already decided.
7. **Xem lại**: Claude's lines by screen with the phone preview, and the automatic checks (`checks2` in
   `lib/review.js`: quotes verbatim, figures on the chart, Socratic answers, Đậu's voice).
8. **Xuất**: the `.html` (built exactly like `build.py`), the `.json`, or a Netlify link (`lib/netlify.js`: every
   publish is a new unguessable `/r/<random>/` address; old pages are never removed).

The student page of a flow-2 lesson (`"flow": 2`) has two parts, **Logic** and **Language**. The tabs show
"TR · CC" until the results screen has counted the scores up, then "TR 7 · CC 6". Results → Logic (the
checklist on one screen, then in essay order: each problem, the comments moved to Logic, and the ideas, whose
✗ ones open their chain; when the teacher rewrote a sentence, Đậu goes through each change while it lights up
in both cards) → Language ("Cụm em đã dùng tốt", the systematic mistake if any, then the corrections:
vocabulary first, then grammar, each in essay order) → practice (only with a systematic mistake) → Viết lại
(it opens on the idea's chain from Logic) → end.

- An idea's chain is drawn unmarked while the student answers; then the wrong link turns red and the fix is
  drawn by its type: a new direction under her struck-through chain, the new links after the last good one,
  or the missing steps.
- Corrections draw in: the line strikes through, the fix pops in, then the teacher's comment. Socratic asks
  first, with the words it is about underlined. Words the teacher typed into the essay (a linker) pop in
  where she typed them, with the sentence before shown faded. A group is one screen.
- The lines between parts ("Giờ mình xem 4 chỗ từ vựng anh Khoa sửa cho em nha") come from the page, so they
  always match what comes next; Claude only names a focus when the teacher named a systematic mistake.

Drafts started before flow 2 (and `editor.html?flow=1`) keep the old steps: Framework tagging → a 6-part
draft (`lib/draft.js`) → "Cần duyệt" review → export. Old lessons still build and play as before.

Drafts autosave in `chrome.storage.local`, keyed by the CRM writing id.

**Phone preview:** the student page runs its own inline script, which Chrome never allows on an extension
page. So the preview frame loads `preview.html`, a sandboxed page (`"sandbox"` in the manifest: no extension
APIs, no storage), and the editor posts the built page to it (`lib/preview.js`).

**Reading the grading page** (`lib/extract.js`, same as `tools/extract_page.py`): a letter that only changed
case between the two copies stays the student's ("Golf"); words crossed out with the line-through style
(not the editor's strikethrough) and the teacher's version after them read as one correction, with her words
the new version swallowed taken from the original and the teacher's CAPS lowercased ("~~accounting for 16%~~
→ reaching 16% in 2010"). An edit inside one word is one correction of the whole word, her spelling taken
from the original ("heal|~~th~~ TH|care" → helathcare → healthcare). `((words)) => COMMENT`: the words
between the brackets are what the comment is about. A note remembers where it sits in its sentence (`at`),
so a typed-in linker pops in at the right place.

**Nhật ký (editing log, `lib/telemetry.js`):** when a Claude-drafted lesson is exported or published,
the editor records what the teacher kept, edited, deleted or added versus Claude's draft, the mistake
groups before/after, picks, and actions (drags, roles, ✓/~/✗, approvals, undo, optional reason chips).
Student names are replaced by codes (HV1, HV2…). It stays in Chrome; Cài đặt → **Tải nhật ký** downloads
it as one JSON file.

## Tests
All run in headless Chromium with the network faked (no Claude or Netlify calls).
```
node extension/tests/extract.test.mjs <saved CRM pages...>     # JS extractor == tools/extract_page.py
node extension/tests/build.test.mjs                             # lib/build.js == build.py, byte for byte
CRM=<page.html> LESSON=data/lesson-x.json node extension/tests/editor.test.mjs   # the old editor flow (?flow=1)
CRM=<page.html> node extension/tests/extension.test.mjs         # the unpacked extension on a faked CRM address
CRM=<page.html> node extension/tests/flow2.test.mjs             # flow 2 end to end, any homework type (fake reply built from the decisions)
CRM=<page.html> node extension/tests/kinds.test.mjs             # old flow: Week 1 and Task 1 through the editor (fake reply built in)
python3 extension/tests/task1_page.py <page.html> <7-10> <out.html>   # a fake Task 1 page (made-up essay and student)
```
