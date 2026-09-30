# Phase 2 plan: student page updates, teacher extension, links

Status: **waiting for CLAUDE COOK.** Nothing below has been started.

---

## Ground rules for the overnight run

1. **Branch:** all work goes on `claude/vibrant-hopper-bdqjun`, committed and pushed as it goes. No pull request, no other branch.
2. **Students see nothing new overnight.**
   - I don't republish the five live links.
   - I don't send any files meant for students.
   - Rebuilt pages stay on disk until you approve them in the morning.
3. **No outside calls.**
   - No Claude API calls: there's no key here, and it would be your key and your money.
   - No Netlify deploys.
   - Both features are built from the official docs and tested against fake responses. The first real call happens when you add your key or token.
4. **No student data in the repo.**
   - Essays, names, lessons, built pages and mascot art stay in gitignored folders (`data/`, `dist/`, `assets/`), as now.
   - Test fixtures made from your saved CRM pages stay gitignored too.
5. **Nothing deleted, and your content untouched.**
   - I change no correction, comment or score.
   - Lesson text changes only where listed in A6 below.
6. **If something is ambiguous, I stop and write it down.** I don't guess.

---

## A. Student page (all students)

| # | Change | Done when |
|---|---|---|
| A1 | **Back button always visible.** It stays at the bottom left and goes back one step, even while Đậu is talking. Swiping right still works. It's disabled only on the very first step. | Back works from every state (Đậu talking, question open, exercise, rewrite) on all test sizes |
| A2 | **Laptop size.** On wide screens (≥ 900 px) it stays one column but everything gets bigger: wider cards, larger text, bigger Đậu. No essay panel. Arrow keys work as before. Phone layout doesn't change. | Walks cleanly at 1440×900 and 1280×800; phones look the same as today |
| A3 | **Rewrite becomes its own section: "Nhiệm vụ viết lại".** Details below. | It no longer shows as "Câu 5/5"; every step works; her text survives a reload |
| A4 | **Praise.** 2–3 specific compliments per essay, each shown where it fits (framework, one idea, linking, vocab). The build refuses more than 3. | Shows at the right moments; the build check enforces the limit |
| A5 | **The real Đậu icons** replace my stand-in: open eyes next to his lines, ^ ^ for happy moments. | Both show in light and dark |
| A6 | **Lesson fixes (data only).** Listed below. | Each fix visible in the rebuilt page |

### A3: how the rewrite works
- **Where it sits:** after the 4 practice questions and before the summary, so everyone reaches it.
- **Title card:** "Nhiệm vụ viết lại". Đậu says it's anh Khoa's request.
- **What she rewrites:** the lesson says which target. One of:
  - one supporting idea
  - a whole body paragraph
  - intro + topic sentences
- **Her original** is shown.
- **Hints she opens one at a time:**
  1. the flow (the chain of steps)
  2. sentence starters
  3. a small bank of useful phrases
- **The writing box:** her text is saved on her own device.
- **Self-check list.**
- **Model answer:** shown only after she has written something, or taps "Xem bài mẫu".
- **Ending:** a "Chép bài của em" (copy) button and a **"Nhắn anh Khoa qua Zalo"** button → https://zalo.me/0838002910.
- **The teacher name and Zalo link** come from the lesson, so the extension setting can change them later.

### A6: lesson fixes, all agreed in chat
- **Exact prompts:**
  - Week 4 on Khôi's and Hoàng Anh's pages
  - Week 5 on Trâm Anh's and Khuê's pages
  - Trâm Anh's "Đọc đề" highlight, updated to the real wording ("…to children")
- **Trâm Anh:** remove my suggestion "The first one is that → The main reason is that". The Week 5 framework uses "The first one is that".
- **Hoàng Anh:** the intro fix uses the Week 4 wording: "…they are far outweighed by the associated benefits, making it a positive one."
- **All five existing lessons** move to the new rewrite format, keeping the same content.
- **Praise lines for the five existing lessons:** I draft them and mark them as drafts. Pages with drafts wait for your OK before anything is republished.
- **Not touched:** Khuê's two AI corrections on "watch TV, movies". You haven't decided on those yet.

### A: testing
- Walk every page at 375×667, 360×780, 390×844 (light and dark), plus 1440×900.
- Pass means no overflow, no errors, no stuck states.
- Check the back button in each state.
- Screenshots in the morning report.

---

## B. Chrome extension MVP (for you, the teacher)

**New folder `extension/` in the repo** (code only, no student data).

**Mascot art:** it's kept out of the public repo, so a small script copies it in to make the installable zip. You'll get that zip to load into Chrome: Developer mode → Load unpacked.

### What it does
1. **Settings page:**
   - Claude API key (stored only in your Chrome)
   - teacher name (default "anh Khoa")
   - Zalo link
   - Netlify token (for C)
2. **"Tạo bài ôn" button** on `admin.ielts1984.vn/writing/*`. It opens a full editor tab with a copy of that page. **It only reads the page, it never edits the CRM.** You delete rejected AI comments in the CRM yourself, before pressing the button.
3. **Extraction:** today's Python extractor, rewritten in JavaScript.
   - All the rules we built: your typing, "=> COMMENT", "// X", missing paragraph breaks, sentences typed into the essay.
   - Tested against all 6 saved pages: it has to produce exactly what the Python version does.
4. **Course file:** all 10 weeks.
   - homework type
   - exact prompts, including both Week 5/6 tracks
   - each week's framework checklist
   - the chart data and main features for Weeks 7–10
5. **Editor tab, step by step:**
   1. **Week check:** detected from the homework title, you confirm. For Week 6 you pick 40/60 or Partly Agree.
   2. **Framework tagging:** click sentences to tag them (Thesis, TS1, TS2, Ý1–4, Conclusion). Then tick that week's checklist ✓/✗, with a comment for each.
   3. **Draft:** one Claude call, which drafts the lesson. Every field is tagged **Trang** (from the page), **Thầy** (your words) or **AI** (my draft).
   4. **Edit, one module at a time, with a live phone preview beside it:**
      - every line Đậu says is a text box
      - chain links are text boxes
      - Socratic questions are confirmed by default; you can edit or reject them
      - errors can be dragged between groups; you name the groups and star the main mistake
      - pick 2–3 compliments
      - pick 4 takeaways from about 6
      - choose the rewrite target by clicking sentences; your model and flow come first, and I draft anything missing
      - AI fields stay highlighted until you tick or edit them
      - Đậu's voice rules are flagged as you type (no full stops, no emoji, sparse emoticons)
   5. **Export:** download the finished `.html`, built in the browser exactly like `build.py` builds it now.
6. **Scope tonight: Task 2 essays (Weeks 2–6).**
   - Week 1 (paragraph + paraphrase) and Task 1 (Weeks 7–10) come next. They need new review screens, and the course file will already hold their data.
   - Any other week is refused with a clear message, never a broken page.

### B: testing
- The JavaScript extraction matches the Python output for all 6 saved pages.
- The editor runs end to end on each saved page, using a fake Claude response.
- Each exported page walks cleanly, with the same checks as A.
- I can't test inside real Chrome on the CRM from here. You do that first thing: install the zip, open a real grading page, press the button.

---

## C. Netlify links
- **"Publish link" button** in the export step. It needs the Netlify token in settings; without a token, only the download shows.
- **Site:** one site, created automatically the first time.
- **Page addresses:** each student's page lives at an unguessable address, like `…/r/k7f2qx9m3a/`. It's hidden from search engines (noindex).
- **Existing pages stay put:** publishing only adds a new page, and pages already published are never removed or overwritten.
- **Testing:** can't be tested for real without your token. I'll build it from Netlify's documented upload process and test it against a fake server.

---

## Not happening tonight
- Republishing the 5 live links, or sending anything to students
- Calling the Claude API or Netlify
- Week 1 and Task 1 review screens
- Any change to the CRM, or anything deleted
- Changes to your corrections, comments or scores

## Waiting on you
- **Khuê's "watch TV, movies" corrections:** keep or drop?
- **Morning approvals:**
  - the praise drafts for the 5 existing pages
  - the rebuilt pages, before I republish the links
- **Install the extension zip** in Chrome, then open a real grading page and try it.

## Morning report
- What's done, per item above (✓ / partly / not done, and why)
- Test results and screenshots
- Anything I stopped on instead of guessing
