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

`tools/gen_art.py` generates the plate and the table objects (PixelLab).
`tools/inpaint_faces.py` produces expressions by inpainting **only** the brow/eye
and mouth bands of a face in the finished scene, then pasting the crop back — so
every expression is a full plate and the faces can never drift out of register.
Masking the nose, jaw or chin makes the model redraw bone structure and the
character stops being the same person; the band coordinates in `REGION` are
specific to this plate.

## Keys

Copy `../.env.example` to `../.env`. Nothing here reads a key at runtime — the
tools do, at build time.
