Drawn character sprites, parked.

v1 uses abstract rectangle figures built in CSS (see `.actor` in index.html)
because alignment is exact by construction — the heads sit on known coordinates,
so the speech-bubble tails can be aimed arithmetically instead of measured off a
sprite's alpha bounds.

These sprites are the drawn alternative: three-quarter visual-novel portraits,
normalised on the head inside a 200x200 canvas so swapping expressions cannot
shift or resize a character. `tools/gen_art.py` regenerates them.

To use them instead, swap each `.actor` div back to an `<img>` and restore
`pose()` to set `src` rather than `data-pose`.
