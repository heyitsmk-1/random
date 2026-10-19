# Livestream: The Big Picture (draft for review)

One page to see the whole project at once. **Everything here is a draft.** Mark it up, cross things out, and tell Claude what to change.
Details live in the other files; this page links to them.

---

## 1. The vision in one sentence

> A free IELTS livestream where **the teacher teaches the crowd, every student answers with a tap, and AI coaches each student one step at a time**, so a huge class feels personal and never boring.

## 2. The three core principles

1. **Teacher teaches, students respond instantly.** Taps, not long typing.
2. **Anonymous.** Easy to join in, no fear of looking stupid.
3. **AI coaches like a real teacher.** One thing at a time, with questions. Never a big list of mistakes.

---

## 3. The whole system on one screen

```
   BEFORE CLASS                 DURING CLASS                          AFTER CLASS
 ┌──────────────┐   ┌─────────────────────────────────────────┐   ┌──────────────────┐
 │ LESSON       │   │                                         │   │ CONSOLIDATION    │
 │ BUILDER      │   │  TEACHER ──teaches──► STREAM (video)    │   │ PAGE (anh Đậu)   │
 │              │   │     ▲                     │             │   │                  │
 │ Teacher      │   │     │ summaries           ▼             │   │ One page per     │
 │ pastes an    │──►│  TEACHER            STUDENT SCREEN      │──►│ student: their   │
 │ essay prompt │   │  DASHBOARD  ◄─taps── (phone/laptop)     │   │ side, sentences, │
 │ → AI drafts  │   │     ▲                     │             │   │ ideas, paragraph │
 │ the content  │   │     │                     ▼             │   │ + feedback       │
 │ → teacher    │   │     └─── reports ─── AI TUTOR           │   │                  │
 │ approves     │   │                     (1-on-1, Socratic)  │   │                  │
 └──────────────┘   └─────────────────────────────────────────┘   └──────────────────┘
     ~10 min                     ~60 min (guess)                     automatic
```

### The five pieces

| Piece | Who uses it | What it does | Status |
|---|---|---|---|
| **Lesson builder** | Teacher, before class | Paste a new essay prompt → AI drafts the Gợi ý ideas, model sentences, expected mistakes → teacher checks in ~10 min. Needed because streams run 2–3×/week. | Suggested |
| **Student screen** | Every student | Shows the current step: buttons to tap, a box to write in, the confusion button, the AI tutor's questions. | Decided |
| **AI tutor** | Every student, one-on-one | Socratic coaching on what the student writes. Reports mistakes to the teacher. | Decided |
| **Teacher dashboard** | Teacher, during class | Live summaries: side split, confusion %, most common mistake, top ideas, strong examples. "Next step" button moves every student on. | Decided (layout not designed) |
| **Consolidation page** | Every student, after class | Personal recap built from what they did in class. Reuses the existing anh Đậu page (`student-page/`). | Decided |

---

## 4. A class, minute by minute (Lesson 1: developing ideas)

Topic: *study all subjects vs. only the subjects they're good at or interested in.*
**Times are guesses** for you to adjust. The **confusion meter** runs the whole time.

| # | Step | ~Min | Teacher | Student | AI | Teacher sees |
|---|---|---|---|---|---|---|
| 1 | **Pick a side** | 2 | Shows the prompt | **Taps** a side | Remembers the side | Live split, e.g. 62% / 38% |
| 2 | **Topic sentence** | 12 | Teaches the template: *"I am personally in favor of X because it brings about many significant benefits."* | **Writes** one sentence | Socratic hints, one at a time | **Most common mistake** → teaches the fix |
| 3 | **Ideas** | 10 | Explains: give benefits | **Types** an idea or **taps** a Gợi ý idea | Groups similar ideas | **Top ideas** with counts |
| 4 | **Develop an idea** | 15 | Picks one idea per side; teaches: *is this benefit enough?* → Impact / Explain / Example | **Taps** a path, **writes** 1–2 sentences | Asks the core question, hints | Path split + common problems |
| 5 | **Body paragraph** | 15 | Lets them write | **Writes** the whole paragraph | Checks one issue at a time | Common problems + a strong paragraph to show on stream |
| 6 | **Wrap-up** | 3 | Recaps the lesson | Gets their link | Builds each student's page | n/a |
| | **Total** | **~57** | | | | |

Full detail: [LESSON-01-develop-ideas.md](LESSON-01-develop-ideas.md)

---

## 5. Roadmap

| Phase | Goal | What's in it | Needs |
|---|---|---|---|
| **0. Vision demo** | Show the boss the vision | One clickable page: student screen + teacher dashboard side by side, a **fake class** of a few hundred students filling the dashboard, scripted AI, and a sample consolidation page. Maybe a glimpse of the lesson builder. | CLAUDE COOK |
| **1. First real class** | Test with real students, get feedback | Lesson 1 for real: live AI, real student screens, teacher dashboard, consolidation pages. | API key; how students log in; the speaking-intensive tutor prompt; lesson content |
| **2. Every week** | Run 2–3 classes a week without burning out | Lesson builder; a mistake list that carries over between lessons. | Feedback from phase 1 |
| **3. Grow** | More of IELTS, more fun | Other Task 2 skills, then other IELTS skills; quizzes, teams, leaderboard, mistake video clips (see [IDEAS.md](IDEAS.md)). | Phase 2 working |

---

## 6. Decisions waiting on you

Most important first. Full list: [GAPS.md](GAPS.md).

| # | Question | Why it matters |
|---|---|---|
| 1 | **Scripted or live AI for the vision demo?** | Scripted can't fail in front of the boss; live needs an API key. |
| 2 | **Lesson builder in the demo?** | Shows the boss the teacher's side is sustainable at 2–3×/week. |
| 3 | **Which idea goes in the step 5 paragraph:** the teacher's from step 4, or the student's own from step 3? | Decides whether step 3's work is used. |
| 4 | **Screen and AI language:** Vietnamese, English, or both? Student level? | Changes every screen and how hard the hints are. |
| 5 | **How do students get the speaking-intensive tutor's rules to Claude?** | The AI tutor is meant to work like it. |
| 6 | **Show student answers on stream?** Anonymous or nicknames? | Fits the anonymity principle, needs a yes/no. |
| 7 | **Co-host?** Can you teach and read the dashboard alone? | Affects how busy the dashboard can be. |

## 7. Parked (on purpose)

- The technical side of streaming (how video gets to youpass.vn).
- Logins, cost at scale, safety, privacy: needed before phase 1, not for the demo.
