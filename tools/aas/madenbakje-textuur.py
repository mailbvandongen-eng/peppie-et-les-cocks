# python tools/aas/madenbakje-textuur.py <productfoto visgigant.nl ftm-baitbox-1-liter-geel-vierkant (Large, 760 x 435)>
# Maakt de texturen voor tools/aas/madenbakje.py:
#   madenbakje-etiket.jpg : het zwarte FTM-etiket (FISHING TACKLE MAX + vis) uit de productfoto geknipt, 1024 x 256
#   madenbakje-geel.jpg   : het gele polypropeen, kleur gemeten op de foto, met fijne spuitgietkorrel (256 x 256, naadloos)
#   madenbakje-deksel.jpg : het melkwitte deksel van boven (512 x 512 = 17 x 17 cm) met de luchtgaatjes
#   made.png              : één made (u = kop -> staart, v = rondom, 0 = rug), 512 x 128:
#                           roomwit, iets doorschijnend lichter aan de flanken, ringen, de donkere voedselvlek achter in het lijf,
#                           de zwarte mondhaakjes voorop en de twee bruine ademhalingsvlekjes (spiracula) op de stompe achterkant.
import sys, os
import numpy as np
from PIL import Image, ImageFilter

HIER = os.path.dirname(os.path.abspath(__file__))
FOTO = sys.argv[1]
rng = np.random.default_rng(7)

def ruis(h, w, schaal, rng=rng):                     # naadloze wolkjesruis (som van octaven, wrap-around)
    tot = np.zeros((h, w))
    for o in range(5):
        n = max(2, int(schaal * 2 ** o)); g = rng.standard_normal((n, n))
        im = Image.fromarray(((g - g.min()) / (np.ptp(g) + 1e-9) * 255).astype(np.uint8))
        big = np.asarray(im.resize((w + w // n * 2, h + h // n * 2), Image.BICUBIC), float)[h // n:h // n + h, w // n:w // n + w]
        tot += big / 255 / (1.6 ** o)
    tot -= tot.mean(); return tot / (np.abs(tot).max() + 1e-9)

# ---------- etiket ----------
foto = Image.open(FOTO).convert('RGB')
et = foto.crop((261, 253, 502, 313))                 # zwart etiket, gemeten met een drempel op de donkere pixels
et = et.resize((1024, 256), Image.LANCZOS).filter(ImageFilter.UnsharpMask(radius=2, percent=80, threshold=2))
a = np.asarray(et, float)
zw = a.sum(2) < 140                                   # het zwart wat dieper zwart (jpeg-ruis eruit)
a[zw] = a[zw] * 0.55 + np.array([14, 13, 11]) * 0.45
Image.fromarray(a.clip(0, 255).astype(np.uint8)).save(os.path.join(HIER, 'madenbakje-etiket.jpg'), quality=92)

# ---------- geel plastic ----------
basis = np.array([232, 188, 50], float)               # foto: (228,194,68) in het licht, (243,210,69) in de hooglichten
n = ruis(256, 256, 24) * 0.035 + rng.standard_normal((256, 256)) * 0.012
g = basis[None, None, :] * (1 + n[..., None])
Image.fromarray(g.clip(0, 255).astype(np.uint8)).save(os.path.join(HIER, 'madenbakje-geel.jpg'), quality=90)

# ---------- deksel ----------
S = 512; px = 0.17 / S                                # 17 cm over 512 px
basis = np.array([226, 223, 196], float)              # melkwit doorschijnend PP (geel schemert door), foto: (216,218,197)/(222,218,180)
n = ruis(S, S, 6) * 0.025 + rng.standard_normal((S, S)) * 0.008
d = basis[None, None, :] * (1 + n[..., None])
yy, xx = np.mgrid[0:S, 0:S]
for i in range(-5, 6):                                # 11 x 11 gaatjes van 2 mm, steek 9 mm, in het midden van het deksel
    for j in range(-5, 6):
        cx, cy = S / 2 + i * 0.009 / px, S / 2 + j * 0.009 / px
        r = np.hypot(xx - cx, yy - cy) * px
        rand = np.clip((r - 0.0008) / 0.0005, 0, 1)   # gat (donker: je kijkt in het bakje) met een lichte afgeschuinde rand
        ring = np.exp(-((r - 0.00115) / 0.00025) ** 2) * 0.10
        d *= (0.45 + 0.55 * rand)[..., None]; d *= (1 + ring)[..., None]
Image.fromarray(d.clip(0, 255).astype(np.uint8)).save(os.path.join(HIER, 'madenbakje-deksel.jpg'), quality=90)

# ---------- made ----------
W, H = 512, 128
u = (np.arange(W) + 0.5) / W; v = (np.arange(H) + 0.5) / H
U, V = np.meshgrid(u, v)
room = np.array([226, 214, 180], float)               # roomwit (witte maden, Calliphora-larven voor de hengelsport)
flank = np.array([236, 228, 204], float)              # flanken lichter/doorschijnender
buik = np.array([214, 198, 160], float)
hoek = np.minimum(V, 1 - V) * 2                       # 0 = rug, 1 = buik
c = room[None, None] * (1 - np.sin(hoek * np.pi)[..., None] * 0.6) + flank[None, None] * np.sin(hoek * np.pi)[..., None] * 0.6
c = c * (1 - (hoek > .7)[..., None] * 0) + (buik - room)[None, None] * np.clip((hoek - .7) / .3, 0, 1)[..., None]
seg = U ** 0.9 * 12                                    # 12 ringen, voorin iets korter (zelfde formule als het model)
groef = np.abs(np.cos(np.pi * seg)) ** 14
c *= (1 - 0.10 * groef)[..., None]
c *= (1 + ruis(H, W, 10)[..., None] * 0.03 + rng.standard_normal((H, W, 1)) * 0.012)
# voedselvlek: donker grijsbruin, op de rug achter het midden, vaag (door de huid heen)
vl = np.exp(-(((U - 0.70) / 0.11) ** 2) - ((np.minimum(V, 1 - V) / 0.17) ** 2))
vl *= 1 + 0.4 * ruis(H, W, 8)
c = c * (1 - 0.42 * vl[..., None]) + np.array([92, 78, 62]) * 0.42 * vl[..., None]
# ingewanden: vage donkere streep in het midden van de rug
c *= (1 - 0.06 * np.exp(-((np.minimum(V, 1 - V) / 0.05) ** 2)) * ((U > .15) & (U < .9)))[..., None]
# mondhaakjes (zwart) op de punt
kop = np.clip((0.035 - U) / 0.015, 0, 1)
c = c * (1 - kop[..., None]) + np.array([30, 24, 20]) * kop[..., None]
# spiracula: twee bruine vlekjes op de achterkant (dop, u > 0.985) linksboven en rechtsboven
for vc in (0.14, 0.86):
    sp = np.exp(-(((U - 0.991) / 0.004) ** 2) - (((V - vc) / 0.035) ** 2))
    c = c * (1 - 0.85 * sp[..., None]) + np.array([96, 62, 36]) * 0.85 * sp[..., None]
Image.fromarray(c.clip(0, 255).astype(np.uint8)).save(os.path.join(HIER, 'made.png'))
print('klaar')
