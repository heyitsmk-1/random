# Livestream: Notes

A dated log of what the project owner has said and asked for. The owner works on several projects at once, so this file is the memory for this one.
Newest entries go at the bottom.

---

## 2026-10-07: Project started

What was said:
- Make a new subfolder called `Livestream`.
- Keep a list of rules that gets added to as we code (see [RULES.md](RULES.md)).
- This is a new project, so document everything.
- The owner works on multiple projects and won't remember everything, so keep notes of what they said in a document (this file).
- **Rule 1:** Never code anything until the owner says verbatim "CLAUDE COOK".

What was done:
- Created `Livestream/` with `README.md`, `RULES.md`, `NOTES.md`, and `CLAUDE.md`.
- No code written (Rule 1).

Open questions:
- What is the Livestream project supposed to do? (Platform, features, tech stack: all still to be decided.)

## 2026-10-07: What the project is

What was said:
- We're going to livestream on **youpass.vn**, the owner's website.
- It's a class that **everyone can join for free**.
- Because the class is so large, the owner **can't manage everyone**.
- A **talking-head livestream is boring**.
- The owner wants to **do something different that solves both of these problems**.

What was done:
- Added the project description to README.md.
- Started [IDEAS.md](IDEAS.md): a brainstorm of features that tackle both problems (live quizzes, question queue, AI assistant, instant AI feedback, teams/leaderboard, class votes, stream overlay, student helpers, auto-moderation).
- No code written (Rule 1).

Open questions:
- What subject is the class? (Is youpass.vn an IELTS / English learning site?)
- About how many students per class? How long, and how often?
- How does youpass.vn stream right now, if at all? (YouTube/Facebook embed, its own player, nothing yet?)
- What is the website built with, and can we change it, or should this be a separate page that embeds the stream?
- Do students log in on youpass.vn?
- What streaming software does the owner use (OBS, StreamYard, etc.)?
- Which ideas from IDEAS.md does the owner like?

## 2026-10-19: Interactivity ideas

What was said:
- **Leave the technical side of streaming off for now.**
- Focus on making this a **unique experience compared to everyone else through better interactivity**.
- Owner's idea 1, **Understand vs. Don't understand:**
  - Students have a button on their screen, e.g. "press Space to change mood", between Understand and Don't understand.
  - The teacher sees a % of how many students don't understand.
  - If too many stop understanding, the teacher pauses to explain until the % goes back down.
  - Then AI gets the transcript of that moment and the question(s), and sends it as a note for students "or something like that".
- Owner's idea 2, **easier interactivity:** a Kahoot-style interaction screen with multiple choice, or Quizizz-style fill in the blanks.
- Owner's idea 3, **AI Socratic tutor:** integrated while students practise; the AI reports the main mistakes back to the teacher for the teacher to correct, and maybe even shows students a personalised video about a mistake they made.

What was done:
- Added the three ideas to the top of [IDEAS.md](IDEAS.md) as the main direction, with design details and suggestions for each:
  - Confusion meter: phone button, auto-expiry/"Got it now?", check questions to back up self-report, alert threshold, optional "what's confusing?" text, confusion map and smart replay after class.
  - Quizzes: AI writes questions from the transcript and the teacher approves them; wrong answers feed the confusion data; the timer runs on the student's screen.
  - Socratic tutor: grouped mistake report; a **self-building mistake video library** made by auto-clipping the teacher's live corrections, as a cheaper option than generating a new video per student.
  - How all three fit into one loop: Teach → Sense → Check → Practise → Report → Fix → Follow up.
- No code written (Rule 1).

Open questions:
- What subject is the class? (Still unknown; it changes how the Socratic tutor and quizzes work.)
- Should students see the confusion %, or only the teacher?
- Confusion notes: send to everyone, or only students who pressed "Don't understand"?
- Personalised videos: auto-clipped from the teacher's live corrections, pre-recorded, or AI-generated?
- Earlier questions about youpass.vn and streaming are **parked** (owner's instruction).

## 2026-10-19: Subject and first version

What was said:
- The class is **IELTS**, potentially **all four skills** (Listening, Reading, Writing, Speaking).
- **Roll out something fast and gauge feedback** first.
- The owner has their own idea for what the first version should be, but wanted to hear Claude's first.

Claude's proposal for the first version:
- **Confusion meter + quick check questions, piloted on one Reading lesson.**
  - Confusion meter: Understand / Don't understand button, live % for the teacher, alert when it crosses a level, an optional "what's confusing?" box. No AI needed for version 1.
  - Quick check questions: multiple choice, fill in the blank, and True / False / Not Given. These are real IELTS Reading question types, so the quiz *is* the practice.
- Why: it's the most unique idea and also the simplest to build; it tackles both problems; and Reading fits it best (native question formats, no audio timing issues, T/F/NG is a classic confusion point).
- Left for later: AI confusion notes (can be done by hand after class at first), Socratic tutor (needed for Writing/Speaking), mistake video library.
- How to measure feedback: % of viewers who press the button at least once, quiz participation, watch time compared to past streams, a one-question survey at the end, and whether the teacher actually used the spikes.

What was done:
- Added IELTS and the "fast rollout" approach to README.md.
- No code written (Rule 1).

Open questions:
- What is the owner's idea for the first version?

## 2026-10-19: Owner's pick for the first version: Writing Task 2

What was said:
- The owner was thinking **Writing Task 2** for the first version, because **that's usually what most students are most interested in learning about**.

Claude's response:
- Agrees: for a free class, demand is what brings people in, and that matters more than what's easiest to build.
- Task 2 also shows off the "too many students" problem best: one teacher can't mark thousands of essays, so this is where the AI part stands out.
- Caveat: a full essay takes ~40 minutes and full-essay AI marking/band scores are slow, costly, and not always reliable. So **break Task 2 into small pieces** that fit a live class:
  - spot the question type (opinion / discuss both views / problem–solution / advantages–disadvantages),
  - paraphrase the prompt,
  - write a thesis statement,
  - write a topic sentence,
  - linking words / cohesive devices,
  - generating and choosing ideas.
- Proposed first version (draft, not confirmed):
  1. **Confusion meter** (same as before).
  2. **Quick check questions** on Task 2 skills, e.g. "Which is the best thesis statement?" (multiple choice), linking words (fill in the blank), "What type of question is this?".
  3. **One short writing task with instant AI feedback:** students write *one sentence* (e.g. a thesis statement). AI gives quick feedback on the four Task 2 criteria (Task Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy), **no band score** in version 1. The teacher sees the top mistakes grouped together.
  4. **Student answers featured on stream** (anonymous or with a nickname): a strong example and a common mistake, which the teacher reacts to live.
- Still later: full essay marking, full Socratic tutor, mistake video library, other skills.

What was done:
- No code written (Rule 1).

Open questions:
- Does the owner agree with the draft first version above?
- Include the one-sentence AI feedback in version 1, or only the meter + quizzes?
- OK to feature student answers on stream? Anonymous or with nicknames?

## 2026-10-19: Drafting Lesson 1 for a prototype for the owner's boss

What was said:
- The owner has **~20 minutes to get a prototype up and running for their boss**.
- Lesson: **how to develop ideas** (Writing Task 2), using the "study all subjects vs. only subjects they're good at or interested in" topic.
- Framework: **whichever view you take, you give the benefits of it.**
- Full flow written up in [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md): pick a side → topic sentence with Socratic AI feedback and a common-mistake report → ideas with Gợi ý and AI grouping → teacher develops one idea per side → consolidation page.
- An existing AI feedback tool for speaking is at **github.com/youpassvn/speaking-intensive** (private). The owner offered their login credentials.
- The **"Student feedback consolidation"** tool is believed to be in this repo (heyitsmk-1/random).
- The owner asked to **discuss first, then note down the good ideas**.

What was done:
- Wrote [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md) with the owner's flow plus Claude's suggestions (marked as suggestions).
- Tried to attach `youpassvn/speaking-intensive`: **no access**. Claude should **not** use the owner's personal login. Better options: install the Claude GitHub App on the `youpassvn` org (or give it access to that repo), or copy the relevant feedback prompt/code into this repo.
- Found likely candidates in this repo:
  - `student-page/` on branch `claude/vibrant-hopper-bdqjun`: probably the feedback consolidation tool (student recap pages).
  - `speaking-pro/` on branch `claude/speaking-practice-conversation-v6sfvm`: a speaking practice prototype with prompt reference notes.
- No code written (Rule 1).

Proposed prototype for the boss (if the owner says CLAUDE COOK):
- One web page with the **student's phone view and the teacher's dashboard side by side**.
- A **simulated class** (a few hundred fake students), so the boss sees the side split, mistake counts and idea groups fill up live.
- AI feedback **scripted/simulated** so the demo can't fail in front of the boss, unless the owner has an API key and wants it live.

Open questions: see the bottom of LESSON-01-develop-ideas.md.

## 2026-10-19: Lesson 1 answers

What was said:
- It's a **mini lesson**, so students brainstorm ideas **only for the side they choose**.
- **Developing an idea, core premise:** does the core idea support the central point of the paragraph yet?
  - Example: "studying all subjects will allow students to become more well-rounded individuals" → is this benefit enough to justify having to study all subjects?
    - If **not** → give more **IMPACT**.
    - If **yes** → **explain** why it helps them become well-rounded.
    - If **neither** is possible → give **examples**.
  - This is only how to *start* writing. After that, students are free to develop the idea in a different way.

What was done:
- Updated [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md): step 3 is one side only; step 4 has the Impact / Explain / Example decision table, the worked example, and suggested interactions (AI asks the core question, the student's answer picks the path, the teacher sees the path split and common problems).
- No code written (Rule 1).

Open questions:
- Is the consolidation tool `student-page/` on branch `claude/vibrant-hopper-bdqjun`?
- Prototype: scripted AI or live AI (needs an API key)?

## 2026-10-19: Consolidation tool confirmed

What was said:
- The student feedback consolidation tool is the one on branch **`claude/vibrant-hopper-bdqjun`** (`student-page/`).

What was done:
- Read its README and `build.py`. It builds anh Đậu's per-student review page from a lesson JSON file; today the teacher's marking decisions from the CRM fill that JSON.
- Noted in [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md): for the livestream, the class data and the AI tutor have to fill that JSON instead of the teacher, since the teacher can't decide for thousands of students. The page design and builder can be reused.
- No code written (Rule 1).

Open questions:
- Prototype: scripted AI or live AI (needs an API key)?

## 2026-10-19: Holding off

What was said:
- Confirmed: **the consolidation page has to be filled from the class** (not by the teacher's per-student decisions).
- On the prototype's AI: "**live AI needs an API key**". Not yet decided whether the prototype uses scripted or live AI.
- **Hold off on cooking.** Don't build the prototype yet.

What was done:
- Logged the above. No code written (Rule 1, plus the owner's explicit "hold off").

Open questions:
- Scripted or live AI for the prototype? If live, the owner provides an API key (it should go in an environment setting, never in the repo).

## 2026-10-19: Gap review

What was said:
- Read through everything again and find gaps in the project.

What was done:
- Re-read every document and wrote [GAPS.md](GAPS.md): 26 gaps grouped as A (before the prototype), B (lesson design), C (before going live), D (business and measurement), plus housekeeping.
- Fixed stale bits: README status and first-version line; added the scripted/live AI question to the Lesson 1 open questions.
- Suggested three possible new rules for the owner to decide on (not added).
- No code written (Rule 1).

## 2026-10-19: Answers to the gap review

What was said:
1. The prototype for the boss is to **show the owner's vision for the livestream**.
2. **Yes**, the confusion meter is in Lesson 1.
3. Streams will run **two or three times a week**, so **content prep needs to be faster**.
4. Asked how to copy the `speaking-intensive` folder to give it to Claude.

Claude's response:
- Vision demo → show the whole experience end to end (student screen + teacher dashboard + simulated class + consolidation page). Scripted AI fits a vision demo well. Owner still to decide.
- Fast content prep → proposed a **lesson builder**:
  - The teaching framework (pick a side → topic sentence template → benefits → Impact / Explain / Example) stays the same each class. Only the **essay prompt** changes.
  - The teacher pastes a new prompt; AI drafts the Gợi ý ideas, model topic sentences, accepted versions of X, model developments for each path, and expected mistakes.
  - The teacher checks and edits in ~10 minutes. Same pattern as the `student-page` tool's "Claude gợi ý → Dùng gợi ý" (AI suggests, teacher approves).
  - Mistake lists carry over between lessons (e.g. "in favor of + -ing" is the same in every class).
  - The builder could be part of the vision demo too (it shows the teacher's side is sustainable).
- Getting speaking-intensive to Claude, best options in order:
  1. **Give the Claude GitHub App access** to `youpassvn/speaking-intensive` (connect GitHub at https://claude.ai/connect-github; an owner of the `youpassvn` org may need to approve the app for that repo). Then Claude attaches it directly. Nothing gets copied.
  2. **Copy only what's needed** (the AI prompt/feedback files) into this repo, e.g. `Livestream/reference/speaking-intensive/`, via GitHub's "Add file → Upload files" on branch `claude/keen-edison-wg7nsd`.
  3. **Paste the prompt text** into the chat.
  - Before copying: check it's OK to copy company code into this personal repo, and leave out `.env` files, API keys, and any student data.

What was done:
- Updated GAPS.md (gaps 1 and 3 closed, 4 and 5 updated) and LESSON-01 (confusion meter confirmed).
- No code written (Rule 1).

Open questions:
- Scripted or live AI for the vision demo?
- Should the lesson builder be part of the demo?

## 2026-10-19: Lesson 1 final step

What was said:
- Answer to gap 6 (no end product): **that's the final step.** After students have been taught how to develop ideas and checked that their ideas make sense, they **write the whole body paragraph**. **AI checks their writing, Socratically.**

What was done:
- Added **Step 5: Write the whole body paragraph** to [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md), with suggestions (check order logic → language, hint cap, teacher report) and questions.
- Consolidation page now includes the step 5 paragraph.
- GAPS.md: gap 6 closed.
- No code written (Rule 1).

Open questions:
- Which idea goes in the paragraph: the teacher's from step 4 or the student's own from step 3?
- One developed idea or more? Rough length and writing time?

## 2026-10-19: Core principles ("caveman mode")

What was said (owner was tired and put it simply):
- Basic idea: **teacher teaches, students respond instantly using tech**, instead of typing, which takes a long time. **Anonymity makes the barrier of entry lower.**
- **Feedback by AI, but modelled after people:** not a big list of mistakes and "you go fix", but **slow and Socratic**.

What was done:
- Added these as **Core principles** at the top of README.md, and linked them from LESSON-01.
- Step 5 note updated: the AI raises one issue at a time, most important first; the check order is never shown to the student as a list.
- No code written (Rule 1).

## 2026-10-19: Big-picture planner

What was said:
- The big picture is too big to imagine without a planner. Owner asked Claude to **draft something to go over**.

What was done:
- Wrote [PLAN.md](PLAN.md): vision in one sentence, core principles, a diagram of the whole system (before / during / after class), the five pieces, Lesson 1 minute by minute (times are guesses, ~57 min), a 4-phase roadmap (vision demo → first real class → every week → grow), the top 7 decisions waiting, and what's parked.
- Kept it as a Markdown document (not an HTML page), since an HTML page would be code (Rule 1).
- No code written (Rule 1).

## 2026-10-19: Wants a drawing, not text

What was said:
- PLAN.md is "a wall of text". The owner needs **something drawn out** to imagine the project.

What was done:
- Asked whether drawing pictures (which needs a little drawing code, not product code) is allowed under Rule 1. The owner gave **no preference**, so Rule 1 stays strict: **no drawings until the owner says CLAUDE COOK or explicitly says drawings are fine.**
- No code written (Rule 1).

Plan for when allowed: a visual page with (1) the before / during / after class flow as a picture, (2) sketches of the student's phone screen and the teacher's dashboard for each step of Lesson 1.

## 2026-10-19: Request for a PowerPoint prototype

What was said:
- "okay **CLAUDE CODE** make the prototype as a power point slide: what the teacher sees and what the student sees"

What was done:
- **Not started.** The owner wrote "CLAUDE CODE", not "CLAUDE COOK". Rule 1 needs the exact phrase, so Claude asked the owner to confirm with "CLAUDE COOK".
- No code written (Rule 1).

Ready to build once confirmed: a PowerPoint deck, one slide per Lesson 1 step, each showing **the student's phone screen** next to **the teacher's dashboard**, plus an opening big-picture slide.

## 2026-10-19: CLAUDE COOK: PowerPoint prototype built

What was said:
- **CLAUDE COOK** (exact phrase), after asking for "the prototype as a power point slide: what the teacher sees and what the student sees".

What was done:
- Built [prototype/Livestream-Prototype.pptx](prototype/Livestream-Prototype.pptx) (10 slides) with [prototype/build_deck.js](prototype/build_deck.js):
  1. Title: YouPass Live + the 3 core principles.
  2. The big picture: before / during / after class, with the during-class loop (teacher → students → AI tutor → dashboard).
  3. Before class: the lesson builder.
  4–8. Steps 1–5 of Lesson 1, each with the **student's phone** next to the **teacher dashboard** (always-on confusion meter on the right; step 2 shows it in alert at 34%).
  9. After class: the anh Đậu recap page + the teacher's "where the class got lost" timeline.
  10. Roadmap: phases 0–3, and what's needed to start phase 1.
- All class numbers are made up (the slides say so). Speaker notes on every slide.
- Name "YouPass Live", the colours, and the student screen text in English are Claude's placeholders, for the owner to change.
- Checked: file validation passed; every slide rendered and looked over.

How to rebuild after edits (from this folder, with pptxgenjs installed):
`NODE_PATH=<folder containing node_modules> node prototype/build_deck.js <pptx skill>/scripts/apply_theme.js`

Open questions:
- Owner to review the deck and say what to change.

## 2026-10-21: How to get speaking-intensive to Claude

What was said:
- Owner asked how to clone `speaking-intensive`.

What was done:
- Gave three ways: (1) give the Claude GitHub App access so Claude attaches it directly (best, nothing copied); (2) download the ZIP from GitHub and upload only the prompt/feedback files into `Livestream/reference/speaking-intensive/` on this branch; (3) clone with git on the owner's computer and copy the files in.
- Warned: check `heyitsmk-1/random` is **private** before copying company code into it, and leave out `.env`, API keys, `node_modules`, and student data.

## 2026-10-21: speaking-intensive received

What was said:
- The owner uploaded `speaking-intensive-main.zip`.

What was done:
- Extracted it in Claude's scratch folder (not in the repo) and read the prompts, AI setup, database and docs. Found no secrets in it.
- Wrote [reference/speaking-intensive-notes.md](reference/speaking-intensive-notes.md): what it is, how the tutor coaches, what Livestream can reuse, what has to change. **The code itself is not copied into this repo.**
- Key findings:
  - The tutor already follows our principles: chips instead of typing, one issue per turn, Socratic, honest praise.
  - Its hidden `notes` per student are exactly the data for the teacher's "most common mistake".
  - Its **report card** (per-student memory of recurring errors) can feed the recap page and the next class.
  - It already has **youpass.vn logins** and a **company AI gateway**, which may answer the login and API-key gaps.
- Updated GAPS.md (gap 4 closed; gaps 2 and 16 updated), LESSON-01 and README.

Open questions:
- Is the livestream teacher anh Khoa (the tutor's persona is "TA of anh Khoa")?
- Can Livestream use the company AI gateway and youpass.vn logins?

## 2026-10-21: Teacher, AI and logins decided

What was said:
- **anh Khoa** is going to be the teacher. (So the tutor persona "TA of anh Khoa" fits as-is.)
- The livestream **will use the company's AI gateway and youpass.vn logins**.

What was done:
- README: added teacher and "built on". GAPS: gap 16 (logins) closed; gap 2 updated (no new API key needed; only the demo's scripted vs live choice is open).
- No code written.

## 2026-10-21: Feedback on the deck: YouPass style, less rigid, teacher control

What was said:
- Shared two skills: **ux-principles** and **youpass-design**. The deck's design "isn't very sleek and in line with YouPass' style", so read these.
- The slides are "ok but a bit rigid".
- **"In practice the teacher needs more control of the next step, not a set plan."**

What was done:
- Read both skills; wrote [reference/design-notes.md](reference/design-notes.md) (brand tokens + the UX principles that matter here). CLAUDE.md now says all design work follows it.
- Added **core principle 4: the teacher is in control, not a script** (README).
- Proposed a new model (waiting for the owner's OK before rebuilding the deck):
  - The lesson builder prepares an **activity tray**, not a fixed sequence: Chọn phe (poll), Câu hỏi nhanh (MCQ / fill-in), Viết câu + AI tutor, Góp ý tưởng (ideas + Gợi ý), Phát triển ý, Viết đoạn + AI tutor, Hiểu chưa? (pulse), Lên sóng (show on stream).
  - The plan is a **suggested order**; the teacher can launch any activity any time, skip, repeat, add time, close answers, reveal, or put a result on stream.
  - **Improvise:** "+ Câu hỏi nhanh" drafts a quick question from the last few minutes of teaching or from the top mistake; one tap to launch.
  - **AI suggests, the teacher decides:** e.g. "34% chưa hiểu 'in favor of + V-ing' → mở 1 câu hỏi nhanh?" [Mở] [Bỏ qua]. Never automatic.
  - Students see a calm "waiting" screen between activities; unfinished work is saved if the teacher closes an activity.
- Proposed deck redesign: YouPass orange/green on warm backgrounds, Nunito, pill buttons, soft shadows, Vietnamese UI text; varied layouts instead of the same template every slide; the **teacher control panel** as the hero slide.

Open questions:
- OK to rebuild the deck with this model and style?
