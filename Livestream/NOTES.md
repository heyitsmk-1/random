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
