# Đậu rig layers

Lines ChatGPT's separate Đậu parts up with the master image and exports them as
`assets/rig_*.webp` (one full-canvas layer per part, so the page just stacks them).

1. Unzip the parts so `Batch_1_redone/` and `Batch_2/` sit next to these scripts
   (file names as in `Dau_animation_batches_1_and_2.zip`).
2. `python3 fit.py` fits body, sprout, eyes, blush and mouths to `00_master.png`.
3. `python3 arms.py` attaches the arms to the fitted body and writes the shoulder pivots.
4. `python3 export.py` crops every layer to one shared canvas (380 px wide, WebP) and
   prints the pivots; copy the pivot percentages into the `.l-arm_*` and
   `.l-sprout` `transform-origin` rules in `src/template.html`.

Needs Pillow and NumPy.
