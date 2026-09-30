import json
import numpy as np
from PIL import Image
exec(open('fit.py').read().split("layers, report = {}, {}")[0])   # reuse load/crop/place helpers
body = np.array(Image.open('fit_body.png'))[..., 3] > 128
ys, xs = np.where(body); top, bot = ys.min(), ys.max()
H = bot - top
y_sh = int(top + H * .50)                      # shoulder height
row = np.where(body[y_sh])[0]; xl, xr = row.min(), row.max()
arm_len = H * .21
out = {}
for name, f, side in (('arm_l', 'Batch_1_redone/04_right_arm.png', -1), ('arm_r', 'Batch_1_redone/03_left_arm.png', 1)):
    arm = crop(load(f)); s = arm_len / arm.height
    w, h = arm.width * s, arm.height * s
    edge = xl if side < 0 else xr
    cx = edge + side * w * .22; cy = y_sh + h * .42
    Image.Image.save(place(arm, s, 0, cx, cy), f'fit_{name}.png')
    # shoulder pivot: the arm's top-inner end
    out[name] = dict(px=float(edge - side * w * .05), py=float(y_sh + h * .02))
json.dump(out, open('pivots.json', 'w'))
print(out, 'body', top, bot, xl, xr)
