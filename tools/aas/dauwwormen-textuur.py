# python tools/aas/dauwwormen-textuur.py <map met de productfoto's van tom-cat.nl> <map met ambientCG Cardboard002_1K-JPG>
# Maakt de texturen voor tools/aas/dauwwormen.py uit de productfoto's van tom-cat.nl
# (meerval-aas/levend-aas/dauwwormen/canadese-dauwwormen: canadese-dauwwormen.jpg = de gestapelde bekertjes in de koeling,
#  canadese-dauwwormen-2.jpg = de geopende doos met bekertjes en koelzakken) en ambientCG Cardboard002 (CC0):
#   dauwworm-doosje.jpg  : atlas van het bekertje (1024 x 1024)
#                 rij 0 (y 0..271)    de wikkel van voren, -90..+90 graden: uit foto 1 rechtgetrokken (cilinder terugrekenen)
#                 rij 1 (y 272..543)  de wikkel van achteren, +90..+270 graden: wormen (de rand van foto 1 + de wormenfoto
#                                     canadese-dauwwormen-1.jpg, in kleur gelijk gemaakt), het paarse vlak met de wereldbol
#                                     en de streepjescode (zoals op de zijkanten van de bekertjes in foto 1)
#                 links onder (480 x 480) de bedrukte bovenkant van het deksel: wormen, paarse cirkel, het etiket schuin,
#                                     de QR-code in een beige vak (opbouw zoals op de deksels in foto 2)
#                 rechts onder        effen kraftpapier (zijkant deksel, bodem), van de deksels in foto 1 met papiernerf
#   dauwworm-koelzak.jpg : de witte koelzak met roze opdruk, uit foto 2
#   dauwworm-karton.jpg / dauwworm-karton-normaal.jpg : bruin golfkarton: ambientCG Cardboard002 (CC0), getint naar de doos op foto 2
# Foto's: https://tom-cat.nl/wp-content/uploads/2024/03/canadese-dauwwormen{,-1,-2}.jpg; karton: ambientcg.com/get?file=Cardboard002_1K-JPG.zip
# Nodig: numpy, opencv-python, Pillow.
import sys, os
import numpy as np, cv2
from PIL import Image, ImageOps

BRON, KARTON = sys.argv[1], sys.argv[2]; HIER = os.path.dirname(os.path.abspath(__file__))
def foto(n):
    im = ImageOps.exif_transpose(Image.open(os.path.join(BRON, n))).convert('RGB')
    return cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR).astype(np.float32)
rng = np.random.default_rng(7)
f1 = foto('canadese-dauwwormen.jpg')

# ---------- wikkel van voren: het bekertje links boven in foto 1, als cilinder teruggerekend ----------
# lijf zichtbaar van y 262 (onder de dekselrand) tot 477; randen links 198 -> 233, rechts 750 -> 730;
# de camera kijkt ~4 graden van boven: de voorkant van elke ring ligt R*0.07 lager dan de zijkanten.
def ontrol(t0, t1, W, H):
    th = np.radians(np.linspace(t0, t1, W)); v = np.linspace(0, 1, H)
    T, V = np.meshgrid(th, v)
    xl = 198 + 35 * V; xr = 750 - 20 * V; xc = (xl + xr) / 2; R = (xr - xl) / 2
    X = xc + R * np.sin(T); Y = 262 + 215 * V + R * 0.07 * np.cos(T)
    return cv2.remap(f1, X.astype(np.float32), Y.astype(np.float32), cv2.INTER_CUBIC)
SW, SH = 1024, 272
voor = ontrol(-90, 90, SW, SH)
# belichting gelijk trekken: per kolom de helderheid van het beige etiket (en de wormen) naar het midden toe
lum = cv2.cvtColor(np.clip(voor, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
kol = cv2.GaussianBlur(lum.mean(0)[None, :], (0, 0), 60)[0]
fac = np.clip(kol[SW // 2] / kol, 1.0, 1.8)
voor = voor * fac[None, :, None]
# witbalans: de foto is in het gele koelkastlicht genomen; het beige etiket wordt licht crème (zoals op foto 2 bij daglicht)
beige = np.median(voor[120:150, 300:700].reshape(-1, 3), 0)
WIT = np.array([168, 200, 214.0]) / beige                       # BGR-doel van het etiket
voor = voor * WIT; f1 = f1 * WIT
def roziger(b, n=14):                                             # minder geel: de wormen zijn op foto 2 (daglicht) roze
    l = cv2.cvtColor(np.clip(b, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32); l[..., 2] -= n; l[..., 1] += n / 3
    return cv2.cvtColor(np.clip(l, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
voor = roziger(voor); f1 = roziger(f1)
# de uiterste 15 graden aan beide kanten zijn sterk samengedrukt: daar komt de vulling overheen (zachte overgang)

# ---------- wormenvulling: canadese-dauwwormen-1.jpg (wormen in aarde), in kleur gelijk aan de bedrukte wikkel ----------
def lab(b): return cv2.cvtColor(np.clip(b, 0, 255).astype(np.uint8), cv2.COLOR_BGR2LAB).astype(np.float32)
def bgr(l): return cv2.cvtColor(np.clip(l, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR).astype(np.float32)
ref = lab(np.concatenate([f1[250:300, 880:1060].reshape(-1, 1, 3), f1[640:780, 700:745].reshape(-1, 1, 3)], 0))   # alleen wormen op de wikkel
wormen = foto('canadese-dauwwormen-1.jpg')
def vulling(W, H, y0, schaal=0.85, licht=1.0):
    s = cv2.resize(wormen, None, fx=schaal, fy=schaal, interpolation=cv2.INTER_AREA)
    s = s[y0:y0 + H]
    # losse zwarte aardkruimels weg (kleine donkere vlekjes opvullen vanuit de omgeving); grote donkere gaten blijven
    g = cv2.cvtColor(np.clip(s, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)
    donker = (g < cv2.GaussianBlur(g, (0, 0), 9).astype(np.int32) - 18).astype(np.uint8)
    n, lbl, st, _ = cv2.connectedComponentsWithStats(donker)
    klein = np.isin(lbl, np.where(st[:, 4] < 900)[0][1:]).astype(np.uint8)
    klein = cv2.dilate(klein, np.ones((5, 5), np.uint8))
    s = cv2.inpaint(np.clip(s, 0, 255).astype(np.uint8), klein, 6, cv2.INPAINT_TELEA).astype(np.float32)
    s = cv2.GaussianBlur(s, (0, 0), 1.2)                           # de wikkel is een zachte druk
    s = np.concatenate([s, s[:, ::-1]], 1)[:, :W]                  # gespiegeld aangeplakt: naadloos rondom
    l = lab(s)
    for c in range(3):                                            # gemiddelde en spreiding per kanaal als de wikkel
        l[..., c] = (l[..., c] - l[..., c].mean()) / (l[..., c].std() + 1e-3) * ref[..., c].std() * (0.85 if c == 0 else 1) + ref[..., c].mean() * (licht if c == 0 else 1)
    return bgr(l)
achter = vulling(SW, SH, 150)
# aan de randen van "voor" (|hoek| > 72 graden) overvloeien in de vulling; die vulling loopt door in "achter" (gespiegeld = naad dicht)
u = np.linspace(-90, 90, SW)
w = np.clip((np.abs(u) - 68) / 10, 0, 1)[None, :, None]
voor = voor * (1 - w) + np.where(u[None, :, None] < 0, achter[:, ::-1][:, :SW], achter) * w
# achter loopt van +90 (sluit aan op de rechterkant van voor) tot +270 (= -90, linkerkant van voor)

# paars vlak met wereldbol en tekst (achterkant, links van het etiket zoals op foto 1) en de streepjescode
paars = np.median(voor[18:52, 420:600].reshape(-1, 3)[(voor[18:52, 420:600].reshape(-1, 3)[:, 2] - voor[18:52, 420:600].reshape(-1, 3)[:, 1]) > 30], 0)
xa, xb = int((200 - 90) / 180 * SW), int((232 - 90) / 180 * SW)
achter[26:SH - 26, xa:xb] = paars
cv2.rectangle(achter, (xa + 6, 32), (xb - 7, SH - 33), (235, 225, 230), 2)
cx, cy, r = (xa + xb) // 2, 105, 52
for k in range(-2, 3):                                       # wereldbol: lengte- en breedtecirkels
    cv2.ellipse(achter, (cx, cy), (abs(k) * r // 2 if k else 1, r), 0, 0, 360, (225, 210, 220), 2, cv2.LINE_AA)
    cv2.ellipse(achter, (cx, cy + k * r // 3), (int(r * np.sqrt(1 - (k / 3) ** 2)), 4), 0, 0, 360, (225, 210, 220), 2, cv2.LINE_AA)
cv2.circle(achter, (cx, cy), r, (235, 225, 230), 3, cv2.LINE_AA)
achter = np.clip(achter, 0, 255).astype(np.uint8)            # putText wil 8 bits
for i, t in enumerate(['canadian', 'nightcrawlers']):
    cv2.putText(achter, t, (xa + 14, 190 + 26 * i), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (235, 225, 230), 1, cv2.LINE_AA)
achter = achter.astype(np.float32)
xa, xb = int((140 - 90) / 180 * SW), int((160 - 90) / 180 * SW)     # streepjescode, staand (zoals rechtsonder op foto 1)
achter[60:SH - 50, xa:xb] = (238, 240, 240)
yy = 70
while yy < SH - 62:
    d = int(rng.integers(1, 5)); achter[yy:yy + d, xa + 10:xb - 10] = 25; yy += d + int(rng.integers(1, 4))

# ---------- deksel: bedrukte bovenkant ----------
# deksel 11,5 cm op 480 px = 42 px/cm (wikkel: 68 px/cm): kleinere wormen, en lichter/rozer zoals op foto 2
D = 480; dek = vulling(D, D, 0, 0.66, 1.12)
dek = cv2.GaussianBlur(dek, (0, 0), 0.6)
Y, X = np.mgrid[0:D, 0:D]; c0 = (D - 1) / 2
rr = np.hypot(X - c0, Y - c0) / (D / 2)
cv2.circle(dek, (int(D * 0.27), int(D * 0.42)), int(D * 0.14), paars.tolist(), -1, cv2.LINE_AA)
gx, gy, gr = int(D * 0.27), int(D * 0.42), int(D * 0.085)
cv2.circle(dek, (gx, gy), gr, (225, 210, 220), 2, cv2.LINE_AA)
for k in (-1, 1): cv2.ellipse(dek, (gx, gy), (gr // 2, gr), 0, 0, 360, (225, 210, 220), 2, cv2.LINE_AA)
cv2.line(dek, (gx - gr, gy), (gx + gr, gy), (225, 210, 220), 2, cv2.LINE_AA)
# het etiket (zonder het FRESH-labeltje) schuin over het midden
et = voor[54:262, 40:SW - 40]
et = cv2.resize(et, (int(D * 0.9), int(D * 0.9 * et.shape[0] / et.shape[1])), interpolation=cv2.INTER_AREA)
masker = np.zeros(et.shape[:2], np.float32)
h, w_ = masker.shape; d = int(h * 0.45)
cv2.fillPoly(masker, [np.array([(d, 0), (w_ - d, 0), (w_ - 2, h // 2), (w_ - d, h - 1), (d, h - 1), (2, h // 2)])], 1, cv2.LINE_AA)
canvas = np.zeros_like(dek); m2 = np.zeros(dek.shape[:2], np.float32)
oy, ox = (D - h) // 2, (D - w_) // 2
canvas[oy:oy + h, ox:ox + w_] = et; m2[oy:oy + h, ox:ox + w_] = masker
M = cv2.getRotationMatrix2D((c0, c0), 58, 1.0)
M[0, 2] -= D * 0.04
canvas = cv2.warpAffine(canvas, M, (D, D), flags=cv2.INTER_CUBIC); m2 = cv2.warpAffine(m2, M, (D, D))[..., None]
dek = dek * (1 - m2) + canvas * m2
# QR-code in een beige vak rechts
beige = np.median(voor[120:150, 300:700].reshape(-1, 3), 0)
qx, qy, qs = int(D * 0.62), int(D * 0.44), int(D * 0.2)
dek[qy:qy + qs, qx:qx + qs] = beige
n = 21; cel = (qs - 16) / n; qr = rng.random((n, n)) < 0.5
for a, b in ((0, 0), (0, n - 7), (n - 7, 0)):
    qr[a:a + 7, b:b + 7] = False; qr[a:a + 7, b] = qr[a:a + 7, b + 6] = qr[a, b:b + 7] = qr[a + 6, b:b + 7] = True; qr[a + 2:a + 5, b + 2:b + 5] = True
for i in range(n):
    for j in range(n):
        if qr[i, j]: dek[int(qy + 8 + i * cel):int(qy + 8 + (i + 1) * cel), int(qx + 8 + j * cel):int(qx + 8 + (j + 1) * cel)] = 30
# beige kraft-rand van het deksel (buiten 0.86 R) -- wordt in het model op de opstaande rand gelegd
kraft = cv2.resize(f1[505:575, 260:740], (544, 480))            # dekselrand van het middelste bekertje links
kl = cv2.GaussianBlur(cv2.cvtColor(np.clip(kraft, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 40)
kraft = kraft / kl[..., None] * kl.mean()
kraft = kraft / kraft.reshape(-1, 3).mean(0) * np.array([138, 172, 198.0])   # kraftbeige (foto 2, daglicht)
rand_m = np.clip((rr - 0.86) / 0.015, 0, 1)[..., None]
kmid = kraft.reshape(-1, 3).mean(0)
dek = dek * (1 - rand_m) + kmid * rand_m

atlas = np.zeros((1024, 1024, 3), np.float32)
atlas[0:SH] = voor; atlas[SH:2 * SH] = achter
atlas[544:1024, 0:480] = dek; atlas[544:1024, 480:1024] = kraft
cv2.imwrite(os.path.join(HIER, 'dauwworm-doosje.jpg'), np.clip(atlas, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 90])

# ---------- koelzak (foto 2, middelste witte zak) ----------
f2 = foto('canadese-dauwwormen-2.jpg')
zak = f2[232:300, 100:186]                                         # het midden van de linker zak, met het roze logo
zak = cv2.resize(zak, (256, 256), interpolation=cv2.INTER_CUBIC)
cv2.imwrite(os.path.join(HIER, 'dauwworm-koelzak.jpg'), np.clip(zak * 1.05, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])

# ---------- karton: ambientCG Cardboard002, getint naar de doos op foto 2 ----------
k = cv2.imread(os.path.join(KARTON, 'Cardboard002_1K-JPG_Color.jpg')).astype(np.float32)
k = cv2.resize(k, (512, 512), interpolation=cv2.INTER_AREA)
doel = np.array([112, 152, 188.0])                                 # licht bruin karton (BGR), als de doos op foto 2
k = k / k.reshape(-1, 3).mean(0) * doel
cv2.imwrite(os.path.join(HIER, 'dauwworm-karton.jpg'), np.clip(k, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 88])
nk = cv2.imread(os.path.join(KARTON, 'Cardboard002_1K-JPG_NormalGL.jpg'))
cv2.imwrite(os.path.join(HIER, 'dauwworm-karton-normaal.jpg'), cv2.resize(nk, (512, 512), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 88])
print('klaar', paars, beige, doel)
