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

Three layers: `room.png`, the two characters, then `fg.png` (the tabletop) on
top, so they sit *behind* the table and their cropped edge never shows.

Characters are generated as separate three-quarter sprites and composited, not
baked into the room. That is deliberate, after trying the other way: ask for two
people on the far side of a table *angled inward* and the model reliably swings
the camera round to a side-on view of two profiles, which puts the viewer at the
next table instead of in the third seat. Generating each one alone keeps the
angle, the spacing and the scale under our control.

Every frame is normalised on the head — same scale, same head position inside a
200×200 canvas — so swapping expressions can never make a character jump or
resize. Linh is generated facing right and mirrored, so both face inward.

Faces use the visual-novel portrait style (`selective outline`, `medium shading`,
`highly detailed`). Semi-realistic faces at this size land in the uncanny valley;
the stylised ones don't.

## Keys

Copy `../.env.example` to `../.env`. Nothing here reads a key at runtime — the
tools do, at build time.
