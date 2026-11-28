# blender -b -P tools/tent/trakker-tempest.py -- <uit.glb>
# De Trakker Tempest RS Brolly (Full System), nagebouwd naar de productfoto's (hengelsportvught.nl) en de maten van Trakker:
# buiten 255 cm breed, 215 cm diep, 145 cm hoog. Een paraplu-shelter: bovenop zit het scharnierblok ("Rapid Knuckle") met twee
# stangen naar voren (het afdak). Vanuit het blok lopen gebogen armen naar zwarte knikstukken op ± 1,05 m, daaronder rechte poten
# naar de grond: twee voorhoeken, twee achterhoeken en één achter in het midden. Het doek hangt ertussen (Blender-stofsimulatie,
# zodat het echt doorzakt en spant), met grote gaasramen en opgerolde flappen in de zij- en achterwanden, en twee stormstokken.
# De voorkant is open (er moet een stretcher in kunnen). Met VOORPANEEL = True komt het voorpaneel met deur erbij (node "voorpaneel").
# Doek: "Fabric082A" van ambientCG (CC0), olijfgroen getint naar de kleur op de foto's.
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y); de glTF-export maakt er weer Y-omhoog van.
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
VOORPANEEL = False                         # open voorkant, zoals op de foto met het bedchair
STRETCHER = True                           # de Fox Camolite erin
HIER = os.path.dirname(os.path.abspath(__file__))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
sc = bpy.context.scene

def P(x, y, z): return Vector((x, -z, y))
def lerp(a, b, t): return a + (b - a) * t

# ---------- maten (meter, spel-assen) ----------
H, KH = 1.45, 1.05                       # hoogte bij het blok, hoogte van de knikken
NAAF = P(0, H, -0.55)                     # het scharnierblok: iets achter de voorkant
VOET = {'vl': P(-1.27, 0, 0.0), 'vr': P(1.27, 0, 0.0), 'al': P(-1.12, 0, -1.55), 'ar': P(1.12, 0, -1.55), 'a': P(0, 0, -2.15)}
SPREID = {'vl': 0.86, 'vr': 0.86, 'al': 0.95, 'ar': 0.95, 'a': 0.96}   # voorpoten staan schuiner naar buiten (foto van voren)
def knie(k):
    v = VOET[k]; n = Vector((NAAF.x, NAAF.y, 0)); h = n + (Vector((v.x, v.y, 0)) - n) * SPREID[k]; return Vector((h.x, h.y, KH))
VIZ = {'l': P(-0.5, 1.42, 0.14), 'r': P(0.5, 1.42, 0.14)}             # de voorhoeken van het afdak

def boog(a, b, hoog, n):   # gebogen arm van a naar b: vertrekt vlak uit het blok, buigt naar beneden naar de knik
    c = Vector((lerp(a.x, b.x, 0.62), lerp(a.y, b.y, 0.62), max(a.z, b.z) + hoog))
    return [(1 - t) ** 2 * a + 2 * (1 - t) * t * c + t * t * b for t in [i / n for i in range(n + 1)]]
def lijn(a, b, n): return [lerp(a, b, i / n) for i in range(n + 1)]
def rib(k, n_arm=18, n_poot=12):          # van het blok via de knik naar de voet
    return boog(NAAF, knie(k), 0.05, n_arm) + lijn(knie(k), VOET[k], n_poot)[1:]

# ---------- materialen ----------
def mat(naam, kleur, rough=0.6, metal=0.0, beeld=None, normaal=None):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if beeld:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = beeld; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if normaal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normaal; t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.7
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m
def getint(pad, tint, naam):               # doektextuur olijfgroen kleuren (de glTF-export neemt geen kleurmenging mee)
    im = bpy.data.images.load(pad); px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px)
    px = px.reshape(-1, 4); px[:, :3] *= np.array(tint, dtype=np.float32) / px[:, :3].mean(0); px = np.clip(px, 0, 1)
    nieuw = bpy.data.images.new(naam, im.size[0], im.size[1]); nieuw.pixels.foreach_set(px.ravel()); nieuw.file_format = 'JPEG'; nieuw.pack()
    return nieuw
OLIJF, DONKER = (0.385, 0.375, 0.3), (0.3, 0.29, 0.225)             # sRGB, gemeten op de foto's (± 110,103,89)
DOEK = mat('doek', (1, 1, 1), 0.85, beeld=getint(os.path.join(HIER, 'stof/kleur.jpg'), OLIJF, 'doek-kleur'),
           normaal=bpy.data.images.load(os.path.join(HIER, 'stof/normaal.jpg')))
RAND = mat('rand', (1, 1, 1), 0.85, beeld=getint(os.path.join(HIER, 'stof/kleur.jpg'), DONKER, 'rand-kleur'))
GAAS = mat('gaas', (0.028, 0.03, 0.026), 0.95)
STOK = mat('stok', (0.03, 0.032, 0.03), 0.45, 0.4)
ZWART = mat('zwart', (0.008, 0.008, 0.008), 0.5)
BINNEN = mat('binnen', (1, 1, 1), 0.9, beeld=getint(os.path.join(HIER, 'stof/kleur.jpg'), (0.2, 0.195, 0.155), 'binnen-kleur'))
for m in (RAND, GAAS): m.use_backface_culling = False
for m in (DOEK, BINNEN): m.use_backface_culling = True     # buiten: olijf; binnen (in de schaduw): donkerder

def obj(naam, bm, m, ouder=None):
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(naam, me); sc.collection.objects.link(o)
    me.materials.append(m); o.parent = ouder
    for p in me.polygons: p.use_smooth = True
    return o

# ---------- doekpanelen: Coons-vlak tussen vier randen, randen vastgepind, dan stofsimulatie ----------
def coons(L, R, T, B, nu, nv):           # L/R: v van 0..1 (boven->onder), T/B: u van 0..1 (links->rechts); lijsten van punten
    def s(c, t): f = t * (len(c) - 1); i = min(int(f), len(c) - 2); return lerp(c[i], c[i + 1], f - i)
    G = []
    for j in range(nv + 1):
        v = j / nv; rij = []
        for i in range(nu + 1):
            u = i / nu
            p = (1 - u) * s(L, v) + u * s(R, v) + (1 - v) * s(T, u) + v * s(B, u) \
                - ((1 - u) * (1 - v) * T[0] + u * (1 - v) * T[-1] + (1 - u) * v * B[0] + u * v * B[-1])
            rij.append(p)
        G.append(rij)
    return G
def paneel(naam, G, m=DOEK, krimp=-0.02, ouder=None, sim=True):  # krimp < 0: wat speling, zodat het doek hangt en plooit
    nv, nu = len(G) - 1, len(G[0]) - 1
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in rij] for rij in G]
    uv = bm.loops.layers.uv.new('UV')
    breed = sum((G[nv // 2][i + 1] - G[nv // 2][i]).length for i in range(nu)); hoog = sum((G[j + 1][nu // 2] - G[j][nu // 2]).length for j in range(nv))
    for j in range(nv):
        for i in range(nu):
            f = bm.faces.new((V[j][i], V[j + 1][i], V[j + 1][i + 1], V[j][i + 1]))
            for l, (a, b) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))): l[uv].uv = (a / nu * breed / 0.5, b / nv * hoog / 0.5)
    o = obj(naam, bm, m, ouder)
    if sim:
        vg = o.vertex_groups.new(name='pin'); rand = [j * (nu + 1) + i for j in range(nv + 1) for i in range(nu + 1) if j in (0, nv) or i in (0, nu)]
        vg.add(rand, 1.0, 'REPLACE')
        c = o.modifiers.new('stof', 'CLOTH'); st = c.settings; st.vertex_group_mass = 'pin'; st.quality = 10; st.mass = 0.3
        st.tension_stiffness = st.compression_stiffness = 15; st.bending_stiffness = 0.25; st.shrink_min = krimp
        c.point_cache.frame_start, c.point_cache.frame_end = 1, 60
    return o, nu, nv
def bak(o):                                # stofsimulatie doorrekenen en het resultaat vastleggen
    dg = bpy.context.evaluated_depsgraph_get(); me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    print('stof', o.name, 'max verplaatsing %.3f m' % max((a.co - b.co).length for a, b in zip(me.vertices, o.data.vertices)))
    oud = o.data; o.modifiers.clear(); o.data = me; bpy.data.meshes.remove(oud)

wortel = bpy.data.objects.new('trakker-tempest', None); sc.collection.objects.link(wortel)
if VOORPANEEL: voorp = bpy.data.objects.new('voorpaneel', None); sc.collection.objects.link(voorp); voorp.parent = wortel
NU, NV = 26, 34
panelen = []
for (a, b, naam) in [('vl', 'al', 'zij-links'), ('al', 'a', 'achter-links'), ('a', 'ar', 'achter-rechts'), ('ar', 'vr', 'zij-rechts')]:
    L, R = rib(a)[1:], rib(b)[1:]; G = coons(L, R, lijn(L[0], R[0], 8), lijn(VOET[a], VOET[b], 8), NU, NV)   # begint net onder het blok
    panelen.append((naam, *paneel(naam, G, krimp=-0.004, ouder=wortel), len(boog(NAAF, knie(a), 0.05, 18)) - 2, len(L) - 1))
# schouders: tussen de afdakstang, de arm naar de voorknik en de voorrand van het afdak
for kant, k in (('l', 'vl'), ('r', 'vr')):
    L, R = lijn(NAAF, VIZ[kant], 12)[1:], boog(NAAF, knie(k), 0.05, 18)[1:]
    if kant == 'r': L, R = R, L
    B = lijn(L[-1], R[-1], 10); panelen.append(('schouder-' + kant, *paneel('schouder-' + kant, coons(L, R, lijn(L[0], R[0], 4), B, 16, 16), ouder=wortel), 0, 0))
# afdak tussen de twee stangen
L, R = lijn(NAAF, VIZ['l'], 12)[1:], lijn(NAAF, VIZ['r'], 12)[1:]
panelen.append(('afdak', *paneel('afdak', coons(L, R, lijn(L[0], R[0], 4), lijn(VIZ['l'], VIZ['r'], 8), 14, 10), krimp=-0.01, ouder=wortel), 0, 0))
# voorpaneel: voorrand van het afdak, langs de voorknikken naar de voeten
Lv = lijn(VIZ['l'], knie('vl'), 10) + lijn(knie('vl'), VOET['vl'], 14)[1:]; Rv = lijn(VIZ['r'], knie('vr'), 10) + lijn(knie('vr'), VOET['vr'], 14)[1:]
# voorkant open: alleen de twee vleugels naast de boogvormige opening (zoals op de foto met het bedchair)
BOOG_B, BOOG_H = 0.92, 1.3
def zvoor(y):                               # diepte van het voorvlak op hoogte y: voet (y=0) -> voorknik (y=KH) -> afdakrand (y=1.42)
    kz = -knie('vl').y; return lerp(0.0, kz, y / KH) if y <= KH else lerp(kz, 0.14, (y - KH) / (1.42 - KH))
def boogpunt(t, kant):                      # t 0..1 van de grond tot de top van de boog
    h = t * math.pi / 2; x, y = BOOG_B * math.cos(h) * kant, BOOG_H * math.sin(h); return P(x, y, zvoor(y) - 0.02)
def langs(pts, n):                          # n+1 punten gelijk verdeeld over de lengte van een lijn van punten
    d = [0];
    for i in range(1, len(pts)): d.append(d[-1] + (pts[i] - pts[i - 1]).length)
    uit = []
    for k in range(n + 1):
        t = d[-1] * k / n; i = max(1, next((j for j in range(1, len(d)) if d[j] >= t), len(d) - 1)); f = (t - d[i - 1]) / max(d[i] - d[i - 1], 1e-9)
        uit.append(lerp(pts[i - 1], pts[i], f))
    return uit
if not VOORPANEEL:
    N, M = 40, 8
    for kant, k, z in ((-1, 'vl', 'l'), (1, 'vr', 'r')):
        buiten = lijn(VOET[k], knie(k), 12) + lijn(knie(k), VIZ[z], 8)[1:] + lijn(VIZ[z], P(0, 1.42, 0.14), 6)[1:]
        buiten = [Vector((p.x, p.y, p.z)) for p in buiten]
        binnen_ = [boogpunt(i / 60, kant) for i in range(61)]
        A, B_ = langs(buiten, N), langs(binnen_, N)
        G = [[lerp(A[i], B_[i], j / M) for j in range(M + 1)] for i in range(N + 1)]
        for laag, m in (('vleugel-' + z, DOEK), ('vleugel-' + z + '-binnen', BINNEN)):
            bm = bmesh.new(); V = [[bm.verts.new(p) for p in rij] for rij in G]; uv = bm.loops.layers.uv.new('UV')
            for i in range(N):
                for j in range(M):
                    q = (V[i][j], V[i + 1][j], V[i + 1][j + 1], V[i][j + 1])
                    if (kant > 0) == (laag.endswith('binnen')): q = q[::-1]
                    f = bm.faces.new(q)
                    for l, vv in zip(f.loops, f.verts): l[uv].uv = (vv.co.x / 0.5, vv.co.z / 0.5)
            obj(laag, bm, m, wortel)
if VOORPANEEL:
  Gv = coons(Lv, Rv, lijn(VIZ['l'], VIZ['r'], 10), lijn(VOET['vl'], VOET['vr'], 10), 30, 30)
  voor, vnu, vnv = paneel('voor', [[p + P(0, 0, -0.03) for p in rij] for rij in Gv], krimp=0.004, ouder=voorp)

for f in range(1, 61): sc.frame_set(f)
for (_, o, *_r) in panelen: bak(o)
def binnenkant(o):                         # kopie met omgedraaide normalen en het donkere binnendoek
    me = o.data.copy(); bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    me.materials.clear(); me.materials.append(BINNEN); b = bpy.data.objects.new(o.name + '-binnen', me); sc.collection.objects.link(b); b.parent = o.parent
# welke kant is buiten? de normalen van elk paneel naar buiten zetten (weg van het midden van de tent)
MIDDEN = P(0, 0.5, -1.0)
for (_, o, *_r) in panelen:
    me = o.data; me.update(); n = sum((p.normal for p in me.polygons), Vector()); c = sum((p.center for p in me.polygons), Vector()) / len(me.polygons)
    if n.dot(c - MIDDEN) < 0:
        bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    binnenkant(o)
if VOORPANEEL: bak(voor)

# ---------- ramen, flappen en randen op de gebakken panelen ----------
def raster_van(o, nu, nv): return [[o.data.vertices[j * (nu + 1) + i].co.copy() for i in range(nu + 1)] for j in range(nv + 1)]
def normaal(G, i, j):
    nv, nu = len(G) - 1, len(G[0]) - 1
    du = G[j][min(i + 1, nu)] - G[j][max(i - 1, 0)]; dv = G[min(j + 1, nv)][i] - G[max(j - 1, 0)][i]; n = du.cross(dv).normalized()
    mid = G[j][i]; uit = Vector((mid.x - NAAF.x, mid.y - NAAF.y, 0.3)); return n if n.dot(uit) > 0 else -n
def stuk(G, i0, i1, j0, j1, d):          # een stuk van een paneel, iets naar buiten verschoven
    return [[G[j][i] + normaal(G, i, j) * d for i in range(i0, i1 + 1)] for j in range(j0, j1 + 1)]
def vlak(naam, G, m, ouder):
    bm = bmesh.new(); V = [[bm.verts.new(p) for p in rij] for rij in G]; uv = bm.loops.layers.uv.new('UV')
    for j in range(len(G) - 1):
        for i in range(len(G[0]) - 1):
            f = bm.faces.new((V[j][i], V[j + 1][i], V[j + 1][i + 1], V[j][i + 1]))
            for l, (a, b) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))): l[uv].uv = (a * 0.15, b * 0.15)
    return obj(naam, bm, m, ouder)
def buis(naam, pts, r, m, ouder, zijden=8):
    bm = bmesh.new(); ringen = []
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized(); a = t.cross(Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        ringen.append([bm.verts.new(p + (a * math.cos(z / zijden * 2 * math.pi) + b * math.sin(z / zijden * 2 * math.pi)) * r) for z in range(zijden)])
    for k in range(len(ringen) - 1):
        for z in range(zijden): bm.faces.new((ringen[k][z], ringen[k][(z + 1) % zijden], ringen[k + 1][(z + 1) % zijden], ringen[k + 1][z]))
    bm.faces.new(ringen[0][::-1]); bm.faces.new(ringen[-1])
    return obj(naam, bm, m, ouder)

for (naam, o, nu, nv, kn, _n) in panelen:
    G = raster_van(o, nu, nv)
    if naam.startswith(('zij', 'achter')):
        # het raam: onder de knik, met een donkere rand, gaas en de opgerolde flap erboven (zoals op de foto's van opzij en achter)
        jk = round(kn / (len(rib('a')) - 2) * nv); j0, j1 = jk + 3, nv - 6; i0, i1 = 3, nu - 3
        vlak(naam + '-rand', stuk(G, i0 - 1, i1 + 1, j0 - 1, j1 + 1, 0.003), RAND, wortel)
        vlak(naam + '-gaas', stuk(G, i0, i1, j0, j1, 0.005), GAAS, wortel)
        buis(naam + '-flap', [G[j0 - 1][i] + normaal(G, i, j0 - 1) * 0.022 for i in range(i0 - 1, i1 + 2)], 0.02, DOEK, wortel, 10)
        # naad langs de onderkant van het dak (op knikhoogte)
        buis(naam + '-naad', [G[jk][i] + normaal(G, i, jk) * 0.004 for i in range(nu + 1)], 0.005, RAND, wortel, 6)
# deur in het voorpaneel: ritsen en een gaasvenster bovenin
if VOORPANEEL:
  Gv = raster_van(voor, vnu, vnv); i0, i1, j0, j1 = 10, 20, 4, vnv
  for i in (i0, i1): buis('rits', [Gv[j][i] + normaal(Gv, i, j) * 0.004 for j in range(j0, j1 + 1)], 0.0045, ZWART, voorp, 6)
  buis('rits', [Gv[j0][i] + normaal(Gv, i, j0) * 0.004 for i in range(i0, i1 + 1)], 0.0045, ZWART, voorp, 6)
  vlak('deurraam', stuk(Gv, i0 + 1, i1 - 1, j0 + 1, j0 + 6, 0.004), GAAS, voorp)

# ---------- frame: armen in doekhoezen, zwarte knikstukken, poten, afdakstangen, blok, stormstokken, haringen ----------
for k in VOET:
    arm = boog(NAAF, knie(k), 0.05, 18); buis('hoes-' + k, [p + Vector((0, 0, 0.012)) for p in arm], 0.016, DOEK, wortel, 10)
    kn = knie(k); r = (kn - arm[-3]).normalized(); buis('knik-' + k, [kn - r * 0.07, kn + Vector((0, 0, -0.02)), kn + Vector((0, 0, -0.1))], 0.02, ZWART, wortel, 10)
    v = VOET[k]; buis('poot-' + k, [kn + Vector((0, 0, -0.08)), v + Vector((0, 0, 0.03))], 0.009, STOK, wortel)
    buis('punt-' + k, [v + Vector((0, 0, 0.03)), v + Vector((0, 0, -0.04))], 0.005, ZWART, wortel, 6)
for kant in 'lr':
    buis('stang-' + kant, [NAAF + Vector((0, 0, 0.04)), VIZ[kant] + Vector((0, 0, 0.03))], 0.011, ZWART, wortel)
    x = -0.42 if kant == 'l' else 0.42   # stormstokken: vlak voor de opening, bijna rechtop, tot de voorrand van het afdak
    buis('stormstok-' + kant, [P(x * 1.08, -0.04, 0.42), P(x, 1.43, 0.15)], 0.0065, STOK, wortel)
bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0); bmesh.ops.scale(bm, vec=(0.16, 0.12, 0.06), verts=bm.verts)
bmesh.ops.translate(bm, vec=NAAF + Vector((0, 0, 0.05)), verts=bm.verts); obj('blok', bm, ZWART, wortel)
for k in ('vl', 'al', 'a', 'ar', 'vr'):
    for t in (0.33, 0.66):
        nxt = {'vl': 'al', 'al': 'a', 'a': 'ar', 'ar': 'vr', 'vr': None}[k]
        if nxt: p = lerp(VOET[k], VOET[nxt], t); buis('haring', [p + Vector((0, 0, 0.025)), p + Vector((0, 0, -0.03))], 0.004, ZWART, wortel, 5)

if not VOORPANEEL:                          # bies langs de opening
    buis('bies', [boogpunt(i / 30, -1) for i in range(30)] + [boogpunt(1 - i / 30, 1) for i in range(31)], 0.012, RAND, wortel, 8)

# ---------- de stretcher erin (assets/kamperen/fox-camolite.glb, gemaakt met tools/bed/fox-camolite.py) ----------
# dwars in de tent, zoals op de foto met de open voorkant; node "stretcher" (in het spel weg te laten of te verplaatsen)
BED = os.path.join(HIER, '..', '..', 'assets', 'kamperen', 'fox-camolite.glb')
if STRETCHER and os.path.exists(BED):
    voor_import = set(bpy.data.objects); bpy.ops.import_scene.gltf(filepath=BED)
    st = bpy.data.objects.new('stretcher', None); sc.collection.objects.link(st); st.parent = wortel
    st.location = P(0, 0, -0.95); st.rotation_euler = (0, 0, math.pi / 2)
    for o in set(bpy.data.objects) - voor_import:
        if o.parent is None: o.parent = st
# ---------- exporteren ----------
for o in sc.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='JPEG', export_jpeg_quality=88)
print('klaar', OUT)
