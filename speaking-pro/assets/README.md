`splash.png` is the onboarding background — PixelLab, 400×240, scaled up with
`image-rendering: pixelated`. The page background continues its sky colour
(`#FBFAE0`) upward, so a taller viewport reads as more sky rather than a
letterbox.

The other plates are the rest of that batch, kept as alternates: `a_hills`
(big sun over hills), `b_clouds` (mountains under an open sky), `c_water`
(mirror lake), `d_bands`/`splash-alt` (layered haze), `e_arch` (one small tree
in an empty sky). Swapping one in is a single line in `.splash .plate`.

Prompts that produced them are in `tools/gen_splash.py`.
