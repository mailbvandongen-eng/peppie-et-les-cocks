# python tools/jbl/textuur.py <map met de productfoto's j1..j12 van Coolblue (jbl-charge-6-zwart)>
# Maakt de texturen voor tools/jbl/jbl-charge-6.py uit de productfoto's (coolblue.nl, product 959880, 1120 px breed):
#   stof.jpg / stof-normaal.jpg : naadloze weefselstof, uit de voorkant (j7) geknipt, belichting eruit gehaald
#   plaatjes.jpg                : atlas met het JBL-logo (j7), de passieve radiator (j10), het knoppenpaneel (j5),
#                                 het "CHARGE 6"-plaatje (j2) en een stuk stof voor het handvat
#   logo.json                   : omtrek van het logo (letters + uitroepteken) in pixels van j7, voor het 3D-reliëf
# Nodig: numpy, opencv-python, Pillow.
import sys, os, json
import numpy as np, cv2

BRON = sys.argv[1]; HIER = os.path.dirname(os.path.abspath(__file__))
def foto(n): return cv2.imdecode(np.fromfile(os.path.join(BRON, f'j{n}.img'), np.uint8), cv2.IMREAD_COLOR)

# ---------- stof: 256 px uit j7 (links van het logo, recht van voren), belichting weg, naadloos ----------
j7 = foto(7)
c = j7[60:316, 110:366].astype(np.float32)
licht = cv2.GaussianBlur(c, (0, 0), 14)
c = c / licht * licht.mean((0, 1))                       # gelijkmatig belicht
# naadloos: verschoven kopie onder een vlakke rand mengen; de verschuiving valt op het rooster van het weefsel
F = np.abs(np.fft.fft2(cv2.cvtColor(c, cv2.COLOR_BGR2GRAY) - c.mean())); F[0, 0] = 0
pieken = [divmod(i, 256) for i in np.argsort(F.ravel())[::-1][:8]]
k = [((y + 128) % 256 - 128, (x + 128) % 256 - 128) for y, x in pieken]
best = min(((sy, sx) for sy in range(100, 157) for sx in range(100, 157)),
           key=lambda s: sum(abs(((s[0] * ky + s[1] * kx) / 256 + 0.5) % 1 - 0.5) for ky, kx in k))
r = np.roll(c, best, (0, 1))
t = np.minimum(np.arange(256), 255 - np.arange(256)) / 128.0
w = np.clip(np.minimum.outer(t, t) * 2.2 - 0.25, 0, 1)[..., None]   # 1 in het midden, 0 aan de randen
stof = c * w + r * (1 - w)
stof = cv2.resize(stof, (512, 512), interpolation=cv2.INTER_CUBIC)
cv2.imwrite(os.path.join(HIER, 'stof.jpg'), np.clip(stof, 0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
# normaalkaart uit de helderheid (licht = draad bovenop)
h = cv2.GaussianBlur(cv2.cvtColor(np.clip(stof, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32) / 255, (0, 0), 0.8)
h = h - cv2.GaussianBlur(h, (0, 0), 6)
def wrapgrad(a, ax): return (np.roll(a, -1, ax) - np.roll(a, 1, ax)) / 2
dx, dy = wrapgrad(h, 1) * 9, wrapgrad(h, 0) * 9
n = np.dstack([-dx, dy, np.ones_like(dx)]); n /= np.linalg.norm(n, axis=2, keepdims=True)
cv2.imwrite(os.path.join(HIER, 'stof-normaal.jpg'), cv2.resize(((n[..., ::-1] * 0.5 + 0.5) * 255).astype(np.uint8), (256, 256), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 90])   # 256 px is genoeg (scheelt bestandsgrootte)

# ---------- logo: masker uit de oranje rand + de lichte letters, binnenkanten van de B eruit ----------
LX0, LY0, LX1, LY1 = 380, 95, 745, 315
lc = j7[LY0:LY1, LX0:LX1].astype(int); b_, g_, r_ = lc[..., 0], lc[..., 1], lc[..., 2]; lum = (r_ + g_ + b_) / 3
oranje = (((r_ - g_) > 22) & (r_ > 55)).astype(np.uint8)
oranje = cv2.morphologyEx(oranje, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
licht_ = cv2.morphologyEx((lum > 75).astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
m = ((oranje | licht_) * 255).astype(np.uint8)
f = m.copy(); mm = np.zeros((m.shape[0] + 2, m.shape[1] + 2), np.uint8); cv2.floodFill(f, mm, (0, 0), 128)
vol = (f != 128).astype(np.uint8)
n_, lab, st, _ = cv2.connectedComponentsWithStats((vol & (m == 0)).astype(np.uint8))
for i in range(1, n_):
    sel = lab == i
    if st[i, 4] > 200 and lum[sel].mean() < 45: vol[sel] = 0     # stof binnen in de B
vol = (cv2.GaussianBlur(vol.astype(np.float32), (0, 0), 1.0) > 0.5).astype(np.uint8)
cs, hh = cv2.findContours(vol, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
vormen = []
for i, cnt in enumerate(cs):
    if cv2.contourArea(cnt) < 150 or hh[0][i][3] != -1: continue
    buiten = cv2.approxPolyDP(cnt, 0.6, True)[:, 0].tolist()
    gaten = [cv2.approxPolyDP(cs[j], 0.6, True)[:, 0].tolist() for j in range(len(cs)) if hh[0][j][3] == i and cv2.contourArea(cs[j]) > 100]
    vormen.append({'buiten': [[x + LX0, y + LY0] for x, y in buiten], 'gaten': [[[x + LX0, y + LY0] for x, y in g] for g in gaten]})
print('logo:', len(vormen), 'vormen,', sum(len(v['gaten']) for v in vormen), 'gaten')

# ---------- atlas 1024x1024 ----------
A = np.zeros((1024, 1024, 3), np.uint8); vakken = {}
def plak(naam, beeld, x, y, w, h):
    A[y:y + h, x:x + w] = cv2.resize(beeld, (w, h), interpolation=cv2.INTER_AREA if beeld.shape[1] > w else cv2.INTER_CUBIC)
    vakken[naam] = [x / 1024, y / 1024, w / 1024, h / 1024]
plak('logo', (j7[LY0:LY1, LX0:LX1] * 0.78).astype(np.uint8), 0, 0, 730, 440)   # 2x vergroot; iets donkerder, de foto is fel belicht
j10 = foto(10); RC = (577, 553); RR = 300                                   # radiator: midden en straal in j10
plak('radiator', j10[RC[1] - RR:RC[1] + RR, RC[0] - RR:RC[0] + RR], 0, 448, 576, 576)
j5 = foto(5); plak('paneel', j5[130:226, 396:728], 584, 448, 440, 128)
j2 = foto(2); plak('plaatje', j2[4:44, 440:680], 584, 584, 440, 74)
cv2.imwrite(os.path.join(HIER, 'plaatjes.jpg'), A, [cv2.IMWRITE_JPEG_QUALITY, 92])
json.dump({'vormen': vormen, 'vakken': vakken, 'logo_px': [LX0, LY0, LX1, LY1], 'radiator': {'midden': RC, 'straal': RR, 'px_per_m': 1120 / 0.0936}},
          open(os.path.join(HIER, 'logo.json'), 'w'))
print('verschuiving', best, 'klaar')
