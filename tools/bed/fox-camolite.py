# blender -b -P tools/bed/fox-camolite.py -- <uit.glb>
# Fox Camolite Sleep System (bedchair met vaste slaapzak), nagebouwd naar de productfoto's (eurotackle.nl) en de maten van Fox:
# 219 × 91 cm, 37-47 cm hoog. Khaki aluminium frame met afgeronde hoeken, zes schuine poten met zwarte verstelhuizen en grote
# ronde modderpoten; daarop een dik gewatteerd camo-matras met een opstaande rand rond het hoofdeinde, olijfgroen fleece binnenin,
# en de camo-slaapzak over het voeteneinde met de bovenflap teruggeslagen (fleece zichtbaar), zoals op de eerste productfoto.
# Camo: uit de productfoto van Fox (tools/bed/camo.jpg, naadloos gemaakt). Fleece: "Fabric082A" van ambientCG (CC0), getint.
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y). Het hoofdeinde ligt aan -z.
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index('--') + 1]
HIER = os.path.dirname(os.path.abspath(__file__)); STOF = os.path.join(HIER, '..', 'tent', 'stof')
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
sc = bpy.context.scene
def P(x, y, z): return Vector((x, -z, y))

L, B, FH = 2.19, 0.91, 0.31            # lengte, breedte, hoogte van het frame (matras erop: ± 42 cm totaal)

def mat(naam, kleur, rough=0.8, metal=0.0, beeld=None, normaal=None, ns=0.6):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if beeld: t = nt.nodes.new('ShaderNodeTexImage'); t.image = beeld; nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if normaal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = normaal; t.image.colorspace_settings.name = 'Non-Color'
        nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = ns
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    return m
def getint(pad, tint, naam):
    im = bpy.data.images.load(pad); px = np.empty(len(im.pixels), dtype=np.float32); im.pixels.foreach_get(px)
    px = px.reshape(-1, 4); px[:, :3] *= np.array(tint, dtype=np.float32) / px[:, :3].mean(0); px = np.clip(px, 0, 1)
    n = bpy.data.images.new(naam, im.size[0], im.size[1]); n.pixels.foreach_set(px.ravel()); n.file_format = 'JPEG'; n.pack(); return n
NORMAAL = bpy.data.images.load(os.path.join(STOF, 'normaal.jpg'))
CAMO = mat('camo', (1, 1, 1), 0.75, beeld=bpy.data.images.load(os.path.join(HIER, 'camo.jpg')), normaal=NORMAAL, ns=0.4)
FLEECE = mat('fleece', (1, 1, 1), 0.95, beeld=getint(os.path.join(STOF, 'kleur.jpg'), (0.37, 0.33, 0.24), 'fleece-kleur'), normaal=NORMAAL, ns=1.0)
KHAKI = mat('frame', (0.16, 0.15, 0.1), 0.45, 0.55)
ZWART = mat('zwart', (0.012, 0.012, 0.012), 0.55)
OLIJF = mat('band', (0.12, 0.115, 0.075), 0.8)

def obj(naam, bm, m, ouder):
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(naam, me); sc.collection.objects.link(o)
    me.materials.append(m); o.parent = ouder
    for p in me.polygons: p.use_smooth = True
    return o
wortel = bpy.data.objects.new('fox-camolite', None); sc.collection.objects.link(wortel)

# ---------- kussens: superellipsoïde (bol, met afgeronde randen), met watteerlijnen ----------
def kussen(naam, mid, a, b, c, m, e_v=0.35, e_h=0.22, quilt=0.0, qx=0.3, qz=0.22, tegel=(0.8, 0.53), kantel=0.0, ouder=wortel, nu=72, nv=28):
    se = lambda x, e: math.copysign(abs(x) ** e, x)
    bm = bmesh.new(); uv = bm.loops.layers.uv.new('UV'); rij = []
    for j in range(nv + 1):
        phi = -math.pi / 2 + math.pi * j / nv; r = []
        for i in range(nu):
            th = 2 * math.pi * i / nu
            x = a * se(math.cos(phi), e_v) * se(math.cos(th), e_h); z = c * se(math.cos(phi), e_v) * se(math.sin(th), e_h); y = b * se(math.sin(phi), e_v)
            if quilt and y > 0:                    # doorgestikte banen: kleine dalen bovenop
                d = (math.cos(2 * math.pi * x / qx) * 0.5 + 0.5) * (math.cos(2 * math.pi * z / qz) * 0.5 + 0.5); y -= quilt * (1 - d) * (y / b)
            p = Vector((x, y, z))
            if kantel: p = Vector((p.x, p.y * math.cos(kantel) - p.z * math.sin(kantel), p.y * math.sin(kantel) + p.z * math.cos(kantel)))
            r.append(bm.verts.new(P(mid[0] + p.x, mid[1] + p.y, mid[2] + p.z)))
        rij.append(r)
    for j in range(nv):
        for i in range(nu):
            q = (rij[j][i], rij[j][(i + 1) % nu], rij[j + 1][(i + 1) % nu], rij[j + 1][i]); f = bm.faces.new(q)
            f.normal_update(); n = f.normal                      # projectie per vlak: van boven, van opzij of van voren
            for l in f.loops:
                c = l.vert.co
                l[uv].uv = (c.y / tegel[0], c.x / tegel[1]) if abs(n.z) > 0.6 else ((c.y / tegel[0], c.z / tegel[1]) if abs(n.x) > abs(n.y) else (c.x / tegel[0], c.z / tegel[1]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj(naam, bm, m, ouder)

def buis(naam, pts, r, m, ouder=wortel, zijden=10, dicht=True):
    bm = bmesh.new(); ringen = []
    for k, p in enumerate(pts):
        t = (pts[min(k + 1, len(pts) - 1)] - pts[max(k - 1, 0)]).normalized(); a = t.cross(Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))).normalized(); b = t.cross(a)
        ringen.append([bm.verts.new(p + (a * math.cos(z / zijden * 2 * math.pi) + b * math.sin(z / zijden * 2 * math.pi)) * r) for z in range(zijden)])
    for k in range(len(ringen) - 1):
        for z in range(zijden): bm.faces.new((ringen[k][z], ringen[k][(z + 1) % zijden], ringen[k + 1][(z + 1) % zijden], ringen[k + 1][z]))
    if dicht: bm.faces.new(ringen[0][::-1]); bm.faces.new(ringen[-1])
    return obj(naam, bm, m, ouder)
def schijf(naam, mid, r, h, m, zijden=16, ouder=wortel):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=zijden, radius1=r, radius2=r * 0.85, depth=h)
    bmesh.ops.translate(bm, vec=mid, verts=bm.verts); return obj(naam, bm, m, ouder)

# ---------- matras, rand, fleece en slaapzak ----------
kussen('matras', (0, FH + 0.045, 0), B / 2, 0.045, L / 2, CAMO, quilt=0.006)
kussen('rand-hoofd', (0, FH + 0.115, -L / 2 + 0.11), B / 2 - 0.02, 0.06, 0.1, CAMO, e_v=0.6, e_h=0.35)
for k in (-1, 1): kussen('rand-zij', (k * (B / 2 - 0.06), FH + 0.1, -0.62), 0.065, 0.045, 0.45, CAMO, e_v=0.6, e_h=0.5)
kussen('fleece', (0, FH + 0.093, -0.62), B / 2 - 0.12, 0.012, 0.4, FLEECE, e_h=0.15, tegel=(0.5, 0.5))
kussen('slaapzak', (0, FH + 0.13, 0.33), B / 2 - 0.005, 0.1, 0.76, CAMO, e_v=0.5, e_h=0.45, quilt=0.014)
# de teruggeslagen bovenflap van de slaapzak (fleece zichtbaar) en de opgerolde rand ervan
kussen('flap', (0, FH + 0.2, -0.52), B / 2 - 0.05, 0.04, 0.22, FLEECE, e_v=0.5, e_h=0.3, kantel=-0.35, tegel=(0.5, 0.5), quilt=0.008, qx=0.25, qz=0.25)
buis('flaprand', [P(x, FH + 0.255, -0.31) for x in np.linspace(-B / 2 + 0.08, B / 2 - 0.08, 12)], 0.045, CAMO, zijden=12)

# ---------- frame: afgeronde rechthoek, zes poten met verstelhuis en modderpoot ----------
fl, fb, r_h = L / 2 - 0.1, B / 2 - 0.08, 0.09
rand = []
for (cx, cz, a0) in ((fb - r_h, fl - r_h, 0), (-(fb - r_h), fl - r_h, 90), (-(fb - r_h), -(fl - r_h), 180), (fb - r_h, -(fl - r_h), 270)):
    for k in range(7): a = math.radians(a0 + 90 * k / 6); rand.append(P(cx + r_h * math.cos(a), FH - 0.005, cz + r_h * math.sin(a)))
rand.append(rand[0]); buis('frame', rand, 0.016, KHAKI, zijden=12)
for z in (-0.35, 0.35): buis('dwarsbuis', [P(-fb, FH - 0.01, z), P(fb, FH - 0.01, z)], 0.011, KHAKI)
for (x, z) in ((1, -1), (1, 0), (1, 1), (-1, -1), (-1, 0), (-1, 1)):
    top = P(x * (fb - 0.02), FH - 0.02, z * (fl - 0.18)); voet = P(x * (fb + 0.17), 0.05, z * (fl - 0.08) + (0.0 if z else 0.0))
    huis_b = top.lerp(voet, 0.62)
    buis('poot', [top, huis_b], 0.014, KHAKI)
    buis('steun', [top.lerp(huis_b, 0.5), P(x * (fb - 0.25), FH - 0.01, z * (fl - 0.18))], 0.008, KHAKI)
    buis('verstelhuis', [huis_b, top.lerp(voet, 0.8)], 0.02, ZWART, zijden=10)
    buis('binnenpoot', [top.lerp(voet, 0.8), voet + Vector((0, 0, 0.0))], 0.009, ZWART)
    schijf('modderpoot', voet + Vector((0, 0, -0.025)), 0.055, 0.03, ZWART, 14)
    for k in range(7):                       # de ribbels van de modderpoot
        a = 2 * math.pi * k / 7; buis('ribbel', [voet + Vector((math.cos(a) * 0.02, math.sin(a) * 0.02, -0.01)), voet + Vector((math.cos(a) * 0.055, math.sin(a) * 0.055, -0.035))], 0.006, ZWART, zijden=5)
# klittenband-banden om het frame (olijf)
for z in (-0.8, 0.0, 0.8):
    for x in (-1, 1): buis('band', [P(x * (fb + 0.022), FH + 0.02, z - 0.025), P(x * (fb + 0.022), FH - 0.03, z - 0.025)], 0.012, OLIJF, zijden=6)

for o in sc.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='JPEG', export_jpeg_quality=88)
print('klaar', OUT)
