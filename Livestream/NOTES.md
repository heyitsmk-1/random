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

## 2026-10-21: Stream-deck model, and build the student prototype

What was said:
- **Use Montserrat** (instead of Nunito).
- There's **still a prep phase**, but not step 1 → 2 → 3 rigidly. It's **like a stream deck**: the teacher presses a button to go into an activity. Activities can be **planned, or made new on the spot**. We'd need **some templates**.
- The student's screen **still has the Understand / Don't understand toggle**.
- "I can't imagine the whole thing in my head, so **let's just build**."
- **Skip the prep for now.** Claude makes the lesson from the owner's earlier descriptions.
- **Build the student's screen first.** For the prototype, the lesson **auto-plays** and the owner **plays the student**.
- If the student presses **Don't understand**, the lesson **pauses and re-explains**. So write, for each step, an **explanation, a re-explanation, and ICQs / CCQs** (instruction-checking and concept-checking questions).
- Then a **writing practice** part with **corrective feedback from the AI (speaking-intensive style)**, using the **animations and text boxes from the student consolidation page** (`student-page/`).
- Asked: what are we missing before Claude can build?

What was done:
- design-notes.md: font is now Montserrat.
- Checked: the consolidation page template has the animations to reuse (strike-through, stamp, chalk, cheer, shake, sheet-up, anh Đậu talking…). Its mascot images are **not** in the repo (kept out on purpose).
- Checked: a published claude.ai page can call Claude directly (the `sample` capability), so the prototype can give **live AI feedback with no API key**; the viewer approves it once.
- Listed what's missing (see the reply that day). No code yet: Rule 1 needs the exact phrase.

## 2026-10-21: Answers for the student prototype + lesson script

What was said:
- AI feedback: **do it live**.
- Đậu images "not in the repo": asked Claude to message the instance working on the consolidation tool.
- No video: **mock up a screen with text, and a webcam in the corner**.
- **Web page, on desktop (not phone), shared as an artifact.**
- Language: yes, but **use anh / em** (not mình / bạn).
- Flow: yes. Paragraph uses the student's own idea: yes.
- ICQ/CCQ: **not a CCQ before every task.** Sprinkle CCQs **where it's difficult** (e.g. teaching the topic sentence) and **always after a re-explanation**.
- "Chưa hiểu" behaviour: agreed. Fake classmates: yes. Only the student side: yes.

What was done:
- Didn't need to message the other instance: its published anh Đậu pages already contain the mascot art (body, arms, eyes, mouths, sprout, icons). Claude can reuse those images in the prototype page. Only the art is reused, no student data. (Cloud sessions also can't reply to messages yet.)
- Wrote **[LESSON-01-script.md](LESSON-01-script.md)**: the full lesson (6 parts) with anh Khoa's explanations, re-explanations, CCQs only on the hard parts, ICQs before tasks, Gợi ý lists, model paragraphs for both sides, recap contents, and anh Đậu's tutor rules (adapted from speaking-intensive, anh/em).
- Decided: the AI tutor is **anh Đậu, TA của anh Khoa** (same character as the recap page).
- No code yet: waiting for "CLAUDE COOK".

## 2026-10-21: CLAUDE COOK: student prototype built

What was said:
- **CLAUDE COOK** ("May the Lord bless your code, and may it not be buggy. Amen").

What was done:
- Built the student-side prototype: **https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF** (source in [prototype/student-live/](prototype/student-live/)).
  - Desktop layout: anh Khoa's stream (board + captions + webcam mock-up) on the left, "Bảng của em" on the right, Hiểu / Chưa hiểu toggle in the top bar (Space key).
  - The whole Lesson 1 script from [LESSON-01-script.md](LESSON-01-script.md): explanations, CCQs on the hard parts, ICQs, re-explanations with CCQ (+ hint + second CCQ).
  - anh Đậu tutor on the 3 writing tasks: live Claude (viewer approves once), scripted fallback otherwise.
  - Recap page with anh Đậu's art and animations (confetti, strike-through → fix), from the consolidation page.
  - YouPass colours, Montserrat, light and dark themes.
- Tested: a headless browser played the whole lesson in offline mode (pick side, press Chưa hiểu, write, chips, rewrite, ideas, paragraph, recap) with no errors. Fixed 3 bugs found that way.
- **Not tested here:** the live AI replies (they only run inside claude.ai). The page is private to the owner until shared.

Open questions:
- Owner to try it and give feedback.
- In a real class the teacher can't pause for one student: the re-explanation would be a personal replay on the student's screen. Decide how that fits with the live stream.

## 2026-10-21: First feedback on the student prototype

What was said:
1. Screenshot from the topic-sentence task: anh Đậu said "Giờ em viết lại cả câu hoàn chỉnh trong ô viết nhé…" and then **there was no place to type**.
2. **Whenever anh Khoa asks a question**, he should say **"Oke, anh check mọi người hiểu không nè"**, and the **livestream screen should flash a notification**.
3. "Don't code anything yet. Always wait for CLAUDE CODE verbatim (not counting that one)." → added **Rule 2** to RULES.md.

What Claude found:
- Bug 1 cause: the writing box is at the **top** of the panel, above the chat. When anh Đậu asks for a rewrite, the box is unlocked but **scrolled out of sight**, so it looks like there's nowhere to type.
- Proposed fix: a **writing box pinned to the bottom of the panel**, like a chat app (it appears right under anh Đậu's last message whenever he asks for a rewrite, and the panel scrolls to it). The original prompt/formula stays at the top.
- Proposed for 2: before every CCQ / ICQ, anh Khoa says "Oke, anh check mọi người hiểu không nè" (ICQ variant: "…mọi người hiểu cần làm gì không nè"); the stream shows a flashing banner "Câu hỏi mới · trả lời ở bảng bên phải →", and the panel card glows. In a personal re-explanation: "Giờ anh check em hiểu chưa nè".
- No code changed.

Open questions:
- Is the go-ahead phrase now "CLAUDE CODE" or still "CLAUDE COOK"?

## 2026-10-21: The stream can't be personal

What was said:
- Screenshot of the stream board showing a "Phe của em" tag on side B: "there is no way in a live session that we can show which side the student chose, right?"

Claude's answer:
- Right. The stream is **one video sent to everyone**, so it can't show one student's choices. Added as **core principle 5** in README.
- What the student's page *can* do: show personal things **in the panel**, or draw a **personal layer on top of the video** (the video is shared, the layer is the student's own page).
- Places in the prototype that break this and need changing (not coded yet):
  - Ý chính board: "Phe của em" tag on the stream → stream shows both sides neutrally; the panel shows "Phe của em: …".
  - Câu chủ đề board: X filled with the student's side → stream shows **both** X's (A and B); the panel shows the student's X.
  - X ngắn board, Phát triển ý example, "lỗi đi một vòng" example, đoạn mẫu: all use the student's side → stream shows one side chosen by anh Khoa (or both); the student's own version goes in the panel.
  - Top ideas board: "Ý của em" tag → remove from stream; the panel says where the student's idea ranks.
  - Re-explanation: the stream can't pause for one student (noted earlier) → the re-explanation plays as a **personal layer/replay** on that student's screen while the live stream keeps going underneath.
- No code changed.

Open questions:
- Personal stuff: panel only, or also a personal layer on top of the video?
- Is the go-ahead phrase "CLAUDE CODE" or "CLAUDE COOK"?

## 2026-10-21: "Chưa hiểu" should be time-specific and class-level

What was said:
- Screenshot of a re-explanation. When the owner presses Chưa hiểu, **the teacher doesn't react**; it **cuts to a random scene** not related to what was just being taught.
- In practice: the Chưa hiểu bar **goes up slowly**, the teacher sees it, thinks "what was hard there?", then **stops and asks students what they're confused about**.
- Simulate that in the demo: press Chưa hiểu → **show the bar of other students who don't get it going up** → **depending on where we are in the lesson**, the teacher pauses and explains **that part** properly.

Claude's proposal (not coded):
- This also fixes principle 5: the teacher reacts to **the whole class**, on the shared stream. Nothing personal on the video.
- Flow:
  1. Student presses Chưa hiểu → the class bar ("Chưa hiểu: 6%") rises over a few seconds as "others" press too. anh Khoa finishes his sentence.
  2. It crosses 30% → the stream flashes → anh Khoa: "Ơ, khoan đã. Anh thấy nhiều bạn chưa hiểu chỗ này."
  3. "Mọi người chưa hiểu chỗ nào nè?" → quick tap poll in the panel (2 options about **this exact moment** + "Chỗ khác…"). Results fill in live (the demo makes the student's pick the majority).
  4. "À, nhiều bạn chưa rõ … Anh giải thích lại nha." → explanation for that option, on a board about the same thing.
  5. "Oke, anh check mọi người hiểu không nè" + flash → CCQ → the bar drops → "Ok, mọi người hiểu rồi, mình đi tiếp" → continue from where it stopped.
- **During individual work** (writing tasks), the class isn't listening to anh Khoa, so Chưa hiểu goes to **anh Đậu**, personally, in the panel.
- Needs "confusion spots" tied to moments in the lesson (draft list below), each with poll options, an explanation per option, and a CCQ.

Draft confusion spots:
| Part | Spot (the lines it covers) | Poll options |
|---|---|---|
| Chọn phe | Dạng đề Discuss both views | "Discuss both views là gì?" · "2 quan điểm là gì?" |
| Chọn phe | Framework: ủng hộ bên nào nói lợi ích bên đó | "Sao không nói về bên kia?" · "Lợi ích là gì?" |
| Câu chủ đề | Công thức câu chủ đề | "X là gì?" · "Công thức này dùng cho mọi đề à?" |
| Câu chủ đề | of + V-ing | "Giới từ là gì?" · "Sao phải thêm -ing?" |
| Câu chủ đề | X ngắn, không chép đề | "Rút gọn X thế nào?" · "Sao không chép đề được?" |
| Ý chính | Ý chính = 1 lợi ích | "Lợi ích khác ý chính chỗ nào?" · "Nghĩ ra lợi ích bằng cách nào?" |
| Phát triển ý | "Lợi ích này đủ chưa?" | "Đủ là sao?" · "Biện minh nghĩa là gì?" |
| Phát triển ý | Impact / Explain / Example | "Impact với Explain khác gì?" · "Khi nào dùng Example?" |
| Phát triển ý | Lỗi đi một vòng | "Sao câu đó sai?" · "Sửa nó thế nào?" |
| Viết đoạn | 3 phần của đoạn | "Ghép 3 phần thế nào?" · "Firstly đặt ở đâu?" |

Open questions:
- OK with this flow and the spots? Should the student's pick decide the explanation in the demo?
- Is the go-ahead phrase "CLAUDE CODE" or "CLAUDE COOK"?

## 2026-10-21: Personal help vs. teacher pause: which one?

What was said:
- "Or was your idea to take the student out entirely and focus on their problem by themselves, and not for the teacher to pause and explain for the whole class? That could be good actually… what do you think?"

Claude's view:
- Personal (pull the student out): nobody waits and each student gets exactly their gap, **but** they miss what anh Khoa says meanwhile, and the teacher loses the signal (the original idea #1).
- Teacher pause: uses anh Khoa's live strength and fixes a shared problem once, **but** it interrupts students who understood, and a student with a rare confusion gets nothing.
- **Recommendation: both, decided by how many are confused.** This is the core idea from day one: AI looks after each student, the teacher looks after the crowd.
  - Student presses → **anh Đậu helps right away in the panel** (short explanation of what was just said + a CCQ). The stream keeps playing next to it, so the student isn't pulled out and doesn't miss much.
  - If the class bar crosses the threshold (e.g. 30%) → **anh Khoa pauses for everyone**: asks what's confusing, explains, checks.
- Demo idea: a small switch "Kịch bản: ít bạn chưa hiểu / nhiều bạn chưa hiểu" so the boss sees both paths.

Open questions:
- Go with the hybrid? Add the scenario switch to the demo?
- Is the go-ahead phrase "CLAUDE CODE" or "CLAUDE COOK"?

## 2026-10-21: How does anh Đậu know what to explain?

What was said:
- "How will anh Đậu know what they don't understand? And what anh Khoa said? Does that mean there need to be planned common questions?"

Claude's answer:
- **What anh Khoa said:** a live **transcript** of the stream (speech-to-text; speaking-intensive already has a speech-to-text route) plus **what's on the board** (the lesson's slides from prep). When the student presses, anh Đậu takes the last ~60–90 seconds, matched to the point the student was watching (streams run a few seconds behind).
- **What the student doesn't understand:** anh Đậu **doesn't guess, he asks** (Socratic, taps): "Em chưa rõ chỗ nào nè?" with 2–3 options + "Chỗ khác…" (type a question).
- **Where the options come from, in layers:**
  1. **Planned common confusions** for the hard moments (best: reliable, checked by the teacher, instant, cheap). The lesson builder drafts them in prep together with the lesson; many repeat across lessons (e.g. of + V-ing), so prep stays short.
  2. **AI-made options from the transcript** for moments nobody planned.
  3. **"Chỗ khác…"**: the student types; anh Đậu answers from the transcript + board.
- **Loop back:** everything students ask is logged → the teacher sees it, and it becomes next lesson's planned confusions.
- So planned questions aren't strictly required, but they should be the backbone; AI covers the gaps.
- In the demo: the script lines stand in for the transcript; the "confusion spots" table (above) is the planned list; "Chỗ khác…" is answered by live AI using the recent captions.

## 2026-10-21: Speech-to-text cost

What was said:
- "Speech to text is REALLY expensive, and for a one hour stream? That'd be crazy."

Claude's answer:
- The stream would be transcribed **once**, centrally, not once per student. So it's one hour of audio per class, whatever the class size.
- Rough list prices Claude knows of (to be checked before deciding): hosted Whisper-type APIs are about **$0.04–$0.40 per hour of audio** depending on provider (Groq at the low end, OpenAI/ElevenLabs higher). At 2–3 streams a week that's cents to a few dollars a month. The real per-student cost is the **AI tutor calls**, not the transcript.
- **But we may not need it at all for version 1.** anh Đậu can know "what anh Khoa just said" from what's already planned:
  - the **activity / slide currently on screen** (the stream-deck button anh Khoa pressed is a free signal), plus
  - the **teacher's notes for that slide** from prep, plus
  - the **planned common confusions** for that moment.
- Options, cheapest first:
  1. **No speech-to-text:** slide + notes + planned confusions. "Chỗ khác…" answered from the slide notes. (Recommended for v1.)
  2. **Transcribe only when needed:** keep the last ~90 s of audio and transcribe it only when students press Chưa hiểu, once per window, shared by everyone who pressed.
  3. Full live transcript: only if 1–2 aren't good enough.

## 2026-10-21: Transcript parked; YouTube auto-captions?

What was said:
- **For the demo we don't need a transcript.** Think about it later.
- "If we go live on YouTube, it has auto transcript, no?"

Claude's answer (from memory; to be checked when we get there):
- YouTube can show **automatic live captions to viewers**, but language support for *live* auto-captions is limited (English is solid; Vietnamese live support needs checking).
- **Our page probably can't read them live.** The embedded YouTube player is a separate site inside the page, so its caption text isn't readable by our code. The YouTube API's caption download is meant for finished videos the channel owns, not a live feed.
- After the stream, YouTube's auto-captions for the recording could be downloaded by the channel owner. That's useful for recaps and next-lesson prep, not for live help.
- Parked with the rest of the streaming tech.

## 2026-10-21: CLAUDE COOK: student prototype version 2

What was said:
- **CLAUDE COOK** (so the phrase is still CLAUDE COOK; Rule 2 updated).

What was done (same link: https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF, now version 2):
1. **Writing box pinned to the bottom of the panel.** When anh Đậu asks for a rewrite, it lights up with "Sửa câu của em ở đây rồi gửi lại nha ↓" and the panel scrolls to it.
2. **Question notice.** Before every CCQ / ICQ anh Khoa says "Oke, anh check mọi người hiểu không nè", the stream flashes "Câu hỏi mới · trả lời ở bảng bên phải →", and the question card glows.
3. **The stream is the same for everyone.** No more "Phe của em" / the student's X / "Ý của em" on the boards; boards show both sides or phe A as anh Khoa's example. The student's own version is in the panel (X của em, ví dụ cho phe của em, ý của em, đoạn mẫu phe B).
4. **Time-specific, hybrid Chưa hiểu**, with a class meter on the stream ("Cả lớp chưa hiểu", 30% line) and a demo switch "Kịch bản":
   - **Nhiều bạn chưa hiểu:** the meter climbs past 30% → flash → anh Khoa: "Ơ, khoan đã…" → class poll in the panel (results fill in, also on the stream) → explanation of the picked confusion → "Oke, anh check mọi người hiểu không nè" + CCQ → meter drops → "Ok, mình đi tiếp".
   - **Ít bạn chưa hiểu** (and always during individual work): anh Đậu helps privately in the panel; the stream keeps going.
   - "Chỗ khác…" → typed question, answered by live AI from anh Khoa's recent lines (offline: the spot's explanation).
5. 11 confusion spots with 22 explanations + CCQs (listed in LESSON-01-script.md).
- Tested in a headless browser: the whole lesson with one class pause (topic sentence) and one private help (main idea), writing box, rewrite, recap. No errors.
- Not tested here: live AI replies (only inside claude.ai).

## 2026-10-21: Timers on questions

What was said:
- "There should be a timer too, right? If students don't choose, the AI will say the answer."

Claude's proposal (not coded; waiting for CLAUDE COOK):
- **anh Khoa's questions (CCQ / ICQ) get a countdown**, like Kahoot: ~15 s for a CCQ, ~10 s for an ICQ. A ring counts down on the question card, and the stream shows "Còn 12s".
- **When time's up:**
  - The answer is revealed for everyone on the stream, with the class result ("72% chọn đúng"). This is shared, so it fits principle 5 and gives anh Khoa a signal.
  - In the student's panel: right / wrong / "Em chưa trả lời", plus a one-line *why* from anh Đậu if they missed it.
  - The recap counts "chưa trả lời" separately.
- **Class poll** ("Mọi người chưa hiểu chỗ nào?"): ~15 s, then the majority decides.
- **Writing tasks get a longer, visible timer** (e.g. topic sentence 3 min, ideas 2 min, develop 3 min, paragraph 8–10 min). When it ends, anh Khoa moves on; the student's draft is kept and anh Đậu can still give feedback (in the panel or recap). No "answer" is given; a model is shown instead.
- **No timer on anh Đậu's private help or chips.** That's the student's own pace; pressure there doesn't help.
- In the demo, timers follow the speed control.

Open questions:
- Are those timer lengths OK?
- Should a student who missed or got it wrong automatically get anh Đậu's one-line explanation?

## 2026-10-21: anh Khoa's "wrap it up" button

What was said:
- "anh Khoa will have a button that will tell anh Đậu to wrap it up, right?"

Claude's answer:
- Yes. This fits principle 4 (the teacher is in control). **The timer is only a suggestion on anh Khoa's dashboard; the button decides.**
- **anh Khoa's dashboard** shows the time and how many students have submitted, and it suggests "Chốt?" when the timer ends or ~80% have submitted. anh Khoa presses **Chốt (wrap up)** when he's ready.
- **What students see when he presses it:**
  - a 30-second warning: "anh Khoa sắp chốt · còn 30s"
  - anh Đậu finishes his current point in one line (no new issues), saves the draft, shows the model, and puts unfinished notes into the recap
  - then the class moves on together
- Same idea for questions: **"Hiện đáp án" (reveal answer)** is anh Khoa's button; the countdown is the default.
- **In the student demo** (no teacher side yet): the timer plays anh Khoa pressing the button, plus a demo button under the stream, "anh Khoa bấm: Chốt", so the owner can try it any time.
