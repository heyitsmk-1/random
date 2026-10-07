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

3. **Logic** (TR/TA · CC): the week's framework checklist from `course.json`, blank: ✓ (met) / ~ (a small
   correction) / ✗ (not met) and a note for each point, required for ~ and ✗ (data mistakes go in the note:
   "56% là năm 2010 không phải 2000"). Points can be reworded, removed (×) or added (+ Thêm điểm), and
   **Lưu làm mặc định cho Week N** keeps that list for the week's next essays (in Chrome). Essays: the idea sentences
   are guessed (Ý 1–4: "The first…", the sentence after the topic sentence, "Moreover / On top of that / In
   terms of / Regarding…"); the teacher fixes the tags (sentences tagged with the same Ý are one idea) and
   marks each idea ✓ / ~ / ✗. The teacher's CRM comments on an idea's sentences (TR/CC comments and plain
   "=> COMMENT" notes) are filled in under it, each with a tick to leave it out, plus a note box. A ✗ idea
   needs its fix type: **Đổi hướng** (a new direction), **Sửa mắt xích** (a wrong link) or **Thiếu bước**.
   Week 1: each paraphrase topic ✓ / ✗.
4. **Language** (LR · GRA): per tab, up to 3 **systematic mistakes** (numbered names; "+ Thêm lỗi hệ thống")
   or "Không có lỗi hệ thống". Every correction and note from the grammar/vocab editor, in essay order, with
   chips **1 · 2 · 3** (which systematic mistake it belongs to) and where else it goes: **Danh sách** (default:
   the optional "Xem N lỗi khác" list, with the teacher's own comment) / **Khen** (shown with "Cụm em dùng
   tốt", with the comment) / **Ẩn** (not shown anywhere), plus its part (Từ vựng / Ngữ pháp / **Logic**: plain
   "=> COMMENT" notes start in Logic, as **Hiện ở Logic** / **Ẩn**). **⬆ Nâng cấp** marks a fix that isn't a
   mistake, only a better way to say it (guessed from the comment: "nâng cấp", "hay hơn"…): her words aren't
   struck through. Drag a comment onto another correction to move it there (only in the lesson: the CRM is
   never touched; each CRM comment moves on its own, so dragging one back never takes another with it;
   "Trả nhận xét như CRM" undoes it). A note already used in a ✗ / ~ idea starts as Ẩn.
   **Claude gợi ý**: when the Logic step opens, a small Sonnet call (a few cents) groups the vocabulary and
   grammar fixes into recurring mistakes; each tab shows them as a suggestion (names + which fixes).
   **Dùng gợi ý** fills in the names and the 1 · 2 · 3 chips, which the teacher then changes freely; **Bỏ
   qua** hides it. Nothing is used unless the teacher clicks.
5. **Viết lại**: the exact sentences to rewrite, or **Không giao viết lại** (no rewrite this time: Claude
   isn't asked for one, and the student page goes from practice straight to the end).
6. **Soạn**: one Claude pass in small parts (`lib/draft2.js`), only Đậu's words around those decisions: the
   Logic summary and each problem's walk-through, the map of the essay and the chains of ✗ ideas, "Cụm em
   đã dùng tốt", each systematic mistake's mini-lesson (split into 1-4 patterns: one board formula each,
   with the corrections that follow it) and the exercises (only when one is named), the rewrite, hello and
   goodbye. Nothing is asked for what the teacher already decided. Leaving the Logic step with it complete
   starts the Logic and ideas parts in the background, so Soạn only drafts the rest.
   Claude's parts stay with the lesson, each with a fingerprint of the decisions it was written from. A
   change the page can follow by itself (Danh sách / Khen / Ẩn, which fixes are in a systematic mistake,
   moved comments, no rewrite, ✓ / ~ / ✗) updates the lesson at once, keeping every edit made in Xem lại.
   A change Claude has to write about (a checklist note, an idea, a mistake's name, the rewrite sentences)
   marks just that part: **Soạn lại N phần** redrafts only those. A failed part can be retried alone, even
   after leaving the page. Soạn can't be started twice. Socratic questions follow fixed rules:
   facts only (a word's meaning, a gap, a form, a missing word, what the prompt says), one clearly right
   answer, replies that explain; none rather than a bad one. The part that streams first warms the prompt
   cache before the others start; Soạn and Xuất show the tokens of every Claude
   call for the lesson (new / read from the cache / written to the cache, failed and retried calls included)
   and roughly what it cost, the suggestions priced at Sonnet's rate.
7. **Xem lại**: Claude's lines by screen with the phone preview, and the automatic checks (`checks2` in
   `lib/review.js`: quotes verbatim, figures on the chart, Socratic answers, board lines with two formulas in
   one ("/" or ","), patterns with no correction and corrections in no pattern, Đậu's voice).
8. **Xuất**: the `.html` (built exactly like `build.py`), the `.json`, or a Netlify link (`lib/netlify.js`: every
   publish is a new unguessable `/r/<random>/` address; old pages are never removed).

The student page of a flow-2 lesson (`"flow": 2`) has two parts, **Logic** and **Language**. The tabs show
"TR · CC" until the results screen has counted the scores up, then "TR 7 · CC 6". An essay's prompt isn't on
the first screen (it comes where it matters, and stays behind "Đề"). Results → Logic (the checklist on one
screen, then in essay order: each problem, the comments moved to Logic, and the ideas) → Language → practice
(only with a systematic mistake) → Viết lại (it opens on the idea's chain from Logic) → end.

- A ~ point gets one short "Chỉnh nhẹ" screen (her sentence, one line, the rewrite); a ✗ point is walked
  through step by step: "Mình xét câu thesis của em nha, em đã viết…", then the
  prompt with its key words lit or the framework rule, a Socratic question, what her sentence lacks (it
  lights up), "anh Khoa đề xuất em sửa lại như sau nhé" and the rewrite, each change lit in both cards while
  Đậu says why.
- The ideas: "Rồi bây giờ mình xem các idea của em nhé", the map of her essay (what Mở bài / each Body / Kết
  bài is, no verdict per part; a body's ideas as chips coloured green ổn / yellow nâng cấp thêm / red cần
  sửa, with a legend; the same three colours everywhere), then "Em phát triển ý tới đâu?": the page counts them ("Em có 4 ý: 2 ý ổn
  rồi…"), the cards drop in one by one, and the ✗ ones open their chain (drawn unmarked while she answers,
  then fixed by its type: a new direction under her struck-through chain, the new links after the last good
  one, or the missing steps).
- Language: "Cụm em đã dùng tốt", what the teacher praised (one screen), then a map: **Lỗi lớn nhất 1, 2…**
  (tap to jump) and **Xem N lỗi khác**, a sheet listing every other correction (her words → the fix, the
  teacher's comment, "Xem trong bài"). Then each systematic mistake: one opening line that counts its places
  ("Giờ mình xem lỗi em hay lặp lại nhất nha, em để ý 5 chỗ này nè"), the question, the fixes drawing in with
  a coloured tag for the pattern each follows, the number big ("5 lần trong bài") while Đậu says it, and the
  board: one formula per line, dotted in the tags' colours, with its rule beside it. Mistakes are counted in
  places (corrections + highlighted notes) everywhere.
- The lines between parts come from the page, so they always match what comes next.
- Three looks: red wavy / struck through for a mistake, orange dotted → green for a Nâng cấp, green for Khen.
- The overall score: the count slows down before the last step, then a celebration by band (6.0 a pop,
  6.5 cheers and a gold ring, 7.0 confetti, 7.5 a star stamp, 8.0+ the lights go down, fireworks, gold confetti
  and a "Xuất sắc" badge). Only the first time; going back or reduced motion shows the result still.
- Chalkboards (the systematic mistake's "Quy tắc") are Đậu pointing at a big board
  (`assets/dau_board.webp`), the formulas chalked on it and sized to fit; a plain board only if they don't.
- The mascot stickers each have a job: section title cards (Logic: magnifying glass, Language: writing,
  Luyện tập: thumbs-up, the end: cheering), a thinking Đậu beside every question, an oops Đậu on a wrong
  practice answer; a flame counts practice answers right in a row.
- Practice: Đậu never talks over an exercise, so the first tap lands on the answer. The question sits beside a
  small Đậu; his reaction ("Chuẩn rồi á em", "Chưa đúng nè, em thử lại nhen") and the explanation come in a
  card under the answers.
- The last screen's button is **Tải sổ tay về**: one picture (1080 px wide, drawn on a canvas) with only the
  main things: "Cụm em dùng tốt" (with what the teacher praised), "Nhớ cho bài sau" (the lesson's takeaways)
  and "Lỗi cần để ý" (each systematic mistake with its board, its rules and its fixes with the teacher's
  comment). The other fixes (the "Xem N lỗi khác" list) stay on the page only. On a phone it opens the share sheet (save to Photos, Zalo); elsewhere it downloads.

Drafts started before flow 2 (and `editor.html?flow=1`) keep the old steps: Framework tagging → a 6-part
draft (`lib/draft.js`) → "Cần duyệt" review → export. Old lessons still build and play as before; flow-2 lessons made before the Language map put every shown
vocabulary and grammar fix in the "Xem N lỗi khác" list.

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
