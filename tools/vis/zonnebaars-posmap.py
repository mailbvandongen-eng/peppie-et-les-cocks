# python -I zonnebaars-posmap.py map/ — rastert de 3D-positie van elk texel (pos.npy, mask.npy) uit de dump van zonnebaars-dump.mjs
import sys, numpy as np
from PIL import Image
d = sys.argv[1]; P = np.fromfile(d + "/pos.f32", np.float32).reshape(-1, 3); U = np.fromfile(d + "/uv.f32", np.float32).reshape(-1, 2); I = np.fromfile(d + "/idx.u32", np.uint32).reshape(-1, 3)
N = 1024; pos = np.zeros((N, N, 3), np.float32); mask = np.zeros((N, N), bool)
for t in I:
    uv = U[t] * N - 0.5; x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, N - 1), min(y1, N - 1)
    if x1 < x0 or y1 < y0: continue
    xs, ys = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); a, b, c = uv
    den = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(den) < 1e-12: continue
    l1 = ((b[1] - c[1]) * (xs - c[0]) + (c[0] - b[0]) * (ys - c[1])) / den; l2 = ((c[1] - a[1]) * (xs - c[0]) + (a[0] - c[0]) * (ys - c[1])) / den; l3 = 1 - l1 - l2
    e = -0.6 / max(1, abs(den)) ** 0.5  # een halve texel ruimte aan de randen
    m = (l1 >= e) & (l2 >= e) & (l3 >= e)
    q = l1[..., None] * P[t[0]] + l2[..., None] * P[t[1]] + l3[..., None] * P[t[2]]
    pos[ys[m], xs[m]] = q[m]; mask[ys[m], xs[m]] = True
# randen een paar texels uitbreiden (naden)
for _ in range(4):
    sh = [(0, 1), (0, -1), (1, 0), (-1, 0)]; nm = mask.copy(); np_ = pos.copy()
    for dy, dx in sh:
        mm = np.roll(mask, (dy, dx), (0, 1)) & ~nm; np_[mm] = np.roll(pos, (dy, dx), (0, 1))[mm]; nm |= mm
    mask, pos = nm, np_
np.save(d + "/pos.npy", pos); np.save(d + "/mask.npy", mask); print("bedekt", mask.mean())
