import json, math
import numpy as np
from PIL import Image
from collections import deque

def load(f):
    im = Image.open(f).convert('RGBA'); a = np.array(im)
    a[..., 3] = np.where(a[..., 3] < 40, 0, a[..., 3])  # drop faint haze left by the generator
    return Image.fromarray(a)

def masks(im):
    a = np.array(im).astype(int); A = a[..., 3] > 128; r, g, b = a[..., 0], a[..., 1], a[..., 2]
    return dict(all=A, dark=A & (r < 90) & (g < 80) & (b < 80), green=A & (g > r + 20) & (g > b),
                pink=A & (r > 220) & (g > 140) & (g < 205) & (b > 150), orange=A & (r > 200) & (g > 100) & (g < 190) & (b < 90))

def comps(mask, minsize=30):
    H, W = mask.shape; seen = np.zeros_like(mask, bool); out = []
    for y0, x0 in zip(*np.where(mask)):
        if seen[y0, x0]: continue
        q = deque([(y0, x0)]); seen[y0, x0] = True; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < H and 0 <= xx < W and mask[yy, xx] and not seen[yy, xx]:
                    seen[yy, xx] = True; q.append((yy, xx))
        if len(pts) >= minsize:
            p = np.array(pts); out.append(dict(x0=p[:, 1].min(), y0=p[:, 0].min(), x1=p[:, 1].max(), y1=p[:, 0].max(),
                                              cx=p[:, 1].mean(), cy=p[:, 0].mean(), n=len(pts)))
    return sorted(out, key=lambda c: -c['n'])

master = load('Batch_1_redone/00_master.png'); MW = master.width
M = masks(master)

def place(part, s, rot, tx, ty):
    """Scale part by s, rotate by rot degrees about its centre, put its centre at (tx, ty) on a master-sized canvas."""
    w, h = part.size
    p = part.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    if rot: p = p.rotate(-rot, resample=Image.BICUBIC, expand=True)
    out = Image.new('RGBA', (MW, MW), (0, 0, 0, 0))
    out.alpha_composite(p, (round(tx - p.width / 2), round(ty - p.height / 2)))
    return out

def crop(im, mask=None):
    m = mask if mask is not None else masks(im)['all']
    ys, xs = np.where(m); return im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))

def iou_fit(part, target, s0, cx0, cy0, rots=(0,), span=.12, shift=40):
    """Search scale / rotation / shift to best overlap part's alpha with target mask (downscaled for speed)."""
    k = 4; T = target[::k, ::k]; best = None
    for rot in rots:
        for s in np.linspace(s0 * (1 - span), s0 * (1 + span), 9):
            for dx in range(-shift, shift + 1, 8):
                for dy in range(-shift, shift + 1, 8):
                    P = np.array(place(part, s, rot, cx0 + dx, cy0 + dy))[::k, ::k, 3] > 128
                    inter = (P & T).sum(); uni = (P | T).sum(); v = inter / max(uni, 1)
                    if not best or v > best[0]: best = (v, s, rot, cx0 + dx, cy0 + dy)
    return best

def two_point(part_pts, master_pts):
    (a, b), (c, d) = part_pts, master_pts
    vp = np.subtract(b, a); vm = np.subtract(d, c)
    s = np.hypot(*vm) / np.hypot(*vp)
    rot = math.degrees(math.atan2(vm[1], vm[0]) - math.atan2(vp[1], vp[0]))
    return s, rot

layers, report = {}, {}
# ---- body: fit to the master's orange silhouette
body = crop(load('Batch_1_redone/01_body.png'))
sil = M['orange'] | M['all'] & ~M['green'] & ~M['dark'] & ~M['pink']
ys, xs = np.where(sil & (np.arange(MW)[:, None] > 300))
s0 = (ys.max() - 300) / (body.height * .78)
v = iou_fit(body, sil, s0, xs.mean(), (ys.max() + 300) / 2 - 30, span=.15, shift=48)
layers['body'] = place(body, *v[1:]); report['body'] = round(v[0], 3)
# ---- arms: what's orange in the master but not in the placed body
armmask = sil & ~(np.array(layers['body'])[..., 3] > 60)
armc = [c for c in comps(armmask, 400)][:2]
armc.sort(key=lambda c: c['cx'])
for name, f, c in (('arm_l', 'Batch_1_redone/04_right_arm.png', armc[0]), ('arm_r', 'Batch_1_redone/03_left_arm.png', armc[1])):
    arm = crop(load(f)); tgt = np.zeros_like(armmask); tgt[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1] = armmask[c['y0']:c['y1'] + 1, c['x0']:c['x1'] + 1]
    s0 = (c['y1'] - c['y0']) / arm.height
    v = iou_fit(arm, tgt, s0, (c['x0'] + c['x1']) / 2, (c['y0'] + c['y1']) / 2, rots=range(-30, 31, 10), span=.3, shift=24)
    layers[name] = place(arm, *v[1:]); report[name] = round(v[0], 3)
    report[name + '_box'] = [int(c['x0']), int(c['y0']), int(c['x1']), int(c['y1'])]
# ---- sprout
sp = crop(load('Batch_1_redone/02_sprout.png'))
g = comps(M['green'], 200)
gx0 = min(c['x0'] for c in g); gx1 = max(c['x1'] for c in g); gy0 = min(c['y0'] for c in g); gy1 = max(c['y1'] for c in g)
v = iou_fit(sp, M['green'], (gx1 - gx0) / sp.width, (gx0 + gx1) / 2, (gy0 + gy1) / 2, rots=(-10, 0, 10), span=.15, shift=24)
layers['sprout'] = place(sp, *v[1:]); report['sprout'] = round(v[0], 3)
# ---- eyes: match the two eye centres exactly
me = sorted(comps(M['dark'], 200)[:2], key=lambda c: c['cx']); mpts = [(c['cx'], c['cy']) for c in me]
def fit_pair(f, key, name, minsize=150, offset=(0, 0)):
    im = load(f); mk = masks(im)[key]; cs = sorted(comps(mk, minsize)[:2], key=lambda c: c['cx'])
    ppts = [(c['cx'], c['cy']) for c in cs]; s, rot = two_point(ppts, mpts if key == 'dark' else None)
    return im, cs, ppts
def put_pair(f, key, target_pts, name, offset=(0, 0), minsize=150):
    im = load(f); mk = masks(im)[key]; cs = sorted(comps(mk, minsize)[:2], key=lambda c: c['cx'])
    ppts = [(c['cx'], c['cy']) for c in cs]; s, rot = two_point(ppts, target_pts)
    cx, cy = np.mean(ppts, 0); tcx, tcy = np.mean(target_pts, 0)
    # rotate the whole image about the midpoint of the pair
    w, h = im.size; pad = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0)); pad.alpha_composite(im, (round(w - cx), round(h - cy)))
    layers[name] = place(pad, s, rot, tcx + offset[0], tcy + offset[1]); report[name] = [round(s, 3), round(rot, 1)]
    return s
for name, f in (('eyes_open', 'Batch_1_redone/05_eyes_open_forward.png'), ('eyes_blink', 'Batch_1_redone/06_eyes_blink.png'),
                ('eyes_happy', 'Batch_1_redone/07_eyes_happy_closed.png'), ('eyes_left', 'Batch_1_redone/08_eyes_looking_left.png')):
    put_pair(f, 'dark', mpts, name)
gap = mpts[1][0] - mpts[0][0]
s2 = put_pair('Batch_2/01_eyes_looking_right.png', 'dark', mpts, 'eyes_right', offset=(gap * .05, 0))
put_pair('Batch_2/02_eyes_looking_up.png', 'dark', mpts, 'eyes_up', offset=(0, -gap * .05))
layers['eyes_left'] = place(layers['eyes_left'], 1, 0, MW / 2 - gap * .05, MW / 2)
# ---- blush: match the two cheek centres
mb = sorted(comps(M['pink'], 300)[:2], key=lambda c: c['cx'])
put_pair('Batch_2/06_blush.png', 'pink', [(c['cx'], c['cy']) for c in mb], 'blush', minsize=200)
# ---- mouths: scale from their batch, hang each from the master mouth's top centre
mm = comps(M['all'] & (np.array(master)[..., 0] > 120) & (np.array(master)[..., 1] < 110) & (np.array(master)[..., 2] < 60), 100)[0]
top = ((mm['x0'] + mm['x1']) / 2, mm['y0'])
def mouth(f, s, name):
    im = crop(load(f)); p = place(im, s, 0, top[0], top[1] + im.height * s / 2); layers[name] = p
sm = crop(load('Batch_1_redone/09_mouth_small_smile.png')); s1 = (mm['x1'] - mm['x0']) / sm.width
mouth('Batch_1_redone/09_mouth_small_smile.png', s1, 'mouth_smile')
# batch 2 mouths: same pixel scale as batch 2 eyes relative to their batch-1 counterparts
e1 = sorted(comps(masks(load('Batch_1_redone/05_eyes_open_forward.png'))['dark'], 150)[:2], key=lambda c: c['cx'])
e2 = sorted(comps(masks(load('Batch_2/01_eyes_looking_right.png'))['dark'], 150)[:2], key=lambda c: c['cx'])
ratio = (e1[1]['cx'] - e1[0]['cx']) / (e2[1]['cx'] - e2[0]['cx'])
for name, f in (('mouth_talk', 'Batch_2/03_mouth_midword.png'), ('mouth_laugh', 'Batch_2/04_mouth_big_laugh.png'), ('mouth_o', 'Batch_2/05_mouth_surprise_o.png')):
    mouth(f, s1 * ratio, name)
report['mouth_scale'] = [round(s1, 3), round(ratio, 3)]
json.dump({k: str(v) for k, v in report.items()}, open('fit_report.json', 'w'), indent=1)
for k, im in layers.items(): im.save(f'fit_{k}.png')
print(report)
