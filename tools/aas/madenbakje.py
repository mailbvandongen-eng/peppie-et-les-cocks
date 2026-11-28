# blender -b -P tools/aas/madenbakje.py -- <dicht|open|made> <uit.glb>
# Het FTM-madenbakje van 1 liter (FTM = Fishing Tackle Max) en maden.
# Bron: visgigant.nl "FTM Baitbox 1 liter Geel vierkant" (de oude link ftm-maden-bakje-1-liter geeft 404; dit is hetzelfde
# FTM-bakje van 1 liter in de winkel). Maten van die pagina: 16,5 x 16,5 x 6 cm, inhoud 1 liter, "deksel met gaatjes zodat het
# aas voldoende zuurstof krijgt". Eén productfoto (vooraanzicht, iets van boven): geel PP-bakje met schuin toelopende wanden en een
# verdikte bovenrand, los melkwit drukdeksel (geen scharnier) met omgezette rand en stapelribbels, zwart FTM-etiket voorop.
# Uit de foto gemeten (35 px/cm): deksel 17 cm breed, deksel-rand 1,3 cm hoog, bakje 4,7 cm onder het deksel uit, onderkant
# ~14 cm breed (wanden lopen schuin), etiket 6,9 x 1,7 cm met het midden 2,2 cm boven de bodem. De gaatjes zijn op de kleine foto
# niet te zien: 11 x 11 gaatjes van 2 mm (textuur) zoals op gelijksoortige bakjes (Caperlan LVB 1 l: 16,5 cm, deksel 17 cm).
# Maden: witte hengelsportmaden (larven van de bromvlieg), 18 mm lang, 4 mm dik: spitse kop met zwarte mondhaakjes,
# 12 ringen, dikste deel achterin, stompe achterkant met twee bruine ademvlekjes, donkere voedselvlek (made.png).
# Sketchfab had geen bruikbare made (alleen ongeriggede klodders of monsters) en geen aasbakje, dus zelf gebouwd.
#   dicht : bakje + etiket + deksel erop.
#   open  : deksel ondersteboven naast het bakje (+x), bakje vol maden (vaste hoop van ~320 maden, één gedeelde mesh per
#           vorm -> wordt bij gltf-transform optimize GPU-instancing), 6 woelende maden in de hoop en 8 maden die uit de hoop
#           kruipen, tegen de binnenwand op, over de rand, langs de buitenkant naar beneden en over de grond, en zich dan
#           ingraven (onder y = 0: de grond van het spel verbergt ze; daarna beginnen ze weer onder in de hoop). Clip "kruipen".
#   made  : één made met de kop naar +z, buik op y = 0, kruipt/kronkelt op de plaats (clip "kruipen", 2 s), zodat het spel hem
#           zelf kan verplaatsen.
# Elke bewegende made heeft een eigen skelet: losse botten langs het lijf (geen keten), per frame op het pad gezet met een
# peristaltische golf (ringen trekken samen = korter en dikker, van staart naar kop) en een zoekende kop.
# Texturen (tools/aas/, gemaakt met madenbakje-textuur.py): madenbakje-geel.jpg, madenbakje-etiket.jpg, madenbakje-deksel.jpg, made.png.
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y); de glTF-export maakt er weer Y-omhoog van.
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix, Quaternion

ARGS = sys.argv[sys.argv.index('--') + 1:]
MODUS, OUT = ARGS[0], ARGS[1]
HIER = os.path.dirname(os.path.abspath(__file__))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for coll in (bpy.data.meshes, bpy.data.armatures, bpy.data.actions, bpy.data.materials, bpy.data.images):
    for d in list(coll): coll.remove(d)
sc = bpy.context.scene
rng = np.random.default_rng(11)

def P(x, y, z): return Vector((x, -z, y))
C4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))   # spel -> Blender
C4i = C4.inverted()
def naar_blender(Mg): return C4 @ Mg @ C4i

# ---------- materialen ----------
def mat(naam, kleur, rough=0.5, beeld=None):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough
    if beeld:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(HIER, beeld))
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    m.use_backface_culling = True
    return m
GEEL = mat('geel-pp', (1, 1, 1), 0.42, 'madenbakje-geel.jpg')
DEKSEL = mat('deksel-pp', (1, 1, 1), 0.62, 'madenbakje-deksel.jpg')
ETIKET = mat('etiket', (1, 1, 1), 0.35, 'madenbakje-etiket.jpg')
MADE = mat('made', (1, 1, 1), 0.36, 'made.png')
HOOP = mat('hoop', (0.46, 0.42, 0.32), 0.8)

def maak(naam, verts, faces, uvs, m, glad=True):
    """verts in spel-coördinaten; uvs per face-hoek (lijst van lijsten) of per vertex (array)."""
    me = bpy.data.meshes.new(naam)
    me.from_pydata([P(*v) for v in verts], [], [tuple(f) for f in faces])
    uvl = me.uv_layers.new(name='UVMap'); k = 0
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index; uvl.data[li].uv = uvs[vi]
    me.materials.append(m)
    if glad: me.shade_smooth()
    o = bpy.data.objects.new(naam, me); sc.collection.objects.link(o); return o

def normalen_naar_buiten(o):
    bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(o.data); bm.free()

# ---------- vormen ----------
CR = 0.060                       # halve lengte van het rechte stuk van elke zijkant (hoekstraal = d - CR)
def plan(d, kh=7, kz=4):
    """afgeronde rechthoek met halve maat d: lijst (x, z, omtrek-afstand). Start voor-midden, tegen de klok in van boven."""
    R = max(d - CR, 0.0005); pts = []
    hoeken = [((CR, CR), 90, 0), ((CR, -CR), 0, -90), ((-CR, -CR), -90, -180), ((-CR, CR), 180, 90)]
    pts += [(CR * i / kz, d) for i in range(kz)]
    for hi, (c, a0, a1) in enumerate(hoeken):
        for j in range(kh + 1):
            a = math.radians(a0 + (a1 - a0) * j / kh); pts.append((c[0] + R * math.cos(a), c[1] + R * math.sin(a)))
        nxt = hoeken[(hi + 1) % 4][0]; eind = pts[-1]
        if hi < 3:
            # recht stuk naar de volgende hoek
            a = math.radians(hoeken[hi + 1][1]); start2 = (nxt[0] + R * math.cos(a), nxt[1] + R * math.sin(a))
            for i in range(1, 2 * kz): t = i / (2 * kz); pts.append((eind[0] + (start2[0] - eind[0]) * t, eind[1] + (start2[1] - eind[1]) * t))
    pts += [(-CR + CR * i / kz, d) for i in range(1, kz + 1)]
    pts = pts[:-1]                                     # laatste = eerste (x=0) niet dubbel
    s = [0.0]
    for i in range(1, len(pts) + 1): a, b = pts[i - 1], pts[i % len(pts)]; s.append(s[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return [(p[0], p[1], s[i]) for i, p in enumerate(pts)] + [(pts[0][0], pts[0][1], s[-1])]   # naad dubbel voor de uv

def afronden(pts, k=6):
    """pts = [(a, b, straal)]: hoeken afronden met een kwadratische bezier."""
    uit = [np.array(pts[0][:2], float)]
    for i in range(1, len(pts) - 1):
        p0, p1, p2 = (np.array(p[:2], float) for p in pts[i - 1:i + 2]); r = pts[i][2]
        if r <= 0: uit.append(p1); continue
        d1, d2 = p0 - p1, p2 - p1; l1, l2 = np.linalg.norm(d1), np.linalg.norm(d2); d1 /= l1; d2 /= l2
        hk = math.acos(max(-1, min(1, float(d1 @ d2)))); t = min(r / math.tan(hk / 2), 0.45 * l1, 0.45 * l2)
        a, b = p1 + d1 * t, p1 + d2 * t
        for j in range(k + 1): s = j / k; uit.append((1 - s) ** 2 * a + 2 * (1 - s) * s * p1 + s * s * b)
    uit.append(np.array(pts[-1][:2], float)); return np.array(uit)

def draaiprofiel(naam, prof, m, y_midden_begin, y_midden_eind, uvf):
    """profiel (n, y) rond de afgeronde rechthoek; begin en eind gesloten met een waaier naar het midden."""
    verts, uvs, faces, ringen = [], [], [], []
    sprof = np.r_[0, np.cumsum(np.linalg.norm(np.diff(prof, axis=0), axis=1))]
    for (n, y), sp in zip(prof, sprof):
        ring = []
        for (x, z, so) in plan(n):
            ring.append(len(verts)); verts.append((x, y, z)); uvs.append(uvf(x, y, z, so, sp))
        ringen.append(ring)
    for a, b in zip(ringen[:-1], ringen[1:]):
        for j in range(len(a) - 1): faces.append((a[j], a[j + 1], b[j + 1], b[j]))
    for ring, y in ((ringen[0], y_midden_begin), (ringen[-1], y_midden_eind)):
        c = len(verts); verts.append((0, y, 0)); uvs.append(uvf(0, y, 0, 0, 0))
        for j in range(len(ring) - 1): faces.append((c, ring[j + 1], ring[j]))
    o = maak(naam, verts, faces, uvs, m); normalen_naar_buiten(o); return o

# profiel van het bakje (n = afstand tot het midden, loodrecht op de wand), van buiten-onder via de rand naar binnen-onder
BAK = [(0.064, 0.0, 0), (0.0705, 0.0, 0.008), (0.0800, 0.0435, 0.0008), (0.0826, 0.0445, 0.0006), (0.0826, 0.0575, 0.0016),
       (0.0792, 0.0575, 0.0012), (0.0722, 0.0030, 0.004), (0.064, 0.0022, 0)]
def n_binnen(y): return 0.0722 + (y - 0.003) * (0.0792 - 0.0722) / (0.0575 - 0.003)
def n_buiten(y): return 0.0705 + y * (0.0800 - 0.0705) / 0.0435

def bakje():
    prof = afronden(BAK, 5)
    return draaiprofiel('bakje', prof, GEEL, 0.0, 0.0022, lambda x, y, z, so, sp: (so / 0.05, sp / 0.05))

def etiket():
    verts, uvs, faces = [], [], []; nx, ny = 8, 2
    for j in range(ny + 1):
        for i in range(nx + 1):
            u, v = i / nx, j / ny; x = -0.0345 + 0.069 * u; y = 0.0140 + 0.0170 * v
            verts.append((x, y, n_buiten(y) + 0.00025)); uvs.append((u, v))
    for j in range(ny):
        for i in range(nx): a = j * (nx + 1) + i; faces.append((a, a + 1, a + nx + 2, a + nx + 1))
    return maak('etiket', verts, faces, uvs, ETIKET, glad=False)

def deksel():
    LP = [(0.064, 0.0600, 0), (0.0850, 0.0600, 0.004), (0.0850, 0.0470, 0.0006), (0.0836, 0.0470, 0.0004),
          (0.0836, 0.0575, 0.0006), (0.064, 0.0575, 0)]
    prof = afronden(LP, 5)
    o = draaiprofiel('deksel', prof, DEKSEL, 0.0600, 0.0575, lambda x, y, z, so, sp: (x / 0.17 + 0.5, z / 0.17 + 0.5))
    # stapelribbels (foto): per hoek een lange ribbel evenwijdig aan voor/achter en een korte haak naar binnen
    bm = bmesh.new(); bm.from_mesh(o.data); uv = bm.loops.layers.uv.active
    def ribbel(x0, z0, x1, z1):
        mid = ((x0 + x1) / 2, (z0 + z1) / 2); lx, lz = abs(x1 - x0) + 0.002, abs(z1 - z0) + 0.002
        r = bmesh.ops.create_cube(bm, size=1.0)['verts']
        for v in r:
            g = Vector((v.co.x * lx + mid[0], v.co.z * 0.0009 + 0.0600 + 0.0003, v.co.y * lz + mid[1]))
            v.co = P(*g)
        fs = list({f for v in r for f in v.link_faces})
        bmesh.ops.bevel(bm, geom=list({e for f in fs for e in f.edges}), offset=0.0005, segments=3, affect='EDGES')
    for sx in (-1, 1):
        for sz in (-1, 1):
            ribbel(sx * 0.034, sz * 0.062, sx * 0.060, sz * 0.062)
            ribbel(sx * 0.062, sz * 0.062, sx * 0.062, sz * 0.052)
    for f in bm.faces:
        for l in f.loops:
            if abs(l[uv].uv.x) < 1e-9 and abs(l[uv].uv.y) < 1e-9:
                g = l.vert.co; l[uv].uv = (g.x / 0.17 + 0.5, -g.y / 0.17 + 0.5)
    bm.to_mesh(o.data); bm.free()
    for p in o.data.polygons: p.use_smooth = True
    return o

# ---------- de made ----------
ML, MR = 0.018, 0.0020           # lengte, grootste straal
FU = np.array([0, .012, .035, .07, .13, .22, .36, .52, .68, .80, .90, .955, .98, .993, 1.0])
FR = np.array([0, .16, .30, .43, .56, .69, .82, .92, .985, 1.0, .97, .90, .76, .50, 0])
BUIK = 0.82                       # buik iets plat
def straal(u):                    # u = 0 kop .. 1 staart
    f = np.interp(u, FU, FR); seg = np.asarray(u) ** 0.9 * 12
    return MR * f * (1 - 0.055 * np.abs(np.cos(np.pi * seg)) ** 10)

def made_geo(nr, per_ring, buig=0.0, y0=0.0, fijn=True):
    """made langs +z (kop op +z), midden op z = 0, rug +y. Geeft verts, faces, uvs, b (afstand tot de kop) per vertex."""
    extra = [.004, .012, .025, .97, .985, .993, .998] if fijn else [.012, .985]
    us = np.unique(np.r_[np.linspace(0, 1, 12 * per_ring + 1), extra])
    verts, uvs, bb, faces, ringen = [], [], [], [], []
    for u in us:
        r = float(straal(u)); z = ML / 2 - u * ML; x0 = buig * z * z
        if r < 1e-6:
            ringen.append([len(verts)] * (nr + 1)); verts.append((x0, y0, z + (0.0002 if u == 0 else -0.0001)))
            uvs.append((u, 0.5)); bb.append(u * ML); continue
        ring = []
        for j in range(nr + 1):
            a = 2 * math.pi * j / nr; y = r * math.cos(a); y = y * BUIK if y < 0 else y
            ring.append(len(verts)); verts.append((x0 + r * math.sin(a), y0 + y, z)); uvs.append((u, j / nr)); bb.append(u * ML)
        ringen.append(ring)
    for a, b in zip(ringen[:-1], ringen[1:]):
        for j in range(nr):
            q = [a[j], a[j + 1], b[j + 1], b[j]]; q2 = [v for i, v in enumerate(q) if v not in q[:i]]
            if len(q2) >= 3: faces.append(q2)
    return verts, faces, uvs, np.array(bb)

def made_vast(naam, nr, per_ring, buig):
    v, f, uv, _ = made_geo(nr, per_ring, buig, fijn=False)
    o = maak(naam, v, f, uv, MADE); normalen_naar_buiten(o); return o

# ---------- skelet + animatie ----------
def made_skelet(naam, nb, nr, per_ring, y0=0.0):
    """made met nb losse botten (allemaal kind van het skelet, geen keten). Rustpose: rechte made op (0, y0, 0) langs +z."""
    v, f, uv, bb = made_geo(nr, per_ring, 0.0, y0)
    o = maak(naam, v, f, uv, MADE); normalen_naar_buiten(o)
    ad = bpy.data.armatures.new(naam + '-skelet'); arm = bpy.data.objects.new('skelet_' + naam, ad); sc.collection.objects.link(arm)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    c = (np.arange(nb) + 0.5) * ML / nb; seg = ML / nb
    for i in range(nb):
        eb = ad.edit_bones.new(f'{naam}_{i}'); zc = ML / 2 - c[i]
        eb.head = P(0, y0, zc - seg * 0.4); eb.tail = P(0, y0, zc + seg * 0.4); eb.roll = 0
    bpy.ops.object.mode_set(mode='OBJECT')
    for i in range(nb): o.vertex_groups.new(name=f'{naam}_{i}')
    for vi, b in enumerate(bb):
        t = np.clip((b - c[0]) / seg, 0, nb - 1 - 1e-9); i = int(t); w = t - i
        o.vertex_groups[i].add([vi], 1 - w, 'REPLACE')
        if w > 1e-6: o.vertex_groups[i + 1].add([vi], w, 'REPLACE')
    o.parent = arm; md = o.modifiers.new('skelet', 'ARMATURE'); md.object = arm
    rust = [Matrix.Translation(Vector((0, y0, ML / 2 - c[i]))) for i in range(nb)]
    return arm, o, c, rust

def frame(p, T, N, sx, sr):
    """4x4 in spel-assen: kolommen zij, normaal, raaklijn (geschaald), positie p."""
    T = T / np.linalg.norm(T); s = np.cross(N, T); s /= np.linalg.norm(s); n = np.cross(T, s)
    M = Matrix.Identity(4)
    for r in range(3): M[r][0], M[r][1], M[r][2], M[r][3] = s[r] * sr, n[r] * sr, T[r] * sx, p[r]
    return M

def bak_animatie(arm, rust, frames_fn, nfr, schaal=True):
    """frames_fn(f) -> lijst van 4x4 (spel) per bot. Schrijft loc/rot/schaal-sleutels voor frame 0..nfr."""
    bones = arm.data.bones; nb = len(rust)
    MLb = [bones[i].matrix_local.copy() for i in range(nb)]; MLi = [m.inverted() for m in MLb]
    Rb = [naar_blender(r).inverted() for r in rust]
    data = [([], [], []) for _ in range(nb)]; vorig = [None] * nb
    for f in range(nfr + 1):
        Ws = frames_fn(f)
        for i in range(nb):
            basis = MLi[i] @ naar_blender(Ws[i]) @ Rb[i] @ MLb[i]
            l, q, s = basis.decompose()
            if vorig[i] is not None and vorig[i].dot(q) < 0: q = -q
            vorig[i] = q; data[i][0].append(l[:]); data[i][1].append(q[:]); data[i][2].append(s[:])
    act = bpy.data.actions.new(arm.name + '-kruipen'); ad = arm.animation_data_create(); ad.action = act
    fr = np.arange(nfr + 1, dtype=float)
    try:
        from bpy_extras import anim_utils
        slot = act.slots.new(id_type='OBJECT', name=arm.name); ad.action_slot = slot
        cb = anim_utils.action_ensure_channelbag_for_slot(act, slot); fcs = cb.fcurves
    except Exception as e:
        print('oude actie-api', e); fcs = act.fcurves
    for i in range(nb):
        bn = bones[i].name
        for pad, arr in (('location', data[i][0]), ('rotation_quaternion', data[i][1])) + ((('scale', data[i][2]),) if schaal else ()):
            arr = np.array(arr)
            for k in range(arr.shape[1]):
                fc = fcs.new(f'pose.bones["{bn}"].{pad}', index=k, group_name=bn)
                fc.keyframe_points.add(len(fr)); co = np.empty(2 * len(fr)); co[0::2] = fr; co[1::2] = arr[:, k]
                fc.keyframe_points.foreach_set('co', co)
                for kp in fc.keyframe_points: kp.interpolation = 'LINEAR'
                fc.update()
    # in een NLA-spoor "kruipen": de export voegt alle sporen met dezelfde naam samen tot één clip
    tr = ad.nla_tracks.new(); tr.name = 'kruipen'; st = tr.strips.new('kruipen', 0, act)
    try: st.action_slot = ad.action_slot
    except Exception: pass
    ad.action = None

# peristaltiek: verplaatsing langs het lijf, golf loopt van staart naar kop
def golf(b, fase, A=0.00055, lam=ML * 0.95):
    k = 2 * math.pi / lam; d = A * np.sin(fase + k * b); rek = 1 - A * k * np.cos(fase + k * b)
    return d, rek

def made_frames_vlak(c, t, T, oorsprong, kop_richting, opp_y, pers=1, zwaai=1, zwaai_a=0.0016, krul=0.0, krul_fase=0.0, til=0.0, golf_a=0.00055):
    """made op een (bijna) vlakke ondergrond, op de plaats: lijst 4x4 per bot. opp_y(x, z) = hoogte van de ondergrond."""
    nb = len(c); w = 2 * math.pi * t / T
    d, rek = golf(c, w * pers, A=golf_a)
    h = np.array(kop_richting, float); h /= np.linalg.norm(h); zij = np.array([h[2], 0, -h[0]])
    ps = []
    for i in range(nb):
        langs = ML / 2 - c[i] + d[i]; bk = c[i] / ML
        lat = zwaai_a * math.sin(w * zwaai - 2.2 * bk) * max(0, 1 - bk / 0.55) ** 2       # zoekende kop
        lat += 0.0009 * math.sin(w * zwaai + 1.0 - 4.0 * bk) * 0.6                        # lichte S-golf door het lijf
        lat += krul * ((bk - 0.5) / 0.5) ** 2 * math.sin(w + krul_fase)                    # C-krul (woelen)
        p = np.array(oorsprong, float) + h * langs + zij * lat
        r = float(straal(bk)); sr = 1 / math.sqrt(rek[i])
        lift = til * max(0.0, math.sin(w * zwaai * 0.5 + 0.7)) * max(0, 1 - bk / 0.4) ** 2
        p[1] = opp_y(p[0], p[2]) + r * BUIK * sr + lift
        ps.append((p, rek[i], sr))
    out = []
    for i in range(nb):
        a = ps[max(i - 1, 0)][0]; b = ps[min(i + 1, nb - 1)][0]; T_ = a - b
        out.append(frame(ps[i][0], T_, np.array([0, 1.0, 0]), ps[i][1], ps[i][2]))
    return out

def exporteer(anim):
    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_animations=anim,
                              export_animation_mode='NLA_TRACKS', export_image_format='AUTO', export_skins=True,
                              export_optimize_animation_size=True, export_def_bones=False)

# =====================================================================
if MODUS == 'made':
    FPS, TL = 24, 2.0; NF = int(FPS * TL)
    sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = NF; sc.name = 'kruipen'
    arm, o, c, rust = made_skelet('made', 8, 14, 5)
    bak_animatie(arm, rust, lambda f: made_frames_vlak(c, f / FPS, TL, (0, 0, 0), (0, 0, 1), lambda x, z: 0.0,
                                                       pers=2, zwaai=1, til=0.0012), NF)
    exporteer(True)
    sys.exit(0)

bakje(); etiket(); dk = deksel()
if MODUS == 'dicht':
    exporteer(False); sys.exit(0)

# ---------------- open: deksel ernaast, maden erin en eruit ----------------
FPS, TL = 10, 16.0; NF = int(FPS * TL)
sc.render.fps = FPS; sc.frame_start = 0; sc.frame_end = NF; sc.name = 'kruipen'
Mg = Matrix.Translation(Vector((0.205, 0.0615, 0.01))) @ Matrix.Rotation(math.radians(14), 4, 'Y') @ Matrix.Rotation(math.pi, 4, 'X')
dk.matrix_world = naar_blender(Mg)

HY0, HYD, HN = 0.036, 0.008, n_binnen(0.036)       # hoop: 3,6 cm aan de wand, 4,4 cm in het midden
def hoop_y(x, z):
    q = (abs(x) ** 4 + abs(z) ** 4) ** 0.25 / HN; return HY0 + HYD * max(0.0, 1 - q * q)
def binnen(x, z, d):
    ax, az = abs(x), abs(z)
    if ax > d or az > d: return False
    if ax > CR and az > CR: return math.hypot(ax - CR, az - CR) <= d - CR
    return True

# hoop-oppervlak (donker: de schaduw tussen de maden)
ring0 = plan(HN + 0.0006); verts, uvs, faces = [], [], []; ringen = []
for s in np.linspace(0, 1, 9):
    ring = []
    for (x, z, so) in ring0:
        ring.append(len(verts)); verts.append((x * s, hoop_y(x * s, z * s) - 0.0012, z * s)); uvs.append((x, z))
    ringen.append(ring)
for a, b in zip(ringen[:-1], ringen[1:]):
    for j in range(len(a) - 1): faces.append((a[j], a[j + 1], b[j + 1], b[j]) if a[j] != a[j + 1] else (a[j], b[j + 1], b[j]))
hp = maak('hoop', verts, faces, uvs, HOOP)
bm = bmesh.new(); bm.from_mesh(hp.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bm.to_mesh(hp.data); bm.free()

# vaste maden: 5 vormen (recht, licht gebogen, krom), elk één mesh die door veel nodes gedeeld wordt
vormen = [made_vast(f'made_vorm_{i}', 6, 1, b) for i, b in enumerate((0.0, 9.0, -9.0, 20.0, -24.0))]
for v in vormen: sc.collection.objects.unlink(v)
geplaatst = []
def plaats(n, laag, mind):
    k = 0; pogingen = 0
    while k < n and pogingen < 40000:
        pogingen += 1
        x, z = rng.uniform(-HN, HN, 2); a = rng.uniform(0, 2 * math.pi); h = np.array([math.sin(a), 0, math.cos(a)])
        e1, e2 = np.array([x, 0, z]) + h * ML / 2, np.array([x, 0, z]) - h * ML / 2
        if not (binnen(e1[0], e1[2], HN - 0.0012) and binnen(e2[0], e2[2], HN - 0.0012)): continue
        if any((x - gx) ** 2 + (z - gz) ** 2 < mind ** 2 for gx, gz, gl in geplaatst if gl == laag): continue
        geplaatst.append((x, z, laag)); k += 1
        y = hoop_y(x, z) + (0.0004 if laag == 0 else -0.0013)
        kant = rng.uniform(-0.25, 0.25); helling = rng.uniform(-0.2, 0.2) - 0.06 * np.sign(abs(x) + abs(z) - 0.04)
        o = bpy.data.objects.new(f'made_hoop_{len(geplaatst):03d}', vormen[rng.integers(len(vormen))].data); sc.collection.objects.link(o)
        Mg = Matrix.Translation(Vector((x, y, z))) @ Matrix.Rotation(a, 4, 'Y') @ Matrix.Rotation(helling, 4, 'X') @ Matrix.Rotation(kant, 4, 'Z')
        o.matrix_world = naar_blender(Mg)
plaats(210, 1, 0.0062)
plaats(300, 0, 0.0052)
print('hoop:', len(geplaatst), 'maden')

# woelende maden in de hoop
WOEL = [(-0.025, 0.010, 0.6), (0.030, -0.020, 2.4), (0.005, 0.035, 4.0), (-0.040, -0.035, 1.2)]
for k, (x, z, a) in enumerate(WOEL):
    arm, o, c, rust = made_skelet(f'made_woel_{k + 1}', 5, 10, 3, y0=0.02)
    h = (math.sin(a), 0, math.cos(a)); per = int(rng.integers(12, 18)); zw = int(rng.integers(5, 9)); kf = rng.uniform(0, 6.28)
    bak_animatie(arm, rust, lambda f, x=x, z=z, h=h, per=per, zw=zw, kf=kf:
                 made_frames_vlak(c, f / FPS, TL, (x, 0, z), h, hoop_y, pers=per, zwaai=zw, krul=0.0022, krul_fase=kf, til=0.0015, golf_a=0.0), NF, schaal=False)

# ---------- kruipende maden: pad over het oppervlak ----------
def pad_profiel(G):
    """(n, y)-hoekpunten van het pad op het oppervlak, van diep in de hoop tot onder de grond."""
    pts = [(0.0, 0.012, 0), (0.030, hoop_y(0.030, 0) - 0.004, 0.004)]
    for n in np.linspace(0.042, HN - 0.003, 5): pts.append((n, hoop_y(n, 0) + 0.0002, 0))
    pts += [(HN, HY0, 0.003), (0.0792, 0.0575, 0.0018), (0.0826, 0.0575, 0.0018), (0.0826, 0.0445, 0.0006),
            (0.0800, 0.0435, 0.0008), (0.0712, 0.0, 0.003), (0.0712 + G, 0.0, 0.006), (0.0712 + G + 0.020, -0.018, 0.004),
            (0.0712 + G + 0.035, -0.032, 0)]
    return afronden(pts, 6)

class Pad:
    def __init__(self, w, u0, G, drift):
        prof = pad_profiel(G); w = np.array(w, float); l = np.array([-w[2], 0, w[0]]); up = np.array([0, 1.0, 0])
        ps, ns = [], []
        for i, (n, y) in enumerate(prof):
            a, b = prof[max(i - 1, 0)], prof[min(i + 1, len(prof) - 1)]; t2 = np.array(b) - np.array(a); t2 /= np.linalg.norm(t2)
            nn = np.array([-t2[1], t2[0]])                         # links van de looprichting = van het oppervlak af
            u = u0 + drift * max(0.0, n - 0.0712) ** 1.3 * 6
            q = n * w + u * l
            if n < HN - 0.001 and y > 0.01: y += hoop_y(q[0], q[2]) - hoop_y(n, 0)   # hoogte van de hoop op de echte plek
            ps.append(q + y * up); ns.append(nn[0] * w + nn[1] * up)
        ps = np.array(ps); ns = np.array(ns)
        # dicht en gelijk bemonsteren
        s = np.r_[0, np.cumsum(np.linalg.norm(np.diff(ps, axis=0), axis=1))]; S = np.arange(0, s[-1], 0.0004)
        self.p = np.stack([np.interp(S, s, ps[:, k]) for k in range(3)], 1)
        nn = np.stack([np.interp(S, s, ns[:, k]) for k in range(3)], 1)
        self.n = nn / np.linalg.norm(nn, axis=1)[:, None]; self.s = S; self.lengte = S[-1]
        # waar komt de kop boven de hoop uit / waar is de staart onder de grond
        self.s_uit = S[np.argmax([pp[1] >= hoop_y(pp[0], pp[2]) - 0.0001 for pp in self.p])]
        ond = np.where((self.p[:, 1] < -0.004) & (S > S[-1] / 2))[0]; self.s_onder = S[ond[0]]
    def op(self, s):
        s = min(max(s, 0), self.lengte - 1e-6); i = int(s / 0.0004); i = min(i, len(self.s) - 2); t = (s - self.s[i]) / 0.0004
        p = self.p[i] * (1 - t) + self.p[i + 1] * t; n = self.n[i] * (1 - t) + self.n[i + 1] * t; return p, n / np.linalg.norm(n)

KRUIP = [((0, 0, 1), -0.030, 0.040, 0.6), ((0, 0, 1), 0.006, 0.028, -0.3), ((0, 0, 1), 0.036, 0.046, 0.5),
         ((-1, 0, 0), -0.020, 0.036, -0.5), ((-1, 0, 0), 0.025, 0.022, 0.4), ((0, 0, -1), -0.028, 0.040, 0.3),
         ((0, 0, -1), 0.020, 0.030, -0.6), ((1, 0, 0), -0.035, 0.012, -0.2)]
for k, (w, u0, G, drift) in enumerate(KRUIP):
    pad = Pad(w, u0, G, drift * 0.01)
    arm, o, c, rust = made_skelet(f'made_kruip_{k + 1}', 6, 10, 3, y0=0.02)
    nb = len(c)
    s_a = max(pad.s_uit - 0.002, ML + 0.003)              # kop nog net onder de hoop
    s_b = pad.s_onder + ML + 0.004                       # staart net onder de grond
    fase = (k * 0.37 + rng.uniform(0, 0.05)) % 1.0
    per = int(rng.integers(13, 18)); zw = int(rng.integers(6, 11)); print(f'kruip {k + 1}: pad {pad.lengte * 100:.1f} cm, '
                                                                          f'{(s_b - s_a) / TL * 1000:.1f} mm/s')
    def fr(f, pad=pad, c=c, s_a=s_a, s_b=s_b, fase=fase, per=per, zw=zw):
        t = f / FPS; tau = (t / TL + fase) % 1.0; w = 2 * math.pi * t / TL
        sk = s_a + (s_b - s_a) * tau; d, rek = golf(c, w * per)
        ps, ns, info = [], [], []
        for i in range(nb):
            si = sk - c[i] + d[i]; p, n = pad.op(si); bk = c[i] / ML
            r = float(straal(bk)); sr = 1 / math.sqrt(rek[i])
            p = p + n * (r * BUIK * sr + 0.0001); ps.append(p); ns.append(n); info.append((rek[i], sr, bk))
        out = []
        for i in range(nb):
            a = ps[max(i - 1, 0)]; b = ps[min(i + 1, nb - 1)]; T_ = a - b; T_ /= np.linalg.norm(T_)
            zij = np.cross(ns[i], T_); zij /= np.linalg.norm(zij); bk = info[i][2]
            lat = 0.0012 * math.sin(w * zw - 2.2 * bk) * max(0, 1 - bk / 0.55) ** 2
            out.append((ps[i] + zij * lat, ns[i], info[i]))
        res = []
        for i in range(nb):
            a = out[max(i - 1, 0)][0]; b = out[min(i + 1, nb - 1)][0]
            res.append(frame(out[i][0], a - b, out[i][1], out[i][2][0], out[i][2][1]))
        return res
    bak_animatie(arm, rust, fr, NF)

exporteer(True)
