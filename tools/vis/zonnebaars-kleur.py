# python -I zonnebaars-kleur.py map/ uit.png — schildert de blauwbaars-scan om naar zonnebaars-kleuren (Lepomis gibbosus):
# olijf rug, blauwgroene flanken met oranje vlekken, oranje buik en wangen met turquoise golflijnen, zwarte kieuwflap met rode vlek.
# Werkt in 3D (positiekaart van zonnebaars-posmap.py; kop +z, rug +y, lengte 0.15 m), behoudt de schubtekening uit de scan.
import sys, numpy as np
from PIL import Image, ImageFilter
d, uit = sys.argv[1], sys.argv[2]
pos = np.load(d + "/pos.npy"); mask = np.load(d + "/mask.npy"); import glob; im = Image.open(sorted(glob.glob(d + "/tex.*"))[0]).convert("RGB")
T = np.asarray(im).astype(np.float32) / 255
x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]; ax = np.abs(x)
mx, mn = T.max(-1), T.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3); lum = T @ np.array([0.3, 0.59, 0.11], np.float32)
blur = np.asarray(im.convert("L").filter(ImageFilter.GaussianBlur(4))).astype(np.float32) / 255
detail = np.clip(lum / np.maximum(blur, 0.03), 0.6, 1.45)
ss = lambda a, b, v: np.clip((v - a) / (b - a), 0, 1) ** 2 * (3 - 2 * np.clip((v - a) / (b - a), 0, 1))
# lijf-omtrek (zonder vinnen), met de hand uit het zijaanzicht van de scan: (z, y) in cm
TOP = [(7.6, 0), (6.5, 1.0), (5, 2.0), (4, 2.6), (3.3, 2.95), (0, 2.6), (-2.4, 1.5), (-4.6, 0.9)]
BOT = [(7.6, -0.1), (7.3, -0.5), (6, -1.4), (4.5, -2.15), (3, -2.5), (1.5, -2.65), (0.5, -2.5), (-1, -2.2), (-3.2, -1.3), (-4.6, -0.75)]
lijn_ = lambda L: (lambda zz: np.interp(zz, [p[0] / 100 for p in L[::-1]], [p[1] / 100 for p in L[::-1]]))
yhi, ylo = lijn_(TOP)(z), lijn_(BOT)(z); s = (y - ylo) / np.maximum(yhi - ylo, 1e-3)  # 0 buik .. 1 rug
binnen = (mask & (ax < 0.0145) & (z > -0.047) & (z < 0.0765)).astype(np.float32) * ss(-0.06, 0.0, s) * ss(1.06, 1.0, s)
w = binnen.copy()
C = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], np.float32)
mix = lambda a, c, t: a * (1 - t[..., None]) + C(c) * t[..., None]
kleur = np.ones_like(T) * C("#a39a48")                                   # goudolijf flank
kleur = mix(kleur, "#535a2b", ss(0.6, 0.95, s))                           # donkere olijfrug
kleur = mix(kleur, "#eca232", ss(0.42, 0.12, s) * ss(-0.05, -0.03, z))    # geeloranje buik
# vlekken (vast zaad): donkere olijfbruine marmering, ertussen turquoise spikkels en enkele oranje stippen
rng = np.random.default_rng(7); vlek = np.zeros(z.shape, np.float32); spik = np.zeros(z.shape, np.float32); oranje = np.zeros(z.shape, np.float32)
for kant in (1, -1):
    kk = (x * kant > 0)
    for _ in range(560):
        pz, py, r = rng.uniform(-0.048, 0.036), rng.uniform(-0.028, 0.032), rng.uniform(0.0008, 0.0016)
        vlek = np.maximum(vlek, kk * ss(r, r * 0.35, np.hypot((z - pz) * 0.85, y - py)))
    for _ in range(380):
        pz, py, r = rng.uniform(-0.048, 0.07), rng.uniform(-0.028, 0.032), rng.uniform(0.0004, 0.0008)
        spik = np.maximum(spik, kk * ss(r, r * 0.4, np.hypot(z - pz, y - py)))
    for _ in range(70):
        pz, py, r = rng.uniform(-0.045, 0.03), rng.uniform(-0.02, 0.02), rng.uniform(0.0006, 0.001)
        oranje = np.maximum(oranje, kk * ss(r, r * 0.5, np.hypot(z - pz, y - py)))
fl = ss(0.1, 0.3, s) * ss(1.0, 0.8, s) * ss(0.04, 0.033, z)
kleur = mix(kleur, "#4a4320", vlek * fl * 0.75)
kleur = mix(kleur, "#5fb6ae", spik * fl * (1 - vlek) * 0.75)
kleur = mix(kleur, "#e0702a", oranje * fl * (1 - vlek) * 0.8)
# vage dwarsbanden
kleur *= (1 - 0.12 * ss(0.3, 0.7, s) * (0.5 + 0.5 * np.cos((z + 0.004) * 2 * np.pi / 0.013)) * ss(0.034, 0.02, z) * ss(-0.046, -0.038, z))[..., None]
# kop: oranjebruine wang met turquoise kronkellijnen van bek naar kieuwdeksel
kop = ss(0.031, 0.037, z)
kleur = mix(kleur, "#b8823e", kop * ss(0.62, 0.45, s) * ss(0.0, 0.12, s))
kleur = mix(kleur, "#d9a84a", kop * ss(0.15, 0.0, s))
kleur = mix(kleur, "#4f5a2c", kop * ss(0.55, 0.85, s))
golf = y + 0.0009 * np.sin(z * 2 * np.pi / 0.008 + y * 900) + 0.0004 * np.sin(z * 2 * np.pi / 0.0031) + 0.0005 * np.sin(z * 2 * np.pi / 0.017 + y * 400) + (z - 0.034) * 0.14
lijn = ss(0.45, 0.85, np.cos(golf * 2 * np.pi / 0.0023)) * kop * ss(0.72, 0.55, s) * ss(0.05, 0.15, s) * ss(0.074, 0.066, z)
oog0 = np.hypot(z - 0.0589, y - 0.003); lijn *= ss(0.0042, 0.0052, oog0)
kleur = mix(kleur, "#3aa9bd", lijn * 0.85)
# oog sparen
w *= 1 - ss(0.0048, 0.0036, oog0)
# kieuwflap: zwart met rode vlek aan de achterrand
flap = ss(1.0, 0.75, np.hypot((z - 0.0345) / 0.0034, (y - 0.0050) / 0.0028)) * binnen
rood = ss(1.0, 0.55, np.hypot((z - 0.0316) / 0.0012, (y - 0.0047) / 0.0017)) * binnen
kleur = mix(kleur, "#121212", flap); kleur = mix(kleur, "#d42a18", rood)
w = np.maximum(w, np.maximum(flap, rood))
nieuw = np.clip(kleur * detail[..., None] ** 1.4 * 1.05, 0, 1)
out = T * (1 - w[..., None]) + nieuw * w[..., None]
# vinnen: rug- en staartvin olijf, buik- en aarsvin amber (onderste vinnen: onder de buiklijn)
vin = (mask & (w < 0.5)).astype(np.float32); onder = ss(0.0, -0.15, s) * (z > -0.05)
tint = np.array([1.05, 1.02, 0.72], np.float32) * (1 - onder[..., None]) + np.array([1.35, 1.05, 0.55], np.float32) * onder[..., None]
out = out * (1 - vin[..., None]) + np.clip(out * tint, 0, 1) * vin[..., None]
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(uit); print("klaar", uit)
