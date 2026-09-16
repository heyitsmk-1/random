# Speaking PRO — curated daily practice

A prototype of the *program*, not a single exercise: you arrive, you're told
what to work on and why, you practise, and what you did counts toward something.

## The three ideas, as built

**1. Goals — daily personal, weekly/monthly collective.** Daily targets live on
your own device. The weekly and monthly targets are genuinely shared: every
viewer's correct instances are summed into one live number.

**2. A curated arrival.** The entry point is not a menu. It opens with one
recommendation and the reason for it — *"you dropped -ed on 11 of 34 past-tense
verbs last week"* — with the three Parts underneath as the format you'd take it
in. A menu of three buttons is a choice; a recommendation with evidence is
curation.

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
| "Last week you dropped -ed 11 times" | **staged** — needs history from the real backend |
| Part 2 and Part 3 | **stubs** — only Part 1 runs |

## Honest limit on the metrics

Counting **grammar** from a transcript is easy and is what this does. Counting
**sounds** — "500,000 correct /s/ sounds" — is a different problem: it needs
phoneme-level scoring on the audio, not text. The community metrics here are
grammar-based and labelled as such in the UI.

## Styling

Every colour and typeface is a token in the block at the top of `index.html`,
marked `RESTYLE HERE`. Nothing below it hardcodes a colour. Dropping in Speaking
Intensive's palette and faces is one edit.

## Not wired up

`DATABASE_URL`, `ELEVENLABS_API_KEY` and `OPENROUTER_API_KEY` are unused here.
A published artifact is client-side and can't reach a Postgres box or hold a
secret; the recommendation engine and the real feedback engine need a server in
front of them.
