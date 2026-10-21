# What we learned from speaking-intensive

Source: `speaking-intensive-main.zip`, uploaded by the owner on 2026-10-21.
**The code itself is NOT copied into this repo** (company code). These are Claude's notes on how it works and what Livestream can reuse.

## What it is

- A Next.js web app at **speaking-intensive.youpass.vn**. It serves the IELTS Speaking lesson players (26 lessons, codes `1.1` to `6.5`) and "Speaking PRO" topic practice.
- **It already plugs into the youpass.vn LMS:** the LMS asks "does this lesson exist?" and redirects the student to the lesson link (`docs/LESSON_PAGES.md`).
- **Students are already known:** the `users` table has a `youpass_id`, name, email and phone. There's a login/refresh flow.
- **AI already runs through a company gateway** (`TECH_PROXY_BASE_URL` / `TECH_PROXY_API_KEY`), mainly Gemini Flash models, with OpenRouter as a fallback. So the company already has AI keys and infrastructure.
- **A teacher dashboard exists** (`app/dashboard`): stats, transcripts, report cards, token-use charts.
- Every AI call is logged (`api_logs`), and there's per-answer AI feedback storage (`ai_feedbacks`).

## How the AI tutor coaches (the "Socratic" design)

The main prompt is `lib/prompts/socratic-apply.ts`. In short:

| Rule | What it means |
|---|---|
| **Persona** | "TA of anh Khoa" (anh Khoa teaches in the video). ~90% Vietnamese, warm, "mình / bạn". Never calls itself an AI. |
| **Texting style** | Short chat bubbles (1 sentence, ~6–14 words each), max 4–5 per turn. |
| **Chips everywhere** | Most questions come with 2–4 tap-able answers, so students don't have to type. An "ý khác" chip opens a typing box. |
| **Priority order** | Check **Structure (the lesson's framework)** first, then **Vocab**, then **Grammar**. Fix **one issue per turn**. |
| **Vocab fix** | Quote what they said, ask what they meant, offer 2–3 natural phrases as chips. |
| **Grammar fix** | Quote the sentence, 1-line why it's wrong, chips with 2–3 complete fixes + "Mình không chắc". |
| **Redo once, at the end** | Fix all issues one by one; only then *invite* (never force) one full redo. Max one retry per error. |
| **No dead ends** | Every turn ends with a question + chips, a mic invite, "Okay 👍 / Chưa hiểu", or done. |
| **Honest praise** | Say exactly what was good. No "Tuyệt vời!", "xuất sắc" hype. |
| **No invented errors** | Don't fix what isn't wrong; style variants aren't errors. |
| **Stay in the framework** | Idea hints only follow the lesson's framework (the "FOCUS" block per question). The video teaches; the tutor doesn't lecture. |
| **Level** | Vocab for band 5.0–6.5; each word with IPA, rough pronunciation and a simple English definition. |
| **Student settings** | Correction level (nhẹ tay / vừa / sửa kỹ) and style (Socratic hints by default, or direct fixes). |

**Output format:** the AI always returns JSON:
`{ "lines": [...], "phase": "...", "action": "record|chips|choice|done", "chips": [...], "notes": [{ "you_said", "actually", "category" }] }`
The `notes` are hidden from the student and saved.

**Report card (student memory):** after each session, the notes update a per-student report card: recurring errors (with how many times, and active / improving / resolved), vocab learned, and strengths. Next session the tutor reads it: if an old error comes back it says "this is the one from last time"; if it doesn't, it gives one line of praise.

## What Livestream can reuse

1. **The tutor's brain, almost as-is.** Same JSON format, same one-issue-at-a-time rules, same chips. For each lesson step we write a **FOCUS block** (the Task 2 framework for that step: the topic sentence template, "give benefits", Impact / Explain / Example).
2. **Chips = our "tap, don't type" principle.** The tutor is already built that way.
3. **`notes` → the teacher's live "most common mistake".** Each student's hidden notes, grouped across the whole class, are exactly the data the teacher dashboard needs.
4. **Report card → the recap page and next class.** The livestream can write to the same report card, so the anh Đậu recap page and future classes know each student's recurring mistakes.
5. **Logins:** reuse the existing youpass.vn accounts (`youpass_id`).
6. **AI access:** reuse the company AI gateway instead of a new API key (needs the company's OK).

## What has to change for a live writing class

- **Writing, not speaking:** the speaking-only rules ("never comment on punctuation or spelling", fluency, pronunciation, words per minute) don't apply. Spelling and punctuation matter a bit in writing.
- **The teacher sets the pace:** today a practice ends with "back to the video". Live, the teacher's **Next step** button ends it: the tutor must wrap up quickly, and unfinished work is kept.
- **Thousands at once:** today it's one student at a time. Live, thousands of students answer in the same minute, so the gateway has to handle the burst (and cost).
- **Keep one issue per turn:** Speaking PRO allows up to 3 fixes per turn; for the livestream we stick to the course mode (one thing at a time), per core principle 3.
- **Persona:** "TA of anh Khoa" fits if the livestream teacher is anh Khoa; otherwise the name changes.
