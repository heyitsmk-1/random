# Lesson-building pipeline (draft, being learned)

**Goal:** a repeatable way to turn "anh Khoa wants to teach X" into a lesson the teacher page, student page and anh Đậu can run.
Streams happen 2–3 times a week, so building a lesson must be fast.

**How this file grows:** we build the first real-class lesson **in chat**, and every step we take is logged in [BUILD-LOG-real-class-01.md](BUILD-LOG-real-class-01.md).
After the class, the steps that worked become the framework here (with templates). Steps that were slow or skipped get cut or merged.

Started 2026-10-26. Owner's words: "We also need to build a pipeline to build a lesson, right? So document us building one just through our chat messages, so we can build the framework for lesson building in future."

---

## Stages (first guess, will change)

Each stage: what goes in, what comes out, who does it.

| # | Stage | Output | Who |
|---|-------|--------|-----|
| 0 | **Brief** | Class facts: who, how long, level, skill, date, platform | anh Khoa answers ~8 questions |
| 1 | **Goal** | One sentence: "After class, students can …" + how we'll know | anh Khoa, Claude drafts |
| 2 | **Teaching point** | The formula / framework / rule being taught (e.g. "ủng hộ bên nào → nói lợi ích") | anh Khoa |
| 3 | **Lesson flow** | 4–6 parts, each = explain → check → do | Claude drafts, anh Khoa edits |
| 4 | **Activity bank** | For each part: CCQs, ICQs, polls, tasks (stream-deck buttons), planned + spare | Claude drafts |
| 5 | **Script** | What anh Khoa says: explanation, re-explanation, model answers, Gợi ý | Claude drafts in anh Khoa's voice |
| 6 | **Confusion spots** | Where students will likely get lost + the class / private answer for each | Claude + anh Khoa |
| 7 | **anh Đậu's rules** | What's accepted, the order of errors per writing task (TEACHER_RULES) | anh Khoa decides, Claude writes |
| 8 | **Extras** | Recap points, spot-the-error bank, waiting-screen content | Claude |
| 9 | **Tracking plan** | What we want to learn from this class (questions → events) | anh Khoa + Claude |
| 10 | **Load + dry run** | Lesson file loaded into the pages, anh Khoa clicks through once | anh Khoa |
| 11 | **After class** | What students did / got stuck on → fixes for next time | Claude reads the data |

Later: stages 3–8 become a **lesson file** (one structured file per lesson) that the pages read, and a **lesson template** for new topics.
