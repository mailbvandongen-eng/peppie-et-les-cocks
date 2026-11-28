# blender -b -P tools/aas/dauwwormen.py -- <uitmap>
# Canadese dauwwormen (Canadian nightcrawlers) van tom-cat.nl (meerval-aas/levend-aas/dauwwormen/canadese-dauwwormen):
# een bekertje met 12 levende dauwpieren, en de doos waarin ze geleverd worden. Maakt in <uitmap>:
#   dauwworm-doosje.glb  : één bekertje (node "doosje")
#   dauwwormen-doos.glb  : de open kartonnen doos vol bekertjes (twee lagen van 4 x 4, nodes "doosje-1-01".."doosje-2-16"),
#                          met twee witte koelzakken bovenop, zoals op productfoto canadese-dauwwormen-2.jpg
# Op Sketchfab staat geen bruikbaar papieren bekertje of aasbakje (CC0/CC BY); daarom zelf gebouwd naar de productfoto's.
# Het bekertje: een taps papieren bekertje met een bedrukte wikkel (wormenfoto + beige etiket "CANADIAN NIGHTCRAWLERS -
# Best bait alive!", FRESH!-labeltje, vissen) en een los kraftpapieren deksel met opstaande rand en bedrukte bovenkant
# (wormen, paarse cirkel met wereldbol, het etiket schuin, QR-code). Gesloten, zoals ze verkocht worden.
# Maten: de winkel noemt geen maten. Het deksel is als 11,5 cm aangenomen (de gangbare maat voor zulke kraftpapieren
# 350-500 ml-bekers); de rest is in verhouding gemeten op foto canadese-dauwwormen.jpg (gestapelde bekers, 615 px deksel):
# deksel Ø 11,5 cm en 2,0 cm hoog, lijf onder het deksel Ø 10,1 cm, bodem Ø 9,05 cm, totaal 6,05 cm hoog.
# De doos: 4 x 4 bekers per laag (cel 11,9 cm), binnen 48 x 48 cm, 15,5 cm hoog, kleppen open; aantal en hoogte
# geschat uit foto 2 (bovenste laag: vier rijen van vier, twee koelzakken in het midden, gestapeld zoals in de koeling op foto 3).
# Het kartonnen lijf staat midden op x = z = 0; de open kleppen steken ongelijk uit (achter rechtop, voor schuin omlaag).
# In de doos: bovenlaag = hetzelfde bekertje met 32 segmenten, onderlaag alleen het deksel (de rest is niet te zien).
# Texturen (tools/aas/, gemaakt met dauwwormen-textuur.py): dauwworm-doosje.jpg (atlas: wikkel voor/achter, deksel, kraft), dauwworm-koelzak.jpg,
# dauwworm-karton.jpg + dauwworm-karton-normaal.jpg (ambientCG Cardboard002, CC0, getint).
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y); de glTF-export maakt er weer Y-omhoog van.
import bpy, bmesh, sys, os, math, random
from mathutils import Vector, Matrix

UIT = sys.argv[sys.argv.index('--') + 1]
HIER = os.path.dirname(os.path.abspath(__file__))
os.makedirs(UIT, exist_ok=True)
def P(x, y, z): return Vector((x, -z, y))
random.seed(12)

def leeg():
    for o in list(bpy.data.objects): bpy.data.objects.remove(o)
    for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
leeg(); sc = bpy.context.scene

def mat(naam, beeld, rough=0.75, kleur=None, normaal=None):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Roughness'].default_value = rough
    if normaal:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(HIER, normaal))
        t.image.colorspace_settings.name = 'Non-Color'; nm = nt.nodes.new('ShaderNodeNormalMap'); nm.inputs['Strength'].default_value = 0.8
        nt.links.new(t.outputs['Color'], nm.inputs['Color']); nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    if beeld:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(os.path.join(HIER, beeld))
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
    else: b.inputs['Base Color'].default_value = (*kleur, 1)
    return m
DOOSJE = mat('doosje', 'dauwworm-doosje.jpg', 0.7)
ZAK = mat('koelzak', 'dauwworm-koelzak.jpg', 0.35)
KARTON = mat('karton', 'dauwworm-karton.jpg', 0.9, normaal='dauwworm-karton-normaal.jpg')

# ---------- maten bekertje (meter) ----------
R_DEK, H_TOT = 0.0575, 0.0605           # deksel
Y_DEK = 0.0405                          # onderrand deksel
R_BOD, R_ONDER_DEK = 0.04525, 0.0505    # lijf onderaan / net onder het deksel (bij y = 0.041)
def r_lijf(y): return R_BOD + (R_ONDER_DEK - R_BOD) * y / 0.041
# atlas (1024 px): wikkel voor rij y 0..272, achter 272..544; deksel 0..480 x 544..1024; kraft 480..1024 x 544..1024
def uv_px(x, y): return (x / 1024, 1 - y / 1024)
def uv_deksel(px, pz):                  # bovenaanzicht: beeld-boven = achterkant (-z)
    return uv_px(240 + px / R_DEK * 240, 784 + pz / R_DEK * 240)
def uv_kraft(th, t):                    # th in rad, t 0..1
    return uv_px(482 + (th + math.pi / 2) / (2 * math.pi) * 540, 548 + t * 470)   # th loopt van -90 tot 270 graden

def draai(bm, prof, uv, n, th0=-math.pi / 2, th1=1.5 * math.pi, uvl=None):
    """Omwentelingsvlak: prof = [(r, y), ...], uv(th, i, r, y) -> (u, v). n segmenten tussen th0 en th1."""
    rij = []
    for j in range(n + 1):
        th = th0 + (th1 - th0) * j / n
        rij.append([bm.verts.new(P(r * math.sin(th), y, r * math.cos(th))) for r, y in prof])
    ul = bm.loops.layers.uv.verify()
    for j in range(n):
        for i in range(len(prof) - 1):
            a, b, c, d = rij[j][i], rij[j + 1][i], rij[j + 1][i + 1], rij[j][i + 1]
            if prof[i][0] < 1e-7 and prof[i + 1][0] < 1e-7: continue
            vs = [a, b, c, d]; ks = [(j, i), (j + 1, i), (j + 1, i + 1), (j, i + 1)]
            if prof[i][0] < 1e-7: vs, ks = [a, c, d], [(j, i), (j + 1, i + 1), (j, i + 1)]
            elif prof[i + 1][0] < 1e-7: vs, ks = [a, b, d], [(j, i), (j + 1, i), (j, i + 1)]
            try: f = bm.faces.new(vs)
            except ValueError: continue
            f.smooth = True
            for lp, (jj, ii) in zip(f.loops, ks):
                th = th0 + (th1 - th0) * jj / n; r, y = prof[ii]
                lp[ul].uv = uv(th, ii, r, y)

def maak_mesh(naam, bm, m, scherp=40):
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(scherp): e.smooth = False
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); me.materials.append(m)
    return me

def bekertje_mesh(n=48, alleen_deksel=False):
    bm = bmesh.new()
    # deksel: onderkant (ring tegen het lijf), rolrand, opstaande rand, afgeronde bovenrand, ring, verzonken bedrukte schijf
    rb = r_lijf(Y_DEK)
    band = [(rb, Y_DEK), (R_DEK - 0.0006, Y_DEK), (R_DEK + 0.0003, Y_DEK + 0.0006), (R_DEK + 0.0004, Y_DEK + 0.0024),
            (R_DEK, Y_DEK + 0.0036), (R_DEK - 0.0001, H_TOT - 0.0022), (R_DEK - 0.0005, H_TOT - 0.0006), (R_DEK - 0.0014, H_TOT)]
    hb = H_TOT - Y_DEK
    draai(bm, band, lambda th, i, r, y: uv_kraft(th, 1 - (y - Y_DEK) / hb) if i else uv_kraft(th, 1.0), n)
    top = [(R_DEK - 0.0014, H_TOT), (0.0496, H_TOT), (0.0490, H_TOT - 0.0012), (0.0484, H_TOT - 0.0014)]
    top += [(0.0484 * k / 5, H_TOT - 0.0014 - 0.0003 * (1 - (k / 5) ** 2)) for k in (4, 3, 2, 1, 0)]
    draai(bm, top, lambda th, i, r, y: uv_deksel(r * math.sin(th), r * math.cos(th)), n)
    if not alleen_deksel:
        # lijf met de wikkel: voorkant (-90..+90 graden) en achterkant (+90..+270) apart in de atlas
        Y_W = 0.041
        lijf = [(R_BOD, 0.0), (r_lijf(Y_W / 2), Y_W / 2), (r_lijf(Y_W), Y_W), (r_lijf(Y_DEK + 0.002), Y_DEK + 0.002)]
        def uv_w(rij):
            def f(th, i, r, y):
                t = (th + math.pi / 2) % math.pi / math.pi
                if rij == 0 and th > math.pi / 2 - 1e-6: t = 1.0
                if rij == 1 and th > 1.5 * math.pi - 1e-6: t = 1.0
                return uv_px(t * 1023.5, rij * 272 + 2 + (1 - min(y, Y_W) / Y_W) * 268)
            return f
        draai(bm, lijf, uv_w(0), n // 2, -math.pi / 2, math.pi / 2)
        draai(bm, lijf, uv_w(1), n // 2, math.pi / 2, 1.5 * math.pi)
        # bodem: rand, verzonken bodem (kraft)
        bod = [(0.0, 0.0045), (0.040, 0.0045), (0.0438, 0.0040), (0.0443, 0.0006), (R_BOD - 0.0006, 0.0), (R_BOD, 0.0)]
        draai(bm, bod, lambda th, i, r, y: uv_px(750 + r * math.sin(th) * 4000, 784 + r * math.cos(th) * 4000), n)
    return maak_mesh('doosje-onderlaag' if alleen_deksel else 'doosje', bm, DOOSJE)

def exporteer(pad):
    for o in sc.objects: o.select_set(True)
    bpy.ops.export_scene.gltf(filepath=pad, export_format='GLB', export_yup=True, export_apply=True,
                              export_image_format='JPEG', export_jpeg_quality=90)
    print('klaar', pad)

# ================= 1. één bekertje =================
BEKER = bekertje_mesh()
o = bpy.data.objects.new('doosje', BEKER); sc.collection.objects.link(o)
exporteer(os.path.join(UIT, 'dauwworm-doosje.glb'))

# ================= 2. de doos =================
for ob in list(bpy.data.objects): bpy.data.objects.remove(ob)
BEKER_ONDER = bekertje_mesh(32, alleen_deksel=True)       # onderste laag: alleen het deksel is tussen de bekers door te zien
BEKER_DOOS = bekertje_mesh(32); BEKER_DOOS.name = 'doosje-32'   # zelfde bekertje met 32 i.p.v. 48 segmenten: 32 stuks voor de telefoon
wortel = bpy.data.objects.new('dauwwormen-doos', None); sc.collection.objects.link(wortel)
BI, HD, DIK = 0.48, 0.155, 0.004         # binnenmaat, hoogte, kartondikte
CEL = 0.119

def karton_vlak(naam, hoeken, ouder, schaal=0.45):
    """Plat stuk karton (4 hoekpunten, spel-assen) met dikte; UV in meters / schaal."""
    bm = bmesh.new(); vs = [bm.verts.new(P(*h)) for h in hoeken]; f = bm.faces.new(vs)
    ul = bm.loops.layers.uv.verify()
    a, b, d = Vector(hoeken[0]), Vector(hoeken[1]), Vector(hoeken[3])
    eu, ev = (b - a).normalized(), (d - a).normalized()
    for lp, h in zip(f.loops, hoeken):
        q = Vector(h) - a; lp[ul].uv = (q.dot(eu) / schaal + random.random(), q.dot(ev) / schaal)
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=DIK)
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); me.materials.append(KARTON)
    ob = bpy.data.objects.new(naam, me); sc.collection.objects.link(ob); ob.parent = ouder
    return ob

h = BI / 2 + DIK
# bodem en wanden (normalen naar buiten; solidify maakt de dikte naar binnen)
karton_vlak('bodem', [(-h, 0, h), (h, 0, h), (h, 0, -h), (-h, 0, -h)][::-1], wortel)
karton_vlak('wand-voor', [(-h, 0, h), (h, 0, h), (h, HD, h), (-h, HD, h)], wortel)
karton_vlak('wand-achter', [(h, 0, -h), (-h, 0, -h), (-h, HD, -h), (h, HD, -h)], wortel)
karton_vlak('wand-links', [(-h, 0, -h), (-h, 0, h), (-h, HD, h), (-h, HD, -h)], wortel)
karton_vlak('wand-rechts', [(h, 0, h), (h, 0, -h), (h, HD, -h), (h, HD, h)], wortel)
# kleppen (open): elk zo lang als de halve binnenmaat; hoek vanaf de wand gemeten (0 = recht omhoog, 90 = plat naar buiten)
def klep(naam, kant, hoek):
    L = BI / 2; a = math.radians(hoek)
    uit_, op = L * math.sin(a), L * math.cos(a)
    if kant == 'voor':   hk = [(-h, HD, h), (h, HD, h), (h, HD + op, h + uit_), (-h, HD + op, h + uit_)]
    if kant == 'achter': hk = [(h, HD, -h), (-h, HD, -h), (-h, HD + op, -h - uit_), (h, HD + op, -h - uit_)]
    if kant == 'links':  hk = [(-h, HD, -h + .004), (-h, HD, h - .004), (-h - uit_, HD + op, h - .004), (-h - uit_, HD + op, -h + .004)]
    if kant == 'rechts': hk = [(h, HD, h - .004), (h, HD, -h + .004), (h + uit_, HD + op, -h + .004), (h + uit_, HD + op, h - .004)]
    return karton_vlak(naam, hk, wortel)
klep('klep-achter', 'achter', 12)        # achterklep staat bijna rechtop (foto 2)
klep('klep-voor', 'voor', 125)           # voorklep schuin naar beneden over de voorkant (blijft boven de grond)
klep('klep-links', 'links', 115)
klep('klep-rechts', 'rechts', 105)

# bekers: twee lagen van 4 x 4, een beetje scheef en gedraaid zoals ze erin gezet zijn
n = 0
for laag in (1, 2):
    for rij in range(4):
        for kol in range(4):
            n += 1
            x = (kol - 1.5) * CEL + random.uniform(-0.004, 0.004)
            z = (rij - 1.5) * CEL + random.uniform(-0.004, 0.004)
            y = DIK + (laag - 1) * H_TOT
            ob = bpy.data.objects.new(f'doosje-{laag}-{n - (laag - 1) * 16:02d}', BEKER_DOOS if laag == 2 else BEKER_ONDER)
            sc.collection.objects.link(ob); ob.parent = wortel
            ob.matrix_world = Matrix.Translation(P(x, y, z)) @ Matrix.Rotation(random.uniform(0, 2 * math.pi), 4, 'Z')

# koelzakken: witte plastic zakken (koelelement), bol en wat gekreukt, op de middelste bekers (foto 2)
def koelzak(naam, mid, lx, lz, dik, draai_):
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for _ in range(3): bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=1, use_grid_fill=True)
    ul = bm.loops.layers.uv.verify()
    for v in bm.verts:
        x, yb, z = v.co.x, v.co.y, v.co.z          # Blender-kubus -0.5..0.5; spel: x, y=z_b, z=-y_b
        sx, sz = 2 * x, -2 * yb
        bol = (1 - sx * sx) ** 0.5 * (1 - sz * sz) ** 0.5
        hy = z * dik * (0.25 + 0.75 * bol) + dik * 0.5
        rimpel = 0.004 * math.sin(sx * 9 + sz * 5) * math.sin(sz * 11 - sx * 3)
        v.co = P(x * lx * (1 - 0.06 * abs(z)), hy + rimpel * bol, -yb * lz * (1 - 0.06 * abs(z)))
    for f in bm.faces:
        f.smooth = True
        for lp in f.loops:
            c = lp.vert.co; lp[ul].uv = (0.5 + c.x / lx * 0.95, 0.5 + c.y / lz * 0.95)
    me = bpy.data.meshes.new(naam); bm.to_mesh(me); bm.free(); me.materials.append(ZAK)
    ob = bpy.data.objects.new(naam, me); sc.collection.objects.link(ob); ob.parent = wortel
    ob.matrix_world = Matrix.Translation(P(*mid)) @ Matrix.Rotation(draai_, 4, 'Z')
y_top = DIK + 2 * H_TOT - 0.012
koelzak('koelzak-1', (-0.065, y_top, -0.045), 0.17, 0.15, 0.045, 0.12)
koelzak('koelzak-2', (0.11, y_top + 0.004, -0.04), 0.19, 0.16, 0.05, -0.08)

# karton samenvoegen tot één mesh
bpy.context.view_layer.update()
delen = [o for o in wortel.children if o.data and o.data.materials[0] == KARTON]
bpy.ops.object.select_all(action='DESELECT')
for o in delen: o.select_set(True)
bpy.context.view_layer.objects.active = delen[0]; bpy.ops.object.join(); delen[0].name = 'karton'; delen[0].data.name = 'karton'
for p in delen[0].data.polygons: p.use_smooth = False
# controle: onderkant op y = 0 (Blender z), midden op x = z = 0
bpy.context.view_layer.update()
zs = [(o.matrix_world @ v.co) for o in sc.objects if o.type == 'MESH' for v in o.data.vertices]
print('doos: min', [round(min(c[i] for c in zs), 4) for i in range(3)], 'max', [round(max(c[i] for c in zs), 4) for i in range(3)])
exporteer(os.path.join(UIT, 'dauwwormen-doos.glb'))
