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
