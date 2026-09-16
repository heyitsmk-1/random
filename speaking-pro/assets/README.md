`splash.png` — a quiet room with morning light through a curtain. PixelLab,
400×240, `image-rendering: pixelated`. Used by both the loading screen and as the
app's fixed backdrop, so menu and splash are the same place.

**Why this one.** Three rounds of picking on layout ("where does the headline
fit") gave calm landscapes, then a desert, then a desk that was warm but busy.
This round the brief was *chill*, and the constraint that mattered was: the left
half must stay quiet and low-contrast, because the menu column lives there. Cool
lilac also makes the warm `#FF6D3A` accent pop instead of fighting it.

Legibility is handled in CSS, not by washing the art flat: the menu column and
the briefing each sit on their own soft radial ground, so the room stays visible
at ~0.5 scrim while the type keeps its contrast.

`_options.png` is the labelled sheet of the chill batch. Alternates:
`c1_wall` (empty wall at dawn), `c4_mist` (mist over water — softest of all),
`c6_shelf` (sage corner with plants), `c3_lamp` (one lamp at night, the only dark
option — would need light type).

Earlier batches, in three groups:

- **your own morning** — `splash` (desk), `window` (their city waking up), `rooftop`
- **a conversation about to happen** — `twocups` (two cups, nobody there yet), `cafe`
- **why you are doing this** — `skyline`, `campus`, `plane`

`twocups` is the runner-up and the most on-theme for *speaking* — two cups facing
each other, an empty chair each side, a conversation that has not started. The
risk is that it reads lonely rather than inviting.

Earlier landscape batches are in `_old/` if they are ever wanted.

**Swapping**: one line in `.splash .plate`. Note the light `.wash` over the top
third — it exists because this plate's upper area is a dusky wall, not sky, and
the dark headline needs a calm ground. A plate with a pale top may not need it.
