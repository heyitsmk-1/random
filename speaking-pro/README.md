# Speaking PRO — curated daily practice

A prototype of the *program*, not a single exercise: you arrive, you're told
what to work on and why, you practise, and what you did counts toward something.

## The three ideas, as built

**1. Goals — daily personal, weekly/monthly collective.** Daily targets live on
your own device. The weekly and monthly targets are genuinely shared: every
viewer's correct instances are summed into one live number.

**2. A curated arrival — its own screen, and a conversation.** Opening PRO does
not land you on a dashboard. The TA greets you and *asks*, in bubbles and chips,
exactly as in a lesson:

> Heyy there — welcome back! 👋
> Hôm nay mình cùng nhau luyện gì đây? 😄
> Mình vừa xem lại report card của bạn nè.
> Tuần trước bạn bỏ mất đuôi **-ed** ở **11 trên 34** động từ quá khứ…
> Hay hôm nay mình sửa đúng cái đó nhé?
>
> `Ừ, luyện past simple 🎯`  `Cho mình cái khác`  `Mình tự chọn phần`

"Cho mình cái khác" makes the TA find a second focus; "Mình tự chọn phần" opens
Part 1 / 2 / 3. Three screens in total — **welcome → practice → progress** — and
the goals and community counters live on progress, which is also where a finished
session lands, so the numbers you moved are the payoff rather than the lobby.

A menu of three buttons is a choice. Being asked, with a reason, is curation.

**3. Socratic repair.** A flagged error hands back a question, never a verdict:
*"You said 'I stay'. But that's finished, isn't it — happening, or done?"*
The student produces the right form themselves, so a **self-correction scores
double** and is tracked as its own goal.

## The ledger

Everything counted is one typed event: `past_simple`, `third_s`, `plural_s`,
`answered`, `self_fix`. Daily goals, the community counters and the end-of-session
summary are all just queries over that one stream. A new goal is a new query, not
new plumbing. This is the piece worth keeping whatever happens to the UI.

## What is real and what is staged

| | |
|---|---|
| Socratic rules | real — 4 rules, run against whatever you type or say |
| Counting | real — derived from the transcript |
| Community counters | real and shared, seeded with a starting number so the bars aren't empty |
| Daily goals / streak | real, but `localStorage`, so per-device |
| "Last week you dropped -ed 11 times" | **staged** — the real source is the report card behind `/api/recap`, the same one the players read for "🔁 Bài trước bạn mắc lỗi …" |
| Part 2 and Part 3 | **stubs** — only Part 1 runs |

## Honest limit on the metrics

Counting **grammar** from a transcript is easy and is what this does. Counting
**sounds** — "500,000 correct /s/ sounds" — is a different problem: it needs
phoneme-level scoring on the audio, not text. The community metrics here are
grammar-based and labelled as such in the UI.

## Styling — matched to Speaking Intensive

Tokens are lifted verbatim from `engine_v1.html` so PRO sits next to the lesson
players instead of looking like a different product: Nunito + Montserrat,
`--accent #FF6D3A`, the iOS-ish grey ramp, the 6/10/14 radii and the three
shadows. Components follow the players' idioms too — orange student bubble on
the right with the clipped top-right corner, white TA bubbles on the left, and
pill chips with a 1.5px accent border.

The practice view is the players' **chat**, not a form. Repairs use chips exactly
as BRANCH C does: quote the phrase, one line of why, two or three complete fixes
plus a "Mình không chắc" escape. That matters pedagogically — the student picks
the right form instead of being handed it — and practically, because chips are
how the real engine avoids making students type.

Also carried over from the engine, because they are decisions and not details:

- **Priority order** Structure → Vocab → Grammar, exactly one drilled per turn.
- **The 25-word Part 1 floor** is checked *before* grading. A six-word answer is
  not a Part 1 answer, and correcting its grammar teaches the wrong lesson.
- **The re-record interlock** — "nói lại cả câu?" is offered at most once per
  question, never forced.
- **Mastery lines** `✅ Bạn đã nắm được: …` after each repair.
- **No intensifiers.** "Ổn rồi" and move on; praise names what was good.

Reference copies of the handoff docs are in `reference/`.

## Not wired up

`DATABASE_URL`, `ELEVENLABS_API_KEY` and `OPENROUTER_API_KEY` are unused here.
A published artifact is client-side and can't reach a Postgres box or hold a
secret; the recommendation engine and the real feedback engine need a server in
front of them.
