# Livestream

Project folder for the Livestream project.

**Status:** Student-side prototype live: https://claude.ai/artifact/AbFNQCpDezdomNnZZMWVTF (see [prototype/student-live/](prototype/student-live/)). Earlier: a PowerPoint vision deck.

## Files in this folder

| File | What it's for |
|------|---------------|
| [README.md](README.md) | This overview: what the project is and where things live. |
| [prototype/student-live/](prototype/student-live/) | **The student prototype** (web page, version 3): voiced auto-playing lesson, timed questions, Chốt, class/private help, live AI tutor, early-finisher review, recap. |
| [prototype/Livestream-Prototype.pptx](prototype/Livestream-Prototype.pptx) | **The vision prototype:** 10 slides showing what the student sees next to what the teacher sees, step by step. |
| [prototype/build_deck.js](prototype/build_deck.js) | Script that builds the deck. Edit and re-run it to change the slides. |
| [reference/design-notes.md](reference/design-notes.md) | YouPass brand + UX principles that every design must follow. |
| [reference/speaking-intensive-notes.md](reference/speaking-intensive-notes.md) | How the existing speaking AI tutor works and what Livestream can reuse. |
| [PLAN.md](PLAN.md) | **Start here.** The big picture on one page: the system, a class minute by minute, roadmap, decisions waiting. |
| [LESSON-01-script.md](LESSON-01-script.md) | **The full Lesson 1 script** for the student prototype: explanations, re-explanations, CCQs, ICQs, tasks, AI tutor rules. |
| [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md) | Draft of the first lesson (Writing Task 2, developing ideas) for the prototype. |
| [GAPS.md](GAPS.md) | Things not yet decided or covered, grouped by when they need answering. |
| [IDEAS.md](IDEAS.md) | Brainstorm of possible features. Nothing in it is decided yet. |
| [RULES.md](RULES.md) | The running list of rules for working on this project. New rules get added as we go. |
| [NOTES.md](NOTES.md) | A dated log of everything the project owner has said or decided, so nothing gets forgotten between sessions. |
| [CLAUDE.md](CLAUDE.md) | Instructions Claude Code loads automatically when working in this folder. Points Claude at the rules and notes. |

## Core principles (owner, 2026-10-19)

The project in its simplest form. Every feature should follow these.

1. **Teacher teaches, students respond instantly.** Students answer with taps and quick tech interactions, not long typing, because typing takes a long time.
2. **Anonymous.** Students' responses are anonymous to the class, which lowers the barrier to joining in.
3. **AI feedback modelled on a real teacher.** Not a big list of mistakes and "go fix it". Slow and Socratic: one thing at a time, with guiding questions so the student fixes it themselves.
4. **The teacher is in control, not a script** (owner, 2026-10-21). The lesson plan is a suggestion; the teacher decides what to launch next, live.
5. **The stream is the same for everyone** (owner, 2026-10-21). The video can't show anything about one student (their side, their idea, their answers). Anything personal goes on the student's own screen: the panel, or a personal layer the student's page draws on top of the video.

All visuals follow the YouPass brand and UX principles: see [reference/design-notes.md](reference/design-notes.md).

## What the project is

A livestreamed **IELTS** class on the owner's website, **youpass.vn**. It may eventually cover all four skills (Listening, Reading, Writing, Speaking).

- The class is **free and open to everyone**, so it will be very large.
- **Problem 1:** with that many students, the owner can't manage everyone.
- **Problem 2:** a talking-head livestream is boring.
- **Goal:** build something different that solves both problems. Options are being brainstormed in [IDEAS.md](IDEAS.md).
- **Teacher:** anh Khoa. The AI tutor speaks as "TA of anh Khoa".
- **Built on:** the company AI gateway and youpass.vn logins (same as speaking-intensive).
- **Approach:** roll out something small fast, get feedback, then build more.
- **First version:** a Writing Task 2 mini lesson on developing ideas (owner's pick: it's what most students want to learn). See [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md). Open items are in [GAPS.md](GAPS.md).
