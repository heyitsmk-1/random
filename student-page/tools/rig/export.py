"""Step 4: crop the fitted layers to one shared canvas and write assets/rig_*.webp + rig_meta.json."""
import json
import os

import numpy as np
from PIL import Image

NAMES = ['body', 'sprout', 'arm_l', 'arm_r', 'blush', 'eyes_open', 'eyes_blink', 'eyes_happy', 'eyes_left',
         'eyes_right', 'eyes_up', 'mouth_smile', 'mouth_talk', 'mouth_laugh', 'mouth_o']
DST = os.path.join(os.path.dirname(__file__), '..', '..', 'assets')
ims = {k: Image.open(f'fit_{k}.png') for k in NAMES}
al = np.zeros(ims['body'].size[::-1], bool)
for im in ims.values():
    al |= np.array(im)[..., 3] > 20
ys, xs = np.where(al)
piv = json.load(open('pivots.json'))
reach = int((ys.max() - ys.min()) * .25)          # room for raised arms
x0, x1 = max(0, xs.min() - reach), min(al.shape[1], xs.max() + reach)
y0, y1 = max(0, ys.min() - 30), ys.max() + 10
W, H = x1 - x0, y1 - y0
out = 380; size = (out, round(H * out / W))
for k, im in ims.items():
    im.crop((x0, y0, x1, y1)).resize(size, Image.LANCZOS).save(f'{DST}/rig_{k}.webp', 'WEBP', quality=88, method=6)
sp = np.array(ims['sprout'])[..., 3] > 128; sy, sx = np.where(sp)
stem = (sx[sy > sy.max() - 15].mean(), sy.max())
pct = lambda x, y: [round((x - x0) / W * 100, 1), round((y - y0) / H * 100, 1)]
meta = dict(ratio=f'{size[0]} / {size[1]}', arm_l=pct(piv['arm_l']['px'], piv['arm_l']['py']),
            arm_r=pct(piv['arm_r']['px'], piv['arm_r']['py']), sprout=pct(*stem))
json.dump(meta, open('rig_meta.json', 'w'))
print(meta)
