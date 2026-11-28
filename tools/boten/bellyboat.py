# blender -b --python-use-system-env -P tools/boten/bellyboat.py -- <uit.glb> <soort: raptor|blackcat|madcat> <links: 0|1>
# Bouwt een bellyboat naar Bobs foto's (ref/uitrusting/): U-vormige pontons met spitse neuzen, naden en stootranden, ventielen,
# D-ringen, schort, stoel met tassen, Garmin op een Scotty-mount (Wim: klein schermpje), transducerstang, hengelsteunen,
# bekerhouder, elektromotor. Assen: Blender Z omhoog, vooruit = -Y (wordt in glTF +Z). y = 0 is de waterlijn.
# Namen die het spel gebruikt: "stang" (draait), "motor", "schroef", "Scherm" (materiaal: daar komt de livescope op), "zit" (leeg).
import bpy, bmesh, sys, math
from mathutils import Vector, Matrix
a = sys.argv[sys.argv.index('--') + 1:]; OUT, SOORT = a[0], a[1]
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
R, B, VOOR, ACHTER = 0.19, 0.5, 0.98, -0.3   # buisstraal, halve breedte (hart), neus vooruit, begin van de boog achter
def P(x, z, y): return Vector((x, -z, y))      # spel-assen (x, z vooruit, y omhoog) -> Blender
KL = {'raptor': dict(romp=(0.02, 0.02, 0.022), band=(0.06, 0.06, 0.065), onder=None, logo='RAPTOR'),
      'madcat': dict(romp=(0.012, 0.012, 0.013), band=(0.02, 0.02, 0.02), onder=(0.06, 0.62, 0.05), logo='MADCAT'),
      'blackcat': dict(romp=(0.36, 0.38, 0.4), band=(0.08, 0.085, 0.09), onder=None, logo='BLACK CAT')}[SOORT]
def mat(naam, kleur, rough=0.5, metal=0.0, emis=None):
    m = bpy.data.materials.get(naam) or bpy.data.materials.new(naam); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emis: b.inputs['Emission Color'].default_value = (*emis, 1); b.inputs['Emission Strength'].default_value = 1.0
    return m
PVC, BAND = mat('pvc', KL['romp'], 0.32), mat('band', KL['band'], 0.55)
ZW, ZWM, ALU, RVS = mat('zwart', (0.015, 0.015, 0.016), 0.45), mat('zwartmat', (0.02, 0.02, 0.022), 0.85), mat('alu', (0.05, 0.05, 0.055), 0.35, 0.8), mat('rvs', (0.7, 0.72, 0.74), 0.22, 1.0)
STOF, EVA, RUBBER = mat('stof', (0.018, 0.018, 0.02), 0.95), mat('eva', (0.03, 0.03, 0.033), 0.75), mat('rubber', (0.01, 0.01, 0.01), 0.9)
def obj(naam, me, m=None, ouder=None):
    o = bpy.data.objects.new(naam, me); bpy.context.scene.collection.objects.link(o)
    if m: me.materials.append(m)
    if ouder: o.parent = ouder
    for p in me.polygons: p.use_smooth = True
    return o
def leeg(naam, pos=(0, 0, 0), ouder=None):
    o = bpy.data.objects.new(naam, None); bpy.context.scene.collection.objects.link(o); o.location = pos
    if ouder: o.parent = ouder
    return o
def subsurf(o, n=2):
    md = o.modifiers.new('S', 'SUBSURF'); md.levels = n; md.render_levels = n
def prim(kind, naam, m, loc, rot=(0, 0, 0), schaal=(1, 1, 1), ouder=None, **kw):
    bm = bmesh.new()
    if kind == 'box': bmesh.ops.create_cube(bm, size=1.0)
    elif kind == 'cil': bmesh.ops.create_cone(bm, cap_ends=True, segments=kw.get('seg', 20), radius1=1, radius2=kw.get('r2', 1), depth=1)
    elif kind == 'bol': bmesh.ops.create_uvsphere(bm, u_segments=kw.get('seg', 20), v_segments=kw.get('seg', 20) // 2, radius=1)
    elif kind == 'torus':
        me_ = bpy.data.meshes.new(naam); bpy.ops.mesh.primitive_torus_add(major_radius=1, minor_radius=kw.get('dik', 0.1), major_segments=kw.get('seg', 24), minor_segments=8)
        o = bpy.context.active_object; o.name = naam; o.data.materials.append(m); o.location = loc; o.rotation_euler = rot; o.scale = schaal
        if ouder: o.parent = ouder
        return o
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); o = obj(naam, me, m, ouder); o.location = loc; o.rotation_euler = rot; o.scale = schaal
    if kw.get('rond'): bv = o.modifiers.new('bv', 'BEVEL'); bv.width = kw['rond']; bv.segments = 3; bv.limit_method = 'NONE'
    if kw.get('glad'): subsurf(o, kw['glad'])
    return o
D2R = math.pi / 180
root = leeg('bellyboat')

# ---------- de pontons: een U van buis met spitse, iets opgetilde neuzen ----------
pad = []; n_recht = 26
for i in range(n_recht + 1): pad.append((-B, VOOR - (VOOR - ACHTER) * i / n_recht))
for i in range(1, 24): h = math.pi - math.pi * i / 24; pad.append((math.cos(h) * B, ACHTER - math.sin(h) * B * 0.8))
for i in range(n_recht + 1): pad.append((B, ACHTER + (VOOR - ACHTER) * i / n_recht))
L = [0.0]
for i in range(1, len(pad)): L.append(L[-1] + math.dist(pad[i], pad[i - 1]))
tot = L[-1]
def straal(i): d = min(L[i], tot - L[i]); return R * max(0.06, min(1, d / 0.42) ** 0.5)
def op(i): d = min(L[i], tot - L[i]); return (1 - d / 0.45) ** 2 * 0.07 if d < 0.45 else 0
def buis(naam, m, rf=1.0, kleur_fn=None, ring_n=20, dy=0.0, alleen=None):
    bm = bmesh.new(); rings = []
    for i, (x, z) in enumerate(pad):
        a_ = pad[max(0, i - 1)]; b_ = pad[min(len(pad) - 1, i + 1)]; t = Vector((b_[0] - a_[0], b_[1] - a_[1])).normalized(); zij = Vector((t.y, -t.x))
        r = straal(i) * rf; ring = []
        for j in range(ring_n):
            h = 2 * math.pi * j / ring_n; c = P(x + zij.x * math.cos(h) * r, z + zij.y * math.cos(h) * r, 0.1 + op(i) + math.sin(h) * r + dy); ring.append(bm.verts.new(c))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for j in range(ring_n):
            if alleen and not alleen(i, j, ring_n): continue
            bm.faces.new((rings[i][j], rings[i][(j + 1) % ring_n], rings[i + 1][(j + 1) % ring_n], rings[i + 1][j]))
    for r_ in (rings[0], rings[-1]): bm.faces.new(r_[::-1] if r_ is rings[0] else r_)
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); return obj(naam, me, m, root)
romp = buis('romp', PVC); subsurf(romp, 1)
# de stootrand rond de zijkant (en bij MADCAT de groene onderkant)
strook = buis('stootrand', BAND, rf=1.025, alleen=lambda i, j, n: n * 0.44 <= j <= n * 0.56 or j < n * 0.06 or j > n * 0.94 if False else (j in (0, n - 1) or j == n // 2 - 1 or j == n // 2)); subsurf(strook, 1)
if KL['onder']: onder = buis('onderkant', mat('groen', KL['onder'], 0.35), rf=1.012, alleen=lambda i, j, n: j >= n * 0.5 + 1 and j <= n - 2); subsurf(onder, 1)
# lasnaden bovenop (twee dunne lijnen langs de buis)
for kant in (-1, 1): naad = buis('naad', BAND, rf=1.006, ring_n=40, alleen=lambda i, j, n, k=kant: j == (n // 4 + k * 3) % n); subsurf(naad, 0)
# ventielen, D-ringen, handgrepen
for x in (-B, B):
    prim('cil', 'ventiel', ZWM, P(x, 0.62, 0.1 + R + 0.004), schaal=(0.026, 0.026, 0.012), seg=16)
    prim('cil', 'ventieldop', ZW, P(x, 0.62, 0.1 + R + 0.014), schaal=(0.016, 0.016, 0.01), seg=12)
    for z in (0.15, 0.78): prim('torus', 'dring', RVS, P(x + math.copysign(R * 0.92, x), z, 0.1), rot=(90 * D2R, 0, 0), schaal=(0.022, 0.022, 0.022), dik=0.18)
    prim('box', 'greep', BAND, P(x, -0.05, 0.1 + R + 0.01), schaal=(0.05, 0.14, 0.018), rond=0.006)
# ---------- het schort tussen de pontons (stof, iets doorgezakt) en de spatplaat achter ----------
bm = bmesh.new(); nx, nz = 10, 14
vs = [[bm.verts.new(P(-B + 0.12 + (2 * B - 0.24) * i / nx, ACHTER - 0.15 + (0.75) * k / nz, 0.06 - 0.06 * math.sin(math.pi * i / nx) * math.sin(math.pi * k / nz))) for k in range(nz + 1)] for i in range(nx + 1)]
for i in range(nx):
    for k in range(nz): bm.faces.new((vs[i][k], vs[i + 1][k], vs[i + 1][k + 1], vs[i][k + 1]))
me = bpy.data.meshes.new('schort'); bm.to_mesh(me); bm.free(); obj('schort', me, STOF, root)
# ---------- de stoel: zitkussen, hoge rugleuning met een frame, zijtassen van EVA ----------
zit = leeg('zit', P(0, -0.18, 0.12), root)
prim('box', 'zitting', STOF, P(0, -0.18, 0.16), schaal=(0.6, 0.48, 0.09), rond=0.035, glad=1)
rug = prim('box', 'rugleuning', STOF, P(0, -0.48, 0.48), rot=(-12 * D2R, 0, 0), schaal=(0.54, 0.1, 0.56), rond=0.04, glad=1)
for x in (-0.24, 0.24):
    f_ = prim('cil', 'frame', ALU, P(x, -0.56, 0.4), rot=(-12 * D2R, 0, 0), schaal=(0.012, 0.012, 0.6), seg=10)
for kant in (-1, 1):
    tas = prim('box', 'zijtas', EVA, P(kant * (B - 0.02), -0.12, 0.1 + R + 0.075), schaal=(0.15, 0.42, 0.15), rond=0.03, glad=1)
    prim('box', 'rits', RVS, P(kant * (B - 0.02), -0.12, 0.1 + R + 0.152), schaal=(0.004, 0.4, 0.004))
prim('box', 'rugtas', EVA, P(0, -0.74, 0.36), schaal=(0.46, 0.22, 0.3), rond=0.04, glad=1)
# ---------- Garmin (of Wims kleine sonar) op een Scotty-mount op de rechter ponton ----------
SCH = mat('Scherm', (0.02, 0.05, 0.25), 0.2, emis=(0.01, 0.03, 0.2))
klein = SOORT == 'blackcat'
mnt = leeg('mount', P(B - 0.02, 0.5, 0.1 + R), root)
prim('box', 'voetplaat', ZW, P(B - 0.02, 0.5, 0.1 + R + 0.008), schaal=(0.11, 0.15, 0.016), rond=0.005)
prim('cil', 'scotty', mat('scottyrood', (0.5, 0.06, 0.04), 0.5), P(B - 0.02, 0.5, 0.1 + R + 0.05), schaal=(0.024, 0.024, 0.07), seg=16)
prim('bol', 'kogel', ZW, P(B - 0.02, 0.5, 0.1 + R + 0.1), schaal=(0.028, 0.028, 0.028))
arm = prim('box', 'ramarm', ZW, P(B - 0.04, 0.46, 0.1 + R + 0.15), rot=(30 * D2R, 0, 0), schaal=(0.034, 0.03, 0.11), rond=0.012)
w, h = (0.17, 0.11) if klein else (0.27, 0.17)
kast = prim('box', 'garmin', ZW, P(B - 0.06, 0.4, 0.1 + R + 0.24), rot=(70 * D2R, 0, 20 * D2R), schaal=(w, 0.045, h), rond=0.012)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
me = bpy.data.meshes.new('scherm'); bm.to_mesh(me); bm.free(); sch = obj('scherm', me, SCH)
uv = me.uv_layers.new(); [setattr(uv.data[li], 'uv', (0.5 + me.vertices[lp.vertex_index].co.x, 0.5 + me.vertices[lp.vertex_index].co.y)) for li, lp in enumerate(me.loops)]
sch.parent = kast; sch.location = (0, -0.0235 / 0.045 * 1.0, 0); sch.rotation_euler = (90 * D2R, 0, 0); sch.scale = (0.86, 0.8, 1)
if SOORT == 'madcat':  # zonnekap
    prim('box', 'kap', ZWM, (0, -0.4, 0.62), schaal=(1.06, 0.6, 0.05), ouder=kast)
    for k in (-1, 1): prim('box', 'kapzij', ZWM, (k * 0.52, -0.4, 0.1), schaal=(0.05, 0.6, 1.0), ouder=kast)
for i in range(4): prim('cil', 'knop', ALU, (0.42, -0.55, 0.3 - i * 0.2), rot=(90 * D2R, 0, 0), schaal=(0.03, 0.03, 0.1), ouder=kast, seg=10)
# ---------- de transducerstang: RVS, rechts naast de punt, met klem en greep ----------
stang = leeg('stang', P(B + R + 0.05, 0.78, 0), root)
prim('box', 'klem', ALU, P(B + R + 0.02, 0.78, 0.1 + R - 0.01), schaal=(0.09, 0.06, 0.05), rond=0.008)
prim('cil', 'paal', RVS, (0, 0, -0.12), schaal=(0.011, 0.011, 0.95), ouder=stang, seg=12)
prim('cil', 'greep', RUBBER, (-0.04, 0, 0.38), rot=(0, 90 * D2R, 0), schaal=(0.017, 0.017, 0.12), ouder=stang, seg=12)
prim('box', 'transducer', ZW, (0, -0.04, -0.58), schaal=(0.06, 0.17, 0.07), rond=0.015, ouder=stang)
# ---------- hengelsteunen achter, de bekerhouder op de linker ponton ----------
for x in (-0.42, 0.42):
    prim('cil', 'hengelsteun', ZW, P(x, -0.62, 0.5), schaal=(0.022, 0.022, 0.42), seg=14)
    prim('cil', 'steunvoet', ALU, P(x, -0.62, 0.31), schaal=(0.035, 0.035, 0.03), seg=14)
prim('box', 'bekerplank', ZW, P(-B + 0.02, 0.36, 0.1 + R + 0.012), schaal=(0.2, 0.12, 0.018), rond=0.005)
prim('cil', 'bekerhouder', ZW, P(-B - 0.02, 0.36, 0.1 + R + 0.06), schaal=(0.042, 0.042, 0.075), seg=18)
# ---------- de motor: beugel op de boog achter, kop met helmstok, schacht, onderwaterhuis, schroef ----------
mot = leeg('motor', P(0.34, -0.98, 0), root)
prim('box', 'beugel', ALU, (0, -0.06, 0.3), schaal=(0.09, 0.05, 0.12), ouder=mot, rond=0.01)
prim('cil', 'schacht', ZW, (0, 0, 0.12), schaal=(0.021, 0.021, 0.92), ouder=mot, seg=14)
prim('box', 'kop', ZW, (0, 0, 0.62), schaal=(0.15, 0.24, 0.13), ouder=mot, rond=0.04, glad=1)
helm = prim('cil', 'helmstok', ZW, (-0.1, 0.18, 0.62), rot=(0, 0, 55 * D2R), schaal=(0.017, 0.017, 0.36), ouder=mot, seg=12)
helm.rotation_euler = (90 * D2R, 0, -35 * D2R)
prim('cil', 'handvat', RUBBER, (-0.2, 0.33, 0.62), rot=(90 * D2R, 0, -35 * D2R), schaal=(0.022, 0.022, 0.12), ouder=mot, seg=12)
prim('bol', 'huis', ZW, (0, 0, -0.34), schaal=(0.05, 0.13, 0.05), ouder=mot)
prim('box', 'vin', ZW, (0, 0.02, -0.42), schaal=(0.008, 0.08, 0.08), ouder=mot)
sr = leeg('schroef', (0, 0.14, -0.34), mot)
for i in range(3): bl = prim('box', 'blad', mat('schroefgrijs', (0.12, 0.12, 0.13), 0.4), (0, 0, 0), rot=(0, i * 120 * D2R, 0), schaal=(0.035, 0.006, 0.09), ouder=sr, rond=0.003); bl.location = (math.sin(i * 120 * D2R) * 0.045, 0, math.cos(i * 120 * D2R) * 0.045); bl.rotation_euler = (0.35, i * 120 * D2R, 0)
prim('box', 'accu', EVA, P(-0.3, -0.92, 0.3), schaal=(0.24, 0.18, 0.18), rond=0.02, glad=1)
# ---------- het logo op de zijkanten ----------
try:
    from PIL import Image, ImageDraw, ImageFont
    im = Image.new('RGBA', (512, 128), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    try: font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 84)
    except Exception: font = ImageFont.load_default()
    kl = {'raptor': (220, 222, 224, 255), 'madcat': (140, 235, 90, 255), 'blackcat': (230, 205, 80, 255)}[SOORT]
    d.text((256, 66), KL['logo'], font=font, fill=kl, anchor='mm')
    if SOORT == 'raptor':
        for i in range(3): d.line([(255 + i * 26, 14), (230 + i * 26, 114)], fill=(210, 40, 30, 255), width=10)
    pad_ = f'/tmp/logo_{SOORT}.png'; im.save(pad_)
    img = bpy.data.images.load(pad_); img.pack(); lm = bpy.data.materials.new('logo'); lm.use_nodes = True; lm.blend_method = 'CLIP'
    tx = lm.node_tree.nodes.new('ShaderNodeTexImage'); tx.image = img; bs = lm.node_tree.nodes['Principled BSDF']
    lm.node_tree.links.new(tx.outputs['Color'], bs.inputs['Base Color']); lm.node_tree.links.new(tx.outputs['Alpha'], bs.inputs['Alpha']); bs.inputs['Roughness'].default_value = 0.4
    for kant in (-1, 1):
        bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5); me = bpy.data.meshes.new('logo'); bm.to_mesh(me); bm.free()
        uv = me.uv_layers.new(); [setattr(uv.data[li], 'uv', (0.5 + me.vertices[lp.vertex_index].co.x, 0.5 + me.vertices[lp.vertex_index].co.y)) for li, lp in enumerate(me.loops)]
        o = obj('logo', me, lm, root); z = 0.45 if SOORT != 'raptor' else -0.12; o.location = P(kant * (B + R + 0.004), z, 0.12); o.rotation_euler = (90 * D2R, 0, kant * 90 * D2R); o.scale = (0.4, 0.1, 1)
except Exception as e: print('logo', e)
# ---------- toepassen en wegschrijven ----------
for o in bpy.data.objects:
    if o.type == 'MESH':
        bpy.context.view_layer.objects.active = o
        for md in list(o.modifiers):
            try: bpy.ops.object.modifier_apply(modifier=md.name)
            except Exception: o.modifiers.remove(md)
tel = sum(len(o.data.polygons) for o in bpy.data.objects if o.type == 'MESH'); print('vlakken', tel)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True)
print('KLAAR', OUT)
