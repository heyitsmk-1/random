# Days off — question 1

A speaking-practice scene, not a quiz. Two friends talk about days off at a café
table; you are the third seat. They turn and ask you; you answer out loud.

The bet is that feedback should be a **conversational move**, not a report. Two
moves, split between the characters:

- **Linh rescues, mid-turn.** You grope for a word, she supplies it as a guess —
  *"Oh — Reunification Day? The thirtieth of April?"* — then confirms and extends,
  the way a real person does. Face-saving, and it hands you the word while you
  still need it.
- **Minh repairs, after the turn.** *"You said X — did you mean Y? because…"*
  Delayed, so it never kills your turn.

Nothing is scored. The scene just keeps going.

## Where the feedback lives

On the table, not on a results page. The **dictionary** collects the words Linh
handed you; the **notebook** collects Minh's corrections (`did a mistake → made
a mistake`, plus why). Both start empty and fill as you talk.

## Rules that matter

- **One repair per turn, maximum.** Correcting everything is the 3-minute
  feedback page, just read aloud.
- **A repair is a question, never a verdict**, and Linh's follow-up is written so
  you naturally re-use the corrected word.
- **A pause is only a stall if the sentence is still hanging.** `looksUnfinished()`
  checks the tail before Linh interrupts; a beat between two finished clauses is
  not an invitation.
- **Bubbles point at whoever is speaking.** `HEAD` holds each character's real
  position in the frame and `aimTail()` re-aims the tail as the bubble grows, so
  it keeps pointing at the speaker rather than at a fixed spot.
- **Rescues are pre-rendered.** They have to land inside about a second.
  Generating one on demand arrives long after the moment has passed.

Timings: stall at 1100 ms, end-of-turn at 2600 ms (`STALL_MS`, `ENDTURN_MS`).

## Running it

Any static server — `python3 -m http.server` in this directory. Speech uses the
browser's `SpeechRecognition` where available (Chrome/Edge); everywhere else you
type, which runs the identical detectors and stall clock. "Watch a run-through"
plays a canned answer containing a real 1.7 s stall, so it exercises the live
detector rather than faking the result.

## What is scripted vs. live

Everything voiced is pre-rendered (`audio/`, ElevenLabs) from `tools/lines.json`:
the spine, six rescues, five repairs. That is deliberate for latency, and it means
the page ships no API key.

Going beyond the bank needs a small server: stream partial ASR, match against the
bank first, and only fall back to the LLM when nothing matches — caching each new
line back into the bank. The client stays as-is.

## Art

The room, the tabletop and the three objects are pixel art. The two characters
are **abstract rectangles built in CSS** — head, neck, torso, plus small blocks
for brows, eyes and mouth.

That is a deliberate v1 choice, not a placeholder we forgot to replace.
Alignment is the reason. With drawn sprites, every expression is a new image
whose content sits at a slightly different place inside its canvas, so the head
moves, and the speech-bubble tails — which have to point at that head — drift
with it. Normalising sprites on the head helps but never quite lands. With
rectangles the head is at a coordinate we chose, `aimTail()` can aim at it
arithmetically, and it is exact at every window size.

Each figure leans a few degrees inward and its face blocks sit off-centre toward
the middle of the table (`--lean`), which reads as a three-quarter turn without
any drawing. Poses move only the mouth and brows:

| pose | who | when |
|---|---|---|
| `listening` | both | default |
| `talking` | Linh | her model answer, her follow-up |
| `asking` | either | Minh's question, Linh turning to you |
| `helping` | Linh | the mid-turn rescue — wide eyes, round mouth |
| `correcting` | Minh | the one repair |

The drawn alternative is parked in `art-wip/` with notes on swapping it back in.

Layers are `room.png`, the characters, then `fg.png` (the tabletop) on top, so
the figures sit behind the table and their cut-off bottoms never show.

## Keys

Copy `../.env.example` to `../.env`. Nothing here reads a key at runtime — the
tools do, at build time.
