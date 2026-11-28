# blender -b -P tools/jbl/jbl-charge-6.py -- <uit.glb>
# De JBL Charge 6 (zwart), nagebouwd naar de productfoto's van Coolblue (coolblue.nl, product 959880) en de maten van
# Coolblue/MediaMarkt: 22,88 x 9,85 x 9,4 cm (b x h x d), 0,96 kg. Op Sketchfab staat geen Charge 6; de Charge 3 en 4 daar
# (CC BY) hebben een ander lijf (staander eronder, klein logo-plaatje, andere kappen), dus zelf gebouwd.
# Vorm: een pil van zwart geweven stof met een platte onderkant. De doorsnede komt uit de eindfoto (j10), de lengteprofielen
# (boven-, onder- en zijkant) uit de foto's van voren (j7), boven (j5) en onder (j2). Aan beide uiteinden een zwarte rubberen
# kap met golvende bumperrand en een verzonken passieve radiator (het uitroepteken-motief, foto j10 als textuur).
# Voorop het grote JBL-logo als echt reliëf: de omtrek is uit foto j7 overgetrokken (tools/jbl/textuur.py -> logo.json),
# loodrecht op het lijf geprojecteerd, 1,5 mm opgehoogd; bovenvlak = de foto, zijkanten oranje.
# Verder: knoppen - > + bovenvoor, het knoppenpaneel (Auracast, aan/uit, Bluetooth) bovenachter, twee metalen
# draaglussen bovenop, twee rubberen strips en het "CHARGE 6"-plaatje onder, het ledje voorop.
# Het afneembare handvat (stoffen band met twee klemmen, foto j8) is een aparte node "handvat".
# Texturen (tools/jbl/, gemaakt met textuur.py uit de productfoto's): stof.jpg + stof-normaal.jpg, plaatjes.jpg (atlas).
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y); de glTF-export maakt er weer Y-omhoog van.
import bpy, bmesh, sys, os, math, json
import numpy as np
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

OUT = sys.argv[sys.argv.index('--') + 1]
HIER = os.path.dirname(os.path.abspath(__file__))
MET_HANDVAT = os.environ.get('JBL_HANDVAT', '1') != '0'   # alleen voor proefbeelden zonder handvat
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
sc = bpy.context.scene
LOGO = json.load(open(os.path.join(HIER, 'logo.json')))

def P(x, y, z): return Vector((x, -z, y))
def G(v): return Vector((v[0], v[1], v[2]))          # spel-coördinaten als Vector (we rekenen in spel-assen)

# ---------- maten (meter, spel-assen) ----------
L, H, D = 0.2288, 0.0985, 0.094
PXM = 1120 / L                                       # pixels per meter in de foto's van voren/boven/onder
# lengteprofielen, gemeten op de silhouetten (afstand tot het midden in px, gemiddeld links/rechts)
d_px = np.array([0, 60, 120, 180, 240, 300, 360, 420, 480, 510, 530])
boven_px = np.array([0, 1, 2, 5, 6, 10, 15, 20, 28, 38, 46])            # j7: bovenrand
onder_px = np.array([493, 493, 493, 492, 488, 474, 460, 450, 445, 430, 424])  # j7: onderrand
diep_px = np.array([465, 464, 460, 456, 452, 440, 434, 425, 409, 397, 390])  # j5: breedte van boven gezien
def glad(xs, ys):                                    # even polynoom door de meetpunten: geen knikken in de schaduw
    c = np.polyfit((xs / PXM) ** 2, ys, 4); return lambda x: float(np.polyval(c, x * x))
yt = glad(d_px, H - boven_px / 493 * H)
yb = glad(d_px, (493 - onder_px) / 493 * H)
hw = glad(d_px, diep_px / 465 * D / 2)
# doorsnede uit de eindfoto j10 (1177 px hoog = 9,85 cm): (hoogte 0..1, halve breedte 0..1)
PROF = [(0, 0), (0, .5), (.004, .545), (.023, .574), (.065, .639), (.108, .683), (.150, .732), (.193, .784), (.235, .837),
        (.278, .885), (.320, .923), (.363, .954), (.405, .978), (.448, .992), (.490, 1.0), (.533, .996), (.575, .985),
        (.618, .965), (.660, .936), (.703, .900), (.745, .852), (.788, .793), (.830, .722), (.873, .636), (.915, .526),
        (.9575, .369), (.985, .22), (1, 0)]
NH = 32; NR = 2 * NH                                  # punten per halve / hele omtrek
def bemonster():                                      # gelijk verdeeld over de booglengte (in meters op de middendoorsnede)
    p = np.array([(b * D / 2, h * H) for h, b in PROF]); s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(p, axis=0), axis=1))]
    t = np.linspace(0, s[-1], NH + 1); return np.c_[np.interp(t, s, p[:, 0]) / (D / 2), np.interp(t, s, p[:, 1]) / H], s[-1]
HALF, OMTREK_HALF = bemonster()
def doorsnede(x):                                     # NR punten (z, y): 0 = midden onder, dan langs de voorkant omhoog, achterkant terug
    a, b_, c = hw(x), yb(x), yt(x); pts = []
    w = 0.75 * max(0.0, (abs(x) - 0.06) / 0.044) ** 1.5    # naar de kappen toe wordt de doorsnede ronder (foto j10)
    cy, ry = (b_ + c) / 2, (c - b_) / 2
    for j in range(NR):
        k = j if j <= NH else NR - j; s = 1 if j <= NH else -1
        z, y = s * HALF[k][0] * a, b_ + HALF[k][1] * (c - b_)
        t = math.atan2((y - cy) / ry, z / a); ez, ey = a * math.cos(t), cy + ry * math.sin(t)
        pts.append((z + (ez - z) * w, y + (ey - y) * w))
    return pts

# ---------- materialen ----------
def mat(naam, kleur, rough=0.6, metal=0.0, beeld=None, normaal=None, nsterk=0.6):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if beeld:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = beeld; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if normaal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normaal; t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = nsterk
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m
def beeld(n): return bpy.data.images.load(os.path.join(HIER, n))
STOF = mat('stof', (1, 1, 1), 0.88, beeld=beeld('stof.jpg'), normaal=beeld('stof-normaal.jpg'), nsterk=0.8)
PLAAT = mat('plaatjes', (1, 1, 1), 0.72, beeld=beeld('plaatjes.jpg'))
RUBBER = mat('rubber', (0.042, 0.042, 0.044), 0.4)
RUBBER_LICHT = mat('rubber-grijs', (0.06, 0.06, 0.062), 0.5)
ORANJE = mat('oranje', (0.8, 0.13, 0.03), 0.45)
METAAL = mat('metaal', (0.07, 0.07, 0.075), 0.35, 0.6)
ZWART = mat('zwart', (0.006, 0.006, 0.006), 0.6)
SYMBOOL = mat('symbool', (0.12, 0.12, 0.125), 0.45)

def obj(naam, bm, mats, ouder, glad_=True):
    me = bpy.data.meshes.new(naam)
    for v in bm.verts: v.co = P(*v.co)               # spel-assen -> Blender
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(naam, me); sc.collection.objects.link(o)
    for m in (mats if isinstance(mats, (list, tuple)) else [mats]): me.materials.append(m)
    if glad_ is True:
        for p in me.polygons: p.use_smooth = True
    o.parent = ouder; return o

wortel = bpy.data.objects.new('jbl-charge-6', None); sc.collection.objects.link(wortel)

# ---------- het lijf: stoffen buis, ringen langs x ----------
XS = 0.1035; NX = 44
xs = [XS * math.sin(math.pi / 2 * (2 * i / NX - 1)) for i in range(NX + 1)]   # dichter bij de uiteinden
RINGEN = [doorsnede(x) for x in xs]
bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UV')
V = [[bm.verts.new((x, y, z)) for (z, y) in r] for x, r in zip(xs, RINGEN)]
TEGEL = 0.0522                                       # stof.jpg beslaat 5,2 cm (256 px foto bij 49 px/cm)
omtrek = 2 * OMTREK_HALF
for i in range(NX):
    for j in range(NR):
        jj = (j + 1) % NR
        f = bm.faces.new((V[i][j], V[i][jj], V[i + 1][jj], V[i + 1][j]))
        for l, (a, b) in zip(f.loops, ((i, j), (i, j + 1), (i + 1, j + 1), (i + 1, j))):
            l[uvl].uv = (xs[a] / TEGEL, b / NR * omtrek / TEGEL)
for f in bm.faces:                                   # normalen naar buiten
    f.normal_update(); c = f.calc_center_median(); cy = (yb(c.x) + yt(c.x)) / 2
    if f.normal.dot(Vector((0, c.y - cy, c.z))) < 0: f.normal_flip()
# BVH van het lijf (spel-assen) om knoppen, logo en strips op het oppervlak te leggen
LIJF_V = [v.co.copy() for v in bm.verts]; LIJF_F = [[v.index for v in f.verts] for f in bm.faces]
bm.verts.index_update(); LIJF_F = [[v.index for v in f.verts] for f in bm.faces]
BVH = BVHTree.FromPolygons(LIJF_V, LIJF_F)
lijf = obj('lijf', bm, STOF, wortel)

# ---------- rubberen kappen met bumperrand en passieve radiator ----------
LOBBEN = [-math.pi / 2 + k * 2 * math.pi / 5 for k in range(5)]
def lob(t):
    return max(math.exp(-(((t - c + math.pi) % (2 * math.pi) - math.pi) / 0.42) ** 2) for c in LOBBEN)
XE = 0.104                                           # referentiedoorsnede voor de kap
RE = doorsnede(XE); CY = (yb(XE) + yt(XE)) / 2; RC = (hw(XE) + (yt(XE) - yb(XE)) / 2) / 2
RAD_R = 0.0226                                       # straal van de radiatorschijf (j10: 270 px bij 119,6 px/cm)
#            x (zonder lob),   schaal, naar-cirkel, lobgewicht
KAPPROFIEL = [('j', 0.0, 1.008, 0.0, 0), ('j', 0.0025, 1.045, 0.15, 0), (0.1068, 0, 1.065, 0.45, 0.5), (0.1100, 0, 1.055, 0.6, 1),
              (0.1126, 0, 1.03, 0.7, 1), (0.1144, 0, 0.96, 0.8, 1), (0.1140, 0, 0.86, 0.9, 1), (0.1118, 0, 0.77, 0.97, 0.5),
              (0.1070, 0, 0.655, 1, 0.1), (0.1030, 0, 0.6, 1, 0), (0.1003, 0, RAD_R / RC, 1, 0)]
def kap(kant):
    bm = bmesh.new(); ringen = []
    for (x0, dx, s, b, lw) in KAPPROFIEL:
        ring = []
        for j, (z, y) in enumerate(RE):
            t = math.atan2(y - CY, z); dz, dy = z, y - CY; n = math.hypot(dz, dy) or 1
            pz = (1 - b) * dz * s + b * dz / n * RC * s; py = (1 - b) * dy * s + b * dy / n * RC * s
            lb = lob(t)
            x = (0.1012 + 0.0015 * math.sin(3 * t) + dx) if x0 == 'j' else x0 - 0.0045 * lw * (1 - lb)
            ring.append(bm.verts.new((kant * x, CY + py, pz)))
        ringen.append(ring)
    for i in range(len(ringen) - 1):
        for j in range(NR):
            jj = (j + 1) % NR; q = (ringen[i][j], ringen[i][jj], ringen[i + 1][jj], ringen[i + 1][j])
            f = bm.faces.new(q if kant > 0 else q[::-1]); f.material_index = 1 if i >= 8 else 0   # trechter naar de radiator: in de schaduw
    bm.normal_update()
    # controle: eerste ring moet naar buiten wijzen
    bm.faces.ensure_lookup_table(); f = bm.faces[0]; c = f.calc_center_median()
    if f.normal.dot(Vector((0, c.y - CY, c.z))) < 0:
        for f in bm.faces: f.normal_flip()
    obj('kap-' + ('rechts' if kant > 0 else 'links'), bm, [RUBBER, ZWART], wortel)
    # radiatorschijf: licht bol, foto j10 als textuur (rechtop, uitroepteken boven)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new('UV'); N = 48; vak = LOGO['vakken']['radiator']
    rf = LOGO['radiator']['straal'] / LOGO['radiator']['px_per_m']
    mid = bm.verts.new((kant * 0.1028, CY, 0)); rand = []
    for k in range(N):
        a = 2 * math.pi * k / N; rand.append(bm.verts.new((kant * 0.1004, CY + RAD_R * math.sin(a), RAD_R * math.cos(a))))
    ring2 = [bm.verts.new((kant * 0.1022, CY + 0.6 * RAD_R * math.sin(2 * math.pi * k / N), 0.6 * RAD_R * math.cos(2 * math.pi * k / N))) for k in range(N)]
    def uv(v):   # kijkend naar de kap: rechts van de kijker is -z (rechterkap) of +z (linkerkap)
        hor = -v.co.z * kant; ver = v.co.y - CY
        return (vak[0] + vak[2] * (0.5 + hor / (2 * rf)), 1 - (vak[1] + vak[3] * (0.5 - ver / (2 * rf))))
    for k in range(N):
        k2 = (k + 1) % N
        for q in ((rand[k], rand[k2], ring2[k2], ring2[k]), (ring2[k], ring2[k2], mid)):
            f = bm.faces.new(q if kant < 0 else q[::-1])
            for l in f.loops: l[uvl].uv = uv(l.vert)
    bm.normal_update(); bm.faces.ensure_lookup_table()
    if bm.faces[0].normal.x * kant < 0:
        for f in bm.faces: f.normal_flip()
    obj('radiator-' + ('rechts' if kant > 0 else 'links'), bm, PLAAT, wortel)
kap(1); kap(-1)

# ---------- reliëf: 2D-vormen loodrecht op het lijf geprojecteerd en opgehoogd ----------
def reliëf(naam, vormen, O, U, Vv, Dr, hoogte, mats, uvf=None, stap=0.0028, ouder=None, zij_mat=None):
    """vormen: [(buiten, [gaten])] in vlak-coördinaten (a, b) in meter; punt = O + a*U + b*V, straal langs Dr."""
    O, U, Vv, Dr = G(O), G(U).normalized(), G(Vv).normalized(), G(Dr).normalized()
    bm = bmesh.new()
    for buiten, gaten in vormen:
        for lus in [buiten] + gaten:
            vs = [bm.verts.new((a, b, 0)) for a, b in lus]
            for i in range(len(vs)): bm.edges.new((vs[i], vs[(i + 1) % len(vs)]))
    bmesh.ops.triangle_fill(bm, use_beauty=True, use_dissolve=False, edges=bm.edges[:])
    xs_ = [v.co.x for v in bm.verts]; ys_ = [v.co.y for v in bm.verts]
    for ax, lo, hi in ((0, min(xs_), max(xs_)), (1, min(ys_), max(ys_))):   # fijner maken zodat het de bolling volgt
        k = lo + stap
        while k < hi:
            no = (1, 0, 0) if ax == 0 else (0, 1, 0); co = (k, 0, 0) if ax == 0 else (0, k, 0)
            bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no); k += stap
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    uit = bmesh.new(); uvl = uit.loops.layers.uv.new('UV'); boven, onder, ab = {}, {}, {}
    for v in bm.verts:
        a, b = v.co.x, v.co.y; hit = BVH.ray_cast(O + U * a + Vv * b, Dr)
        if hit[0] is None: hit = (O + U * a + Vv * b + Dr * 0.3, -Dr, 0, 0)
        n = hit[1] if hit[1].dot(Dr) < 0 else -hit[1]
        boven[v] = uit.verts.new(hit[0] + n * hoogte); onder[v] = uit.verts.new(hit[0] - n * 0.0006); ab[v] = (a, b)
    for f in bm.faces:
        nf = uit.faces.new([boven[v] for v in f.verts]); nf.material_index = 0; nf.smooth = True
        if uvf:
            for l, v in zip(nf.loops, f.verts): l[uvl].uv = uvf(*ab[v])
    for e in bm.edges:
        if e.is_boundary:
            f = e.link_faces[0]; a, b = e.verts
            # volgorde zoals in het vlak, zodat de zijkant naar buiten wijst
            lv = list(f.verts); i = lv.index(a)
            if lv[(i + 1) % len(lv)] != b: a, b = b, a
            nf = uit.faces.new((boven[b], boven[a], onder[a], onder[b])); nf.material_index = 1 if zij_mat else 0; nf.smooth = False
    uit.normal_update()
    # bovenvlak moet naar buiten (tegen de straal in) wijzen
    top = [f for f in uit.faces if f.material_index == 0 and f.smooth]
    if sum(f.normal.dot(Dr) for f in top) > 0:
        for f in uit.faces: f.normal_flip()
    for e in uit.edges:
        if not all(f.smooth for f in e.link_faces): e.smooth = False
    bm.free(); bm = uit
    return obj(naam, bm, [mats] + ([zij_mat] if zij_mat else []), ouder or wortel, glad_=None)

def stadion(lang, breed, n=8, cx=0, cy=0, liggend=True):   # pilvorm; liggend: lang langs a
    r = breed / 2; h = lang / 2 - r; pts = []
    for k in range(n + 1): t = -math.pi / 2 + math.pi * k / n; pts.append((h + r * math.cos(t), r * math.sin(t)))
    for k in range(n + 1): t = math.pi / 2 + math.pi * k / n; pts.append((-h + r * math.cos(t), r * math.sin(t)))
    return [(cx + a, cy + b) if liggend else (cx + b, cy + a) for a, b in pts]
def vak_uv(naam, a0, a1, b0, b1, flipu=False, flipv=False):   # vlakcoördinaten -> atlas (b0 = bovenrand van het plaatje)
    vk = LOGO['vakken'][naam]
    def f(a, b):
        s = (a - a0) / (a1 - a0); t = (b - b0) / (b1 - b0)
        if flipu: s = 1 - s
        if flipv: t = 1 - t
        return (vk[0] + vk[2] * s, 1 - (vk[1] + vk[3] * t))
    return f

# het JBL-logo voorop: omtrek uit j7 (pixels) -> vlak x/y, straal van voren
def px2(u, v): return ((u - 560) / PXM, (493 - v) / 493 * H)
vormen = [([px2(*p) for p in vm['buiten']], [[px2(*p) for p in g] for g in vm['gaten']]) for vm in LOGO['vormen']]
lx0, ly0, lx1, ly1 = LOGO['logo_px']; a0, b0 = px2(lx0, ly0); a1, b1 = px2(lx1, ly1)
reliëf('logo', vormen, (0, 0, 0.3), (1, 0, 0), (0, 1, 0), (0, 0, -1), 0.0015, PLAAT, vak_uv('logo', a0, a1, b0, b1), zij_mat=ORANJE, stap=0.0022)
# ledje onder het logo (j7: x 545-578, y 350-430)
reliëf('led', [(stadion(0.0165, 0.0062, 6, 0, px2(561, 390)[1], liggend=False), [])], (0, 0, 0.3), (1, 0, 0), (0, 1, 0), (0, 0, -1), 0.001, RUBBER_LICHT, stap=0.003)

# bovenop: knoppenpaneel (j5: x 400-722, y 135-220 -> achter het midden), - > + ervoor
def top_px(u, v): return ((u - 560) / PXM, (v - 233) / 467 * D)        # j5: (x, z); beeld-onder = voorkant
pz = top_px(561, 177)[1]
reliëf('paneel', [(stadion(0.066, 0.0172, 8, 0, pz), [])], (0, 0.3, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), 0.0018, PLAAT,
       vak_uv('paneel', *[top_px(396, 0)[0], top_px(728, 0)[0]], top_px(0, 130)[1], top_px(0, 226)[1]), zij_mat=RUBBER, stap=0.004)
zk = top_px(0, 306)[1]; dk = 0.0016
def rechthoek(cx, cy, w, h): return [(cx - w / 2, cy - h / 2), (cx + w / 2, cy - h / 2), (cx + w / 2, cy + h / 2), (cx - w / 2, cy + h / 2)]
xm, xp, xpl = top_px(447, 0)[0], top_px(677, 0)[0], top_px(566, 0)[0]
plus = [(xp - dk / 2, zk - 0.0052), (xp + dk / 2, zk - 0.0052), (xp + dk / 2, zk - dk / 2), (xp + 0.0052, zk - dk / 2), (xp + 0.0052, zk + dk / 2),
        (xp + dk / 2, zk + dk / 2), (xp + dk / 2, zk + 0.0052), (xp - dk / 2, zk + 0.0052), (xp - dk / 2, zk + dk / 2), (xp - 0.0052, zk + dk / 2),
        (xp - 0.0052, zk - dk / 2), (xp - dk / 2, zk - dk / 2)]
def driehoek(cx, cy, r): return [(cx + r * math.cos(t), cy + r * math.sin(t)) for t in (0, 2 * math.pi / 3, 4 * math.pi / 3)]
symbolen = [(rechthoek(xm, zk, 0.0104, dk), []), (plus, []), (driehoek(xpl, zk, 0.0056), [driehoek(xpl + 0.0004, zk, 0.0056 - 2 * dk)[::-1]])]
reliëf('knoppen', symbolen, (0, 0.3, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), 0.0009, SYMBOOL, stap=0.003)

# draaglussen bovenop (j5: midden op x = 200 en 920 px, 1,8 x 2,6 cm), metaal met een dwarsstaafje
LUS_X = top_px(200, 0)[0]
for k, x in (('l', LUS_X), ('r', -LUS_X)):
    reliëf('lus-' + k, [(stadion(0.0262, 0.0178, 8, x, 0, liggend=False), [stadion(0.0205, 0.0122, 8, x, 0, liggend=False)[::-1]])],
           (0, 0.3, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), 0.0022, METAAL, stap=0.004)
    reliëf('lus-gat-' + k, [(stadion(0.0206, 0.0123, 8, x, 0, liggend=False), [])], (0, 0.3, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0), 0.0003, ZWART, stap=0.004)
def buis(naam, pts, r, m, ouder, zijden=8, plat=1.0, breedas=None):
    bm = bmesh.new(); ringen = []
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized()
        a = (breedas or Vector((0, 0, 1))); a = (a - t * a.dot(t)).normalized(); b = t.cross(a)
        ringen.append([bm.verts.new(p + (a * math.cos(z / zijden * 2 * math.pi) + b * plat * math.sin(z / zijden * 2 * math.pi)) * r) for z in range(zijden)])
    uvl = bm.loops.layers.uv.new('UV'); lengte = [0]
    for k in range(1, len(pts)): lengte.append(lengte[-1] + (pts[k] - pts[k - 1]).length)
    for k in range(len(ringen) - 1):
        for z in range(zijden):
            f = bm.faces.new((ringen[k][z], ringen[k][(z + 1) % zijden], ringen[k + 1][(z + 1) % zijden], ringen[k + 1][z]))
            for l, (kk, zz) in zip(f.loops, ((k, z), (k, z + 1), (k + 1, z + 1), (k + 1, z))): l[uvl].uv = (zz / zijden * r * 6.3 / TEGEL, lengte[kk] / TEGEL)
    bm.faces.new(ringen[0][::-1]); bm.faces.new(ringen[-1])
    bm.normal_update(); return obj(naam, bm, m, ouder)
def boven_y(x, z=0.0):
    return BVH.ray_cast(Vector((x, 0.3, z)), Vector((0, -1, 0)))[0].y
for k, x in (('l', LUS_X), ('r', -LUS_X)):
    y = boven_y(x) + 0.0014; buis('lus-staaf-' + k, [Vector((x, y, -0.0105)), Vector((x, y, 0.0105))], 0.0016, METAAL, wortel, 8)

# onderkant: twee rubberen strips (j2: x 330-790, op z = -/+ 2,3 cm), "CHARGE 6"-plaatje achteronder
for k, z in (('a', -0.0228), ('v', 0.0232)):
    reliëf('strip-' + k, [(stadion(0.094, 0.0082, 8, 0, z), [])], (0, -0.3, 0), (1, 0, 0), (0, 0, 1), (0, 1, 0), 0.0016, RUBBER_LICHT, stap=0.004)
# j6 (achterkant): het plaatje met de USB-C-poort zit op ± 2,5 cm hoogte, recht van achteren te zien
reliëf('plaatje', [(stadion(0.0475, 0.0078, 6), [])], (0, 0.0245, -0.3), (-1, 0, 0), (0, 1, 0), (0, 0, 1), 0.0009, PLAAT,
       vak_uv('plaatje', -0.0490 / 2, 0.0490 / 2, 0.0041, -0.0041), stap=0.004)

# ---------- handvat (afneembaar): stoffen band met twee klemmen in de lussen ----------
hv = bpy.data.objects.new('handvat', None); sc.collection.objects.link(hv); hv.parent = wortel
ytop = boven_y(LUS_X)
def klem(x, s):                              # afgeronde klem (superellipsoïde), iets naar buiten gekanteld zoals op foto j8
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=16, v_segments=10, radius=1.0)
    for v in bm.verts:
        v.co = Vector([math.copysign(abs(c) ** 0.4, c) for c in v.co])
    bmesh.ops.scale(bm, vec=(0.0075, 0.017, 0.0125), verts=bm.verts)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-s * 0.22, 3, 'Z'))
    bmesh.ops.translate(bm, vec=(x + s * 0.003, ytop + 0.0145, 0), verts=bm.verts)
    obj('klem', bm, RUBBER, hv)
for s, x in ((-1, LUS_X), (1, -LUS_X)): klem(x, s)
boog = []
for k in range(41):
    t = math.pi * k / 40; c = math.cos(t); sn = math.sin(t)
    x = math.copysign(abs(c) ** 0.62, c) * (abs(LUS_X) + 0.0045)
    boog.append(Vector((x, ytop + 0.022 + 0.055 * sn ** 0.85, 0)))
band = buis('band', boog, 0.0102, STOF, hv, 14, plat=0.33, breedas=Vector((0, 0, 1)))

# ---------- op de grond zetten, midden op x = z = 0, exporteren ----------
bpy.context.view_layer.update()
mins = [min((o.matrix_world @ v.co).z for v in o.data.vertices) for o in sc.objects if o.type == 'MESH']
wortel.location = (0, 0, -min(mins))
print('hoogte-correctie', -min(mins))
if not MET_HANDVAT:
    for o in list(hv.children): bpy.data.objects.remove(o)
    bpy.data.objects.remove(hv)
def samenvoegen(delen, naam):                # minder losse meshes = kleiner bestand en minder draw calls
    bpy.ops.object.select_all(action='DESELECT')
    for o in delen: o.select_set(True)
    bpy.context.view_layer.objects.active = delen[0]; bpy.ops.object.join(); delen[0].name = naam; delen[0].data.name = naam
    return delen[0]
bpy.context.view_layer.update()
romp = samenvoegen([lijf] + [o for o in wortel.children if o.type == 'MESH' and o is not lijf], 'speaker')
if MET_HANDVAT:
    h = samenvoegen([o for o in hv.children if o.type == 'MESH'], 'handvat-mesh')
for o in sc.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='JPEG', export_jpeg_quality=90)
print('klaar', OUT)
