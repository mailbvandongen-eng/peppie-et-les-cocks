# blender -b --python-use-system-env -P tools/mensen/mens.py -- <uit.glb> '<json>'
# Bouwt één mens uit de gegevens van MakeHuman (CC0): lijf (lowpoly proxy), kleding, schoenen, haar, ogen, wenkbrauwen.
# Alle plaatjes komen op één vel (1024x1024), zodat de mens in één keer getekend wordt. Daarna hangt hij aan het
# skelet van de Universal Animation Library van Quaternius (CC0), zodat alle bewegingen daaruit werken.
# Er draait geen code van MakeHuman: we lezen alleen de gegevens (vormen, kleding, gewichten, skelet).
# json: {"naam","geslacht":"male|female","afkomst":"caucasian|african|asian","oud":0..1,"spier":-1..1,"gewicht":-1..1,
#        "pak","schoenen","haar","huid":"#rrggbb","pakTint":"#rrggbb"|null,"haarTint":"#rrggbb"|null}
import bpy, sys, json, gzip, re, math
import numpy as np
from mathutils import Vector, Matrix

D = '/root/tools/homo-assets/dl-mpfb/x/data'        # MakeHuman: basisvorm, vormen, skelet, gewichten
S = '/tmp/fbs/mh'                                  # MakeHuman system assets (uitgepakt uit sysassets.zip)
UAL = '/tmp/fbs/ual1/UAL1.glb'                     # Universal Animation Library (Standard), Godot-uitvoer
args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; C = json.loads(args[1])
G = C['geslacht']

def read_obj(path):
    v, vt, f, g, cur = [], [], [], [], None
    for l in open(path):
        p = l.split()
        if not p: continue
        if p[0] == 'v': v.append([float(p[1]), float(p[2]), float(p[3])])
        elif p[0] == 'vt': vt.append((float(p[1]), float(p[2])))
        elif p[0] == 'g': cur = p[1]
        elif p[0] == 'f':
            f.append([tuple(int(x) - 1 if x else -1 for x in (q.split('/') + [''])[:2]) for q in p[1:]]); g.append(cur)
    return v, vt, f, g

def target(name, w, V):
    if w == 0: return
    for l in gzip.open(f'{D}/targets/{name}.target.gz', 'rt'):
        p = l.split()
        if len(p) == 4 and p[0][0] != '#':
            i = int(p[0]); V[i][0] += w * float(p[1]); V[i][1] += w * float(p[2]); V[i][2] += w * float(p[3])

# ---------- het lijf: basisvorm + leeftijd, geslacht, afkomst, spieren, gewicht ----------
V, VT, F, GR = read_obj(D + '/3dobjs/base.obj')
oud = C.get('oud', 0)
def mw(x):   # -1..1 -> (min, avg, max) gewichten
    return {'min': max(0, -x), 'average': 1 - abs(x), 'max': max(0, x)}
sp, gw = mw(C.get('spier', 0)), mw(C.get('gewicht', 0))
for leeftijd, wl in ((('child', 1),) if C.get('kind') else (('young', 1 - oud), ('old', oud))):   # kind: de verhoudingen van een kind
    target(f'macrodetails/{C["afkomst"]}-{G}-{leeftijd}', wl, V)
    for s, ws in sp.items():
        for g_, wg in gw.items():
            target(f'macrodetails/universal-{G}-{leeftijd}-{s}muscle-{g_}weight', wl * ws * wg, V)

def fitfile(path):
    """Een onderdeel dat op de basisvorm past: elk punt hangt aan (tot) drie punten van het lijf."""
    L = open(path).read().split('\n'); sc = {}; pts = []; refs = []; on = False; weg = set()
    for i, l in enumerate(L):
        p = l.split()
        if not p: continue
        if p[0] in ('x_scale', 'y_scale', 'z_scale'):
            a, b, den = int(p[1]), int(p[2]), float(p[3]); ax = 'xyz'.index(p[0][0]); sc[ax] = abs(V[a][ax] - V[b][ax]) / den
        elif p[0] == 'delete_verts':
            # lijst met nummers en reeksen "a - b", over meerdere regels
            toks = ' '.join(L[i + 1:]).split()
            k = 0
            while k < len(toks):
                try: a = int(toks[k])
                except ValueError: break
                if k + 2 < len(toks) and toks[k + 1] == '-': weg.update(range(a, int(toks[k + 2]) + 1)); k += 3
                else: weg.add(a); k += 1
        elif p[0] == 'verts': on = True; start = len(pts)
        elif on:
            try: n = [float(x) for x in p]
            except ValueError:
                if len(pts) > start: on = False   # einde van de lijst; ervoor staan soms nog andere regels
                continue
            if len(n) == 1: pts.append(list(V[int(n[0])])); refs.append([(int(n[0]), 1.0)])
            else:
                a, b, c = int(n[0]), int(n[1]), int(n[2])
                pts.append([V[a][k] * n[3] + V[b][k] * n[4] + V[c][k] * n[5] + n[6 + k] * sc.get(k, 1) for k in range(3)])
                refs.append([(a, n[3]), (b, n[4]), (c, n[5])])
    obj = [l.split()[1] for l in L if l.startswith('obj_file')][0]
    v, vt, f, _ = read_obj(path.rsplit('/', 1)[0] + '/' + obj)
    assert len(v) == len(pts), (path, len(v), len(pts))
    return pts, vt, f, refs, weg

B = lambda p: Vector((p[0] * 0.1, -p[2] * 0.1, p[1] * 0.1))   # decimeters, y omhoog -> meters, z omhoog

# ---------- alle plaatjes op één vel ----------
A = 1024
atlas = np.zeros((A, A, 4), dtype=np.float32)
# (x, y vanaf boven, breedte, hoogte) in pixels
VAK = {'huid': (0, 0, 512, 512), 'pak': (512, 0, 512, 512), 'haar': (0, 512, 256, 256), 'schoen': (256, 512, 256, 256),
       'oog': (512, 512, 128, 128), 'wenkbrauw': (640, 512, 128, 128)}
def laad(path):
    im = bpy.data.images.load(path); w, h = im.size
    px = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)   # rij 0 = onderaan
    return px
def verklein(px, w, h):
    H0, W0 = px.shape[:2]
    if H0 % h == 0 and W0 % w == 0: return px.reshape(h, H0 // h, w, W0 // w, 4).mean(axis=(1, 3))
    ys = (np.arange(h) * H0 / h).astype(int); xs = (np.arange(w) * W0 / w).astype(int)
    return px[ys][:, xs]
hexrgb = lambda h: np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)], dtype=np.float32) ** 2.2   # sRGB -> lineair
def zet(vak, px):
    x, y, w, h = VAK[vak]; yb = A - y - h
    atlas[yb:yb + h, x:x + w] = verklein(px, w, h)

# huid: de echte MakeHuman-huid bij leeftijd, geslacht en afkomst
import glob
lft = 'young' if oud < 0.4 else 'middleage' if oud < 0.75 else 'old'
huid = laad(sorted(glob.glob(f'{S}/skins/{lft}_{C["afkomst"]}_{G}/*diffuse*.png'))[0])
if C.get('huid'):   # kleine verschuiving in tint, zodat niet iedereen dezelfde huid heeft
    gem = huid[..., :3].reshape(-1, 3).mean(axis=0)
    huid[..., :3] = np.clip(huid[..., :3] * (0.75 + 0.25 * hexrgb(C['huid']) / np.maximum(gem, 1e-3)), 0, 1)
if C.get('vacht'):   # een dier: de hele huid in de kleur van de vacht, met behoud van licht en donker
    lum = (huid[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32))[..., None]
    huid[..., :3] = np.clip(lum / max(1e-3, float(lum.mean())) * hexrgb(C['vacht']), 0, 1)
huid[..., 3] = 1
zet('huid', huid)
def kleding(pad, tint, vak):
    px = laad(pad)
    if tint:
        lum = (px[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32))[..., None]
        px[..., :3] = np.clip(lum / max(1e-3, lum.mean()) * hexrgb(tint) * 0.9 + px[..., :3] * 0.1, 0, 1)
    px[..., 3] = 1; zet(vak, px)
kleding(f'{S}/clothes/{C["pak"]}/{C["pak"]}_diffuse.png', C.get('pakTint'), 'pak')
if C.get('shirtTint'):   # alleen het bovenstuk kleuren: de kleurloze delen (wit shirt, grijze jas), de blauwe spijkerbroek blijft
    x0, y0, w0, h0 = VAK['pak']; yb = A - y0 - h0; px = atlas[yb:yb + h0, x0:x0 + w0]
    mx, mn = px[..., :3].max(axis=2), px[..., :3].min(axis=2); sat = (mx - mn) / np.maximum(mx, 1e-3)
    grijs = np.clip(1 - sat * 3.5, 0, 1)[..., None]; lum = (px[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32))[..., None]
    ref = float(lum[grijs[..., 0] > 0.8].mean()) if (grijs > 0.8).any() else 0.5
    px[..., :3] = px[..., :3] * (1 - grijs) + np.clip(lum / max(ref, 1e-3) * hexrgb(C['shirtTint']), 0, 1) * grijs
kleding(f'{S}/clothes/{C["schoenen"]}/{C["schoenen"]}_diffuse.png', None, 'schoen')
if C.get('haar'):   # geen haar = kaal
    haar = laad(sorted(__import__('glob').glob(f'{S}/hair/{C["haar"]}/*diffuse*.png'))[0])
    if C.get('haarTint'):
        lum = (haar[..., :3] @ np.array([0.3, 0.59, 0.11], dtype=np.float32))[..., None]
        haar[..., :3] = np.clip(lum / max(1e-3, lum[haar[..., 3] > 0.5].mean()) * hexrgb(C['haarTint']), 0, 1)
    zet('haar', haar)
oog = laad(f'{S}/eyes/materials/{C.get("ogen", "brown")}_eye.png'); oog[..., 3] = 1; zet('oog', oog)
zet('wenkbrauw', laad(f'{S}/eyebrows/eyebrow001/eyebrow001.png'))

# ---------- onderdelen als meshes, met uv op het vel ----------
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
W = json.load(open(D + '/rigs/standard/weights.game_engine.json'))['weights']
basisGewicht = {}
for bot, lst in W.items():
    for i, w in lst: basisGewicht.setdefault(i, []).append((bot, w))
mat = bpy.data.materials.new('Mens'); mat.use_nodes = True
img = bpy.data.images.new('MensAtlas', A, A, alpha=True); img.pixels.foreach_set(atlas.ravel()); img.pack()
bs = mat.node_tree.nodes['Principled BSDF']; tx = mat.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = img
mat.node_tree.links.new(tx.outputs['Color'], bs.inputs['Base Color']); mat.node_tree.links.new(tx.outputs['Alpha'], bs.inputs['Alpha'])
bs.inputs['Roughness'].default_value = 0.8; mat.blend_method = 'CLIP'
try: mat.surface_render_method = 'DITHERED'
except Exception: pass

verborgen = set()
def deel(naam, pts, vt, faces, refs, vak, weg_vlakken=None):
    used = sorted({i for f in faces for i, _ in f}); new = {o: n for n, o in enumerate(used)}
    me = bpy.data.meshes.new(naam); me.from_pydata([B(pts[i]) for i in used], [], [[new[i] for i, _ in f] for f in faces]); me.update()
    uv = me.uv_layers.new(name='UVMap'); x, y, w, h = VAK[vak]; yb = A - y - h; k = 0
    for f in faces:
        for _, t in f:
            u, v = vt[t] if t >= 0 else (0, 0)
            u = min(max(u, 0.001), 0.999); v = min(max(v, 0.001), 0.999)
            uv.data[k].uv = ((x + u * w) / A, (yb + v * h) / A); k += 1
    for p in me.polygons: p.use_smooth = True
    me.materials.append(mat)
    ob = bpy.data.objects.new(naam, me); bpy.context.scene.collection.objects.link(ob)
    # gewichten: elk punt erft de gewichten van de punten van het lijf waar het aan hangt
    groepen = {}
    for oud_i, nieuw_i in new.items():
        som = {}
        for bi, bw in refs[oud_i]:
            for bot, w in basisGewicht.get(bi, []): som[bot] = som.get(bot, 0) + w * bw
        for bot, w in som.items():
            if w > 0.001:
                if bot not in groepen: groepen[bot] = ob.vertex_groups.new(name=bot)
                groepen[bot].add([nieuw_i], w, 'REPLACE')
    return ob

delen = []
for map_, naam, vak in [('clothes/' + C['pak'], C['pak'], 'pak'), ('clothes/' + C['schoenen'], C['schoenen'], 'schoen')]:
    pts, vt, f, refs, weg = fitfile(f'{S}/{map_}/{naam}.mhclo'); verborgen |= weg
    delen.append(deel(naam, pts, vt, f, refs, vak))
# lijf: de lowpoly proxy, zonder de stukken die onder de kleding zitten
prox = 'male1591' if G == 'male' else 'female1605'
pts, vt, f, refs, _ = fitfile(f'{S}/proxymeshes/{prox}/{prox}.proxy')
weg_p = {i for i, r in enumerate(refs) if any(bi in verborgen for bi, bw in r if bw > 0.2)}
f = [q for q in f if sum(i in weg_p for i, _ in q) < 2]
print('lijf: vlakken over', len(f), 'verborgen punten', len(weg_p))
delen.append(deel('lijf', pts, vt, f, refs, 'huid'))
for map_, naam, vak in ([('hair/' + C['haar'], C['haar'], 'haar')] if C.get('haar') else []) + [('eyes/low-poly', 'low-poly', 'oog'), ('eyebrows/eyebrow001', 'eyebrow001', 'wenkbrauw')]:
    pts, vt, f, refs, _ = fitfile(f'{S}/{map_}/{naam}.mhclo')
    if vak == 'haar' and C.get('zijkantenKaal'):
        # weggeschoren zijkanten: het haar aan de zijkant van het hoofd (onder de kruin) weglaten
        P = [B(q) for q in pts]; cx = (max(q.x for q in P) + min(q.x for q in P)) / 2; hw = (max(q.x for q in P) - min(q.x for q in P)) / 2; top = max(q.z for q in P)
        mid = lambda q: sum((P[i] for i, _ in q), Vector()) / len(q)
        f = [q for q in f if not (abs(mid(q).x - cx) > hw * 0.6 and mid(q).z < top - 0.05)]
    if vak == 'haar' and C.get('randje'):
        # alleen een krans van haar rond de oren en achter, de kruin en het voorhoofd kaal (Wim)
        P = [B(q) for q in pts]; top = max(q.z for q in P)
        mid = lambda q: sum((P[i] for i, _ in q), Vector()) / len(q)
        ys = [q.y for q in P]; cy = (max(ys) + min(ys)) / 2; dy = (max(ys) - min(ys)) / 2
        f = [q for q in f if mid(q).z < top - C['randje'] and not (mid(q).y < cy - dy * 0.1 and mid(q).z > top - C['randje'] - 0.06)]
    if vak == 'haar' and C.get('staartKort'):
        # een kort staartje: alles wat onder het achterhoofd hangt schuift omhoog (MakeHuman: y omhoog, in decimeters)
        top = max(q[1] for q in pts); grens = top - 1.45; k = C['staartKort']
        pts = [(q[0], grens + (q[1] - grens) * k, q[2]) if q[1] < grens else q for q in pts]
    delen.append(deel(naam, pts, vt, f, refs, vak))

# één mesh van alles
bpy.ops.object.select_all(action='DESELECT')
for o in delen: o.select_set(True)
bpy.context.view_layer.objects.active = delen[0]; bpy.ops.object.join()
mens = bpy.context.view_layer.objects.active; mens.name = 'MensHoog'

# ---------- het MakeHuman-skelet (game_engine) op de gewrichten van dit lijf ----------
cube = {}
for f_, g in zip(F, GR):
    if g and g.startswith('joint-'): cube.setdefault(g, set()).update(i for i, _ in f_)
J = {k: sum((B(V[i]) for i in s), Vector()) / len(s) for k, s in cube.items()}
rig = json.load(open(D + '/rigs/standard/rig.game_engine.json'))
def at(e): return J[e['cube_name']] if e['strategy'] == 'CUBE' else sum((B(V[i]) for i in e['vertex_indices']), Vector()) / len(e['vertex_indices'])
kid = bpy.data.objects.new('MHRig', bpy.data.armatures.new('MHRig')); bpy.context.scene.collection.objects.link(kid)
bpy.context.view_layer.objects.active = kid; bpy.ops.object.mode_set(mode='EDIT')
for n, b in rig.items():
    e = kid.data.edit_bones.new(n); e.head = at(b['head']); e.tail = at(b['tail']); e.roll = b['roll']
for n, b in rig.items():
    if b['parent']: kid.data.edit_bones[n].parent = kid.data.edit_bones[b['parent']]
bpy.ops.object.mode_set(mode='OBJECT')
mens.parent = kid; md = mens.modifiers.new('Armature', 'ARMATURE'); md.object = kid
kmeshes = [mens]

# ---------- aan het skelet van de bewegingsbibliotheek hangen (zelfde aanpak als het kind in Oersprong) ----------
def ual(n):
    m = {'Root': 'root', 'pelvis': 'DEF-hips', 'spine_01': 'DEF-spine.001', 'spine_02': 'DEF-spine.002', 'spine_03': 'DEF-spine.003',
         'neck_01': 'DEF-neck', 'head': 'DEF-head'}
    if n in m: return m[n]
    r = re.match(r'(\w+?)_(\d\d)?_?([lr])$', n)
    s = n[-1].upper(); base = n[:-2]
    t = {'clavicle': 'shoulder', 'upperarm': 'upper_arm', 'lowerarm': 'forearm', 'hand': 'hand', 'thigh': 'thigh', 'calf': 'shin', 'foot': 'foot', 'ball': 'toe'}
    if base in t: return f'DEF-{t[base]}.{s}'
    fm = re.match(r'(thumb|index|middle|ring|pinky)_0(\d)$', base)
    if fm: return f'DEF-{"thumb" if fm.group(1) == "thumb" else "f_" + fm.group(1)}.0{fm.group(2)}.{s}'
    return None
before = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=UAL, bone_heuristic='BLENDER')
new = set(bpy.data.objects) - before
H = [o for o in new if o.type == 'ARMATURE'][0]; HW = H.matrix_world.copy()
hmesh = [o for o in new if o.type == 'MESH']
# de pop staat met zijn voeten op 0; zijn mesh kan anders geschaald zijn dan het skelet, dus we meten aan het skelet
hsole = 0.0; htop = max((HW @ b.tail_local).z for b in H.data.bones)
hnames = {b.name for b in H.data.bones}
K2H = {b.name: ual(b.name) for b in kid.data.bones if ual(b.name) in hnames}
print('gekoppeld', len(K2H), 'van', len(kid.data.bones), '| niet:', [b.name for b in kid.data.bones if b.name not in K2H])
hpos = {b.name: HW @ b.head_local for b in H.data.bones}

bpy.context.view_layer.objects.active = kid
def kpos(n): return kid.matrix_world @ kid.pose.bones[n].head
def ktail(n): return kid.matrix_world @ kid.pose.bones[n].tail
def turn(n, a, b):
    pb = kid.pose.bones[n]; q = a.normalized().rotation_difference(b.normalized()); o = kpos(n)
    M = Matrix.Translation(o) @ q.to_matrix().to_4x4() @ Matrix.Translation(-o)
    pb.matrix = kid.matrix_world.inverted() @ M @ kid.matrix_world @ pb.matrix; bpy.context.view_layer.update()
def hdir(a, b): return hpos[K2H[b]] - hpos[K2H[a]]
order = []
def walk(b):
    order.append(b.name)
    for c in b.children: walk(c)
for b in kid.data.bones:
    if not b.parent: walk(b)
NEXT = {'spine_01': 'spine_02', 'spine_02': 'spine_03', 'spine_03': 'neck_01', 'neck_01': 'head'}
for s in 'lr':
    NEXT.update({f'clavicle_{s}': f'upperarm_{s}', f'upperarm_{s}': f'lowerarm_{s}', f'lowerarm_{s}': f'hand_{s}', f'hand_{s}': f'middle_01_{s}',
                 f'thigh_{s}': f'calf_{s}', f'calf_{s}': f'foot_{s}', f'foot_{s}': f'ball_{s}'})
    for fi in ('thumb', 'index', 'middle', 'ring', 'pinky'): NEXT.update({f'{fi}_01_{s}': f'{fi}_02_{s}', f'{fi}_02_{s}': f'{fi}_03_{s}'})
head0 = (kid.matrix_world @ kid.pose.bones['head'].matrix).to_quaternion()
# 1. de rusthouding van de bibliotheek aannemen
for n in order:
    if n in NEXT and n in K2H and NEXT[n] in K2H: turn(n, kpos(NEXT[n]) - kpos(n), hdir(n, NEXT[n]))
    elif re.match(r'(thumb|index|middle|ring|pinky)_03', n) and n in K2H: turn(n, ktail(n) - kpos(n), hdir(n.replace('_03', '_02'), n))
    elif n == 'head':
        pb = kid.pose.bones[n]; o = kpos(n); q = head0 @ (kid.matrix_world @ pb.matrix).to_quaternion().inverted()
        pb.matrix = kid.matrix_world.inverted() @ Matrix.Translation(o) @ q.to_matrix().to_4x4() @ Matrix.Translation(-o) @ kid.matrix_world @ pb.matrix; bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); dg.update()
shaped = {}
for o in kmeshes:
    ev = o.evaluated_get(dg); shaped[o.name] = [ev.matrix_world @ v.co for v in ev.data.vertices]
kj = {n: kpos(n).copy() for n in order}
# 2. de maat: heup op heup (de bewegingen zetten de heup op hoogte); het spel schaalt naar de echte lengte
bz = [p.z for p in shaped['MensHoog']]; ksole = min(bz); ktop = max(bz)
khip = (kj['thigh_l'] + kj['thigh_r']) / 2; hhip = (hpos[K2H['thigh_l']] + hpos[K2H['thigh_r']]) / 2
fm = (hhip.z - hsole) / (khip.z - ksole)
Sc = lambda p: Vector(((p.x - khip.x) * fm + hhip.x, (p.y - khip.y) * fm + hhip.y, (p.z - ksole) * fm + hsole))
print('maat', round(fm, 3), 'lengte', round(ktop - ksole, 3), 'in modelmaat', round((ktop - ksole) * fm, 3), 'pop', round(htop - hsole, 3))
# 3. de botten van de bibliotheek verhuizen naar de gewrichten van dit lijf
H2K = {v: k for k, v in K2H.items()}
newpos = {}
for b in H.data.bones:
    n = b.name
    if n in ('root', 'DEF-hips') or not b.parent: newpos[n] = hpos[n].copy()
    elif n in H2K: newpos[n] = Sc(kj[H2K[n]])
    else: newpos[n] = hpos[n].copy()
bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = H; H.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
HI = HW.inverted(); mats = {e.name: e.matrix.copy() for e in H.data.edit_bones}; lens = {e.name: e.length for e in H.data.edit_bones}
for e in H.data.edit_bones: e.use_connect = False
for e in H.data.edit_bones:
    m = mats[e.name].copy(); m.translation = HI @ newpos[e.name]; e.matrix = m; e.length = lens[e.name]
bpy.ops.object.mode_set(mode='OBJECT')
for o in hmesh: bpy.data.objects.remove(o)
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
H.animation_data_clear()
for o in kmeshes:
    for m in list(o.modifiers): o.modifiers.remove(m)
    o.parent = None; o.matrix_world = Matrix.Identity(4)
    for v, p in zip(o.data.vertices, shaped[o.name]): v.co = Sc(p)
    o.data.update()
    for g in list(o.vertex_groups):
        if g.name in K2H: g.name = K2H[g.name]
        else: o.vertex_groups.remove(g)
    o.parent = H; o.matrix_parent_inverse = HW.inverted()
    m = o.modifiers.new('Armature', 'ARMATURE'); m.object = H
bpy.data.objects.remove(kid)

# ---------- de gewone versie iets lichter (de helft), en een lichte versie voor ver weg ----------
bpy.context.view_layer.objects.active = mens
dh = mens.modifiers.new('Half', 'DECIMATE'); dh.ratio = 0.5
bpy.ops.object.modifier_move_to_index(modifier='Half', index=0); bpy.ops.object.modifier_apply(modifier='Half')
laag = mens.copy(); laag.data = mens.data.copy(); laag.name = 'MensLaag'; bpy.context.scene.collection.objects.link(laag)
dm = laag.modifiers.new('Minder', 'DECIMATE'); dm.ratio = 0.3
bpy.context.view_layer.objects.active = laag; bpy.ops.object.modifier_move_to_index(modifier='Minder', index=0); bpy.ops.object.modifier_apply(modifier='Minder')
H.name = C['naam']
tel = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
print('driehoeken hoog', tel(mens), 'laag', tel(laag))
bpy.ops.wm.save_as_mainfile(filepath=OUT[:-4] + '.blend')
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_image_format='WEBP', export_image_quality=82,
                          export_animations=False, export_skins=True, export_all_influences=False, export_def_bones=False, export_apply=False)
print('KLAAR', OUT)
