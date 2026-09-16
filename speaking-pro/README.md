# Speaking PRO — curated daily practice

A prototype of the *program*, not a single exercise: you arrive, you're told
what to work on and why, you practise, and what you did counts toward something.

## The three ideas, as built

**1. Goals — daily personal, weekly/monthly collective.** Daily targets live on
your own device. The weekly and monthly targets are genuinely shared: every
viewer's correct instances are summed into one live number.

**2. Walked through, not clicked through.** The design rule: it should feel like
someone is taking you somewhere, not like you are picking buttons off a screen.
Choosing the session runs a wave wipe right to left, and the screen changes
behind the crest rather than cutting.

Loading screen → menu → **briefing** → practice. Three rows on the menu, not five:

```
BUỔI HỌC HÔM NAY  [đã chọn sẵn]     │  NHIỆM VỤ
Kể một chuyện đã xảy ra mà           │  Ngày · Tuần · Tháng
không rơi mất đuôi -ed               │
                                     │  Trả lời 10 câu     6/10
LUYỆN TỰ DO                          │  15 past simple     9/15
THƯ VIỆN LỖI   4 đang mở             │  Tự sửa 3 lỗi       1/3
```

Part 1 / 2 / 3 are no longer top-level. Offering three Parts as modes *is*
"clicking random buttons" — a part is a format, not a reason to practise. The
real split is **guided** (chosen for you, one outcome) versus **free** (you pick,
no agenda), and free practice opens its Parts underneath its own row.

**The briefing is the transition.** Choosing the guided session does not cut to a
question. It goes to a short screen that names the one thing this session is for
— stated as something you will be able to do, not a grammar label — the evidence
behind it, and what is about to happen:

> **Kể một chuyện đã xảy ra mà không rơi mất đuôi -ed**
> Tuần trước bạn bỏ mất đuôi -ed ở 11 trên 34 động từ quá khứ.
> ① 5 câu hỏi Part 1, chủ đề Days off
> ② Mỗi câu mình chỉ soi đúng một lỗi — không sửa lung tung
> ③ Khoảng 6 phút
> **Bắt đầu**

`SESSION` holds that outcome and everything downstream reads it, so a session
cannot quietly become about five things. The practice header carries the outcome,
not the grammar point.

Screens cross-fade and the briefing's lines stagger in, so the walk-in has a pace.
All of it collapses to a cut under `prefers-reduced-motion`.

**3. The lesson: answering with examples.** One outcome — *trả lời có ví dụ thật
của riêng bạn, không nói chung chung* — over six questions on six different
topics, so six different stories are needed and none can be reused.

Đậu says hello (3s), says what today is about (5s), then the framework floats up:
direct answer → general example → specific example, each with the worked example
from the brief. Then six questions.

**Priority order is IDEA → FLUENCY → VOCAB → GRAMMAR**, one drilled per turn.
Idea comes first here because the lesson is about *what* you say: a clean sentence
with no example still fails the thing being taught.

Detection is of an *absence*, which is the interesting part. An answer counts as
having an example when it carries a signal phrase (*for example, once, I remember*)
or a concrete time marker (*last year, when I was, the other day*); it counts as
**specific** when that lands alongside two or more past-tense narrative verbs.
Generic present-tense breadth — "I can go to the beach, I can go on a picnic" —
reads as a general example and gets pushed one step further, not marked wrong.

Every beat hands back a question:

> Direct answer ổn rồi 👌 Nhưng mình vẫn đang hình dung chung chung.
> **Lần gần nhất** chuyện đó xảy ra là khi nào?
> `Năm ngoái`  `Hè vừa rồi`  `Hồi mình còn đi học`  `Mới gần đây thôi`

**Five seconds of silence and a hint offers itself** — ideas and vocabulary for
that question, on a button rather than pushed at them, so it stays their choice.

**The report card** scores three marks a question: DA (direct answer), VD (có ví
dụ), CT (chuyện cụ thể) — 18 total. It stores `exampleRate`, which is what lets
the recommender bring this lesson back when the rate is low.

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
