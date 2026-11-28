# blender -b -P tools/emmer/ridgemonkey-perspective.py -- <uit.glb>
# De RidgeMonkey Perspective Collapsible Bucket 10 L (RM296), nagebouwd naar de productfoto's van team-outdoors.nl.
# Let op: dit is géén siliconen harmonica-emmer, maar een opvouwbare emmer van 500D PVC: een slappe, heldere PVC-wand
# ("helder doorzichtig front") tussen een stijve bovenring en een olijfgroene PVC-bodem, hoogfrequent gelast.
# Maten: verpakt 27 × 27 × 5 cm (Mountain Warehouse, RM296) -> de stijve ring is ± 27 cm buiten; de hoogte (± 22 cm) en de
# bodem (± 25 cm) zijn op de productfoto's gemeten tegen die ring (hoogte/breedte ≈ 0,86) en kloppen met 10 liter inhoud.
# Onderdelen: heldere wand (doorzichtig: KHR_materials_transmission), donkere bovenring met een olijfgroene bies met
# geschulpte rand aan de binnenkant, olijfgroene bodem met opstaande rand, vier olijfgroene ronde lapjes met een sleuf
# waar het zwarte singelband doorheen gaat, het geel bedrukte RidgeMonkey-logo voorop (tools/emmer/logo.png: uit de
# productfoto geknipt en rechtgetrokken) en een gelaste naad achter. Het hengsel (node "hengsel"): twee lussen zwart
# singelband, links en rechts, die boven samenkomen in de olijfgroene gewatteerde greep met klittenband.
# Assen: spel-assen (x rechts, y omhoog, z naar voren) -> Blender (x, -z, y); de glTF-export maakt er weer Y-omhoog van.
# De bodem staat op y = 0, het midden op x = z = 0, het logo wijst naar +z.
import bpy, bmesh, sys, os, math
from mathutils import Vector

OUT = sys.argv[sys.argv.index('--') + 1]
HIER = os.path.dirname(os.path.abspath(__file__))
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
for m in list(bpy.data.materials): bpy.data.materials.remove(m)
sc = bpy.context.scene

def P(x, y, z): return Vector((x, -z, y))
def lerp(a, b, t): return a + (b - a) * t
def glad(t): t = min(max(t, 0.0), 1.0); return t * t * (3 - 2 * t)

# ---------- maten (meter, spel-assen) ----------
RING_Y, RING_R, RING_D = 0.214, 0.1290, 0.0065      # stijve bovenring: middelpunt-hoogte, straal, buisstraal (buiten Ø 27 cm)
BODEM_R = 0.1240                                     # bodem Ø ± 25 cm
LAP_Y, LAP_D = 0.172, 0.056                          # ronde lapjes met sleuf: hoogte van het midden, diameter
LAP_HOEK = [math.radians(a) for a in (50, 130, -50, -130)]   # vanaf voren (+z) naar rechts (+x) gemeten
GREEP_Y = 0.40                                       # hoogte van de greep als het hengsel omhoog gehouden wordt
SEG = 128                                            # segmenten rondom

def wand_r(y):        # profiel van de wand: licht taps naar boven, onder de ring iets ingesnoerd (zoals op de foto's)
    r = 0.1236 + 0.0028 * min(max((y - 0.012) / 0.18, 0), 1)
    if y > 0.192: r = lerp(r, 0.1222, glad((y - 0.192) / 0.0155))
    return r
def kreuk(th, y):     # zachte plooien in het PVC (van het opvouwen), uitdovend naar boven en onder
    f = math.sin(math.pi * glad((y - 0.012) / 0.195))
    return f * (0.0008 * math.sin(9 * th + 0.7) + 0.0005 * math.sin(14 * th + 2.1 + 9 * y) + 0.0004 * math.sin(5 * th - 1.3))
def rond(th, r, y): return P(r * math.sin(th), y, r * math.cos(th))

# ---------- materialen ----------
def mat(naam, kleur, rough=0.6, metal=0.0, transmissie=0.0, ior=1.45, beeld=None, dubbel=True):
    m = bpy.data.materials.new(naam); m.use_nodes = True; nt = m.node_tree; b = nt.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*kleur, 1); b.inputs['Roughness'].default_value = rough
    b.inputs['Metallic'].default_value = metal; b.inputs['IOR'].default_value = ior
    b.inputs['Transmission Weight'].default_value = transmissie
    if beeld:
        t = nt.nodes.new('ShaderNodeTexImage'); t.image = beeld
        nt.links.new(t.outputs['Color'], b.inputs['Base Color']); nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
        m.surface_render_method = 'BLENDED'
    m.use_backface_culling = not dubbel
    return m
OLIJF = (0.070, 0.098, 0.032)                       # sRGB ± (75, 88, 50), gemeten op de lapjes (foto 12)
GREEPGROEN = (0.052, 0.066, 0.040)                  # de gewatteerde greep (foto 2), iets grijzer
# Helder PVC: volledige transmissie, glad, IOR 1,45; de basiskleur geeft de lichte grijsgroene zweem van de foto's.
# Geen volume-dikte: het is een dunne folie, zo blijft wat erachter zit (het gezicht) scherp en onvervormd.
HELDER = mat('helder-pvc', (0.86, 0.92, 0.87), 0.08, transmissie=1.0, ior=1.45)
NAAD = mat('naad', (0.82, 0.88, 0.82), 0.2, transmissie=1.0, ior=1.45)   # gelaste naad: dubbele laag, iets matter
GROEN = mat('olijf-pvc', OLIJF, 0.55)
RING = mat('ring', (0.045, 0.05, 0.055), 0.22, 0.3)
BAND = mat('singelband', (0.018, 0.018, 0.017), 0.85)
GREEP = mat('greep', GREEPGROEN, 0.6)
SLEUF = mat('sleuf', (0.01, 0.011, 0.009), 0.7)
logo_im = bpy.data.images.load(os.path.join(HIER, 'logo.png')); logo_im.pack()
LOGO = mat('logo', (1, 1, 1), 0.45, beeld=logo_im)

# ---------- bouwer: één mesh met meerdere materialen ----------
class Bouw:
    def __init__(s): s.bm = bmesh.new(); s.uv = s.bm.loops.layers.uv.new('UV'); s.mats = []
    def mi(s, m):
        if m not in s.mats: s.mats.append(m)
        return s.mats.index(m)
    def raster(s, G, m, glad_=True, omkeren=False):     # G: rijen (v) van kolommen (u) met punten
        i = s.mi(m); V = [[s.bm.verts.new(p) for p in rij] for rij in G]; nv, nu = len(G), len(G[0])
        for j in range(nv - 1):
            for k in range(nu - 1):
                q = [V[j][k], V[j][k + 1], V[j + 1][k + 1], V[j + 1][k]]
                uv = [(k / (nu - 1), j / (nv - 1)), ((k + 1) / (nu - 1), j / (nv - 1)), ((k + 1) / (nu - 1), (j + 1) / (nv - 1)), (k / (nu - 1), (j + 1) / (nv - 1))]
                if omkeren: q.reverse(); uv.reverse()
                f = s.bm.faces.new(q); f.material_index = i; f.smooth = glad_
                for l, c in zip(f.loops, uv): l[s.uv].uv = c
    def klaar(s, naam, oorsprong=Vector((0, 0, 0))):
        bmesh.ops.remove_doubles(s.bm, verts=s.bm.verts, dist=1e-6)
        for v in s.bm.verts: v.co -= oorsprong
        me = bpy.data.meshes.new(naam); s.bm.to_mesh(me); s.bm.free()
        for m in s.mats: me.materials.append(m)
        o = bpy.data.objects.new(naam, me); o.location = oorsprong; sc.collection.objects.link(o); return o

def omwenteling(B, profiel, m, n=SEG, vorm=None, omkeren=False):   # profiel: lijst (r, y); vorm(th, r, y) -> extra straal
    G = []
    for (r, y) in profiel:
        rij = []
        for k in range(n + 1):
            th = 2 * math.pi * k / n; rr = r + (vorm(th, r, y) if vorm else 0); rij.append(rond(th, rr, y))
        G.append(rij)
    B.raster(G, m, omkeren=omkeren)

E = Bouw()
# heldere wand
ys = [0.012 + (0.2075 - 0.012) * i / 26 for i in range(27)]
omwenteling(E, [(wand_r(y), y) for y in ys], HELDER, vorm=lambda th, r, y: kreuk(th, y))
# gelaste naad achter (2 cm brede strook, net buiten de wand)
G = []
for y in ys[1:-3]:
    G.append([rond(math.pi + a, wand_r(y) + kreuk(math.pi + a, y) + 0.0006, y) for a in [(-0.006 + 0.012 * i / 4) / 0.125 for i in range(5)]])
E.raster(G, NAAD)
# olijfgroene bodem met afgeronde, opstaande rand
bodem = [(0.0, 0.0015), (0.06, 0.0015), (0.105, 0.0016), (0.116, 0.0022), (0.1205, 0.0045), (0.1232, 0.0085), (0.1241, 0.013), (BODEM_R + 0.0003, 0.018)]
omwenteling(E, bodem, GROEN, omkeren=True)
# stijve bovenring (torus)
G = []
for j in range(11):
    a = 2 * math.pi * j / 10
    G.append([rond(2 * math.pi * k / SEG, RING_R + RING_D * math.cos(a), RING_Y + RING_D * math.sin(a)) for k in range(SEG + 1)])
E.raster(G, RING)
# olijfgroene bies binnenin: over de bovenkant van de ring heen en aan de binnenkant naar beneden, met geschulpte onderrand
n_b = 240; G = []
for j in range(6):                                    # over de ring: van buiten-boven (60°) naar binnen (180°)
    a = math.radians(lerp(100, 180, j / 5)); r = RING_R + (RING_D + 0.0007) * math.cos(a); y = RING_Y + (RING_D + 0.0007) * math.sin(a)
    G.append([rond(2 * math.pi * k / n_b, r, y) for k in range(n_b + 1)])
rb = RING_R - RING_D - 0.0007
for j in range(1, 4):                                 # binnenkant naar beneden tot de schulprand
    t = j / 3; rij = []
    for k in range(n_b + 1):
        th = 2 * math.pi * k / n_b; yb = 0.1905 - 0.0035 * abs(math.sin(24 * th))
        rij.append(rond(th, rb, lerp(RING_Y, yb, t)))
    G.append(rij)
E.raster(G, GROEN)
# vier ronde lapjes met een donkere sleuf, op de wand gebogen
def op_wand(th0, u, v, yc, off):     # (u langs de omtrek, v omhoog) in meter -> punt op de wand
    y = yc + v; th = th0 + u / wand_r(y); return rond(th, wand_r(y) + kreuk(th, y) + off, y)
for th0 in LAP_HOEK:
    for off in (0.0016, -0.0012):                    # buiten en (door de wand zichtbaar) binnen
        G = [[op_wand(th0, (LAP_D / 2) * (j / 4) * math.cos(2 * math.pi * k / 24), (LAP_D / 2) * (j / 4) * math.sin(2 * math.pi * k / 24), LAP_Y, off * (1 + 0.15 * (1 - j / 4)))
              for k in range(25)] for j in range(5)]
        E.raster(G, GROEN, omkeren=off < 0)
    G = [[op_wand(th0, -0.013 + 0.026 * k / 4, 0.0035 + 0.007 * j, LAP_Y, 0.0024) for k in range(5)] for j in range(2)]
    E.raster(G, SLEUF)
# geel logo voorop (0,19 m breed, 3,8 cm hoog, midden op 11,2 cm)
LB, LH, LY = 0.19, 0.038, 0.112
G = [[op_wand(0.0, -LB / 2 + LB * k / 32, -LH / 2 + LH * j / 4, LY, 0.0013) for k in range(33)] for j in range(5)]
E.raster(G, LOGO)
emmer = E.klaar('emmer')

# ---------- hengsel: twee lussen singelband + de gewatteerde greep ----------
def bez(p0, p1, p2, p3, n): return [(1 - t) ** 3 * p0 + 3 * (1 - t) ** 2 * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3 for t in [i / n for i in range(n + 1)]]
def lint(B, pts, breed, dik, m, boven_y):            # plat band langs een lijn (spel-assen), 4 losse stroken (scherpe randen)
    T = []; W = []; N = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        radiaal = Vector((p.x, 0, p.z)).normalized(); h = glad((p.y - LAP_Y) / (boven_y - LAP_Y))
        ref = (radiaal * (1 - h) + Vector((0, 1, 0)) * h).normalized()          # bandvlak: tegen de wand, boven plat
        w = t.cross(ref).normalized(); n = w.cross(t).normalized(); W.append(w); N.append(n)
    def Q(i, a, b): p = pts[i] + W[i] * a + N[i] * b; return P(p.x, p.y, p.z)
    hb, hd = breed / 2, dik / 2; idx = range(len(pts))
    B.raster([[Q(i, -hb, hd), Q(i, hb, hd)] for i in idx], m)
    B.raster([[Q(i, hb, -hd), Q(i, -hb, -hd)] for i in idx], m)
    B.raster([[Q(i, hb, hd), Q(i, hb, -hd)] for i in idx], m)
    B.raster([[Q(i, -hb, -hd), Q(i, -hb, hd)] for i in idx], m)
H = Bouw()
for s in (1, -1):
    ta, tb = s * LAP_HOEK[0], s * LAP_HOEK[1]
    def V3(th, r, y): return Vector((r * math.sin(th), y, r * math.cos(th)))
    rp = wand_r(LAP_Y) + 0.0032
    A, B_ = V3(ta, rp, LAP_Y + 0.007), V3(tb, rp, LAP_Y + 0.007)
    ra, rb_ = V3(ta, 1, 0), V3(tb, 1, 0); up = Vector((0, 1, 0))
    yb = GREEP_Y + s * 0.0035                                                # de twee banden liggen op elkaar in de greep
    F, K = Vector((0, yb, 0.075)), Vector((0, yb, -0.075))
    pts = bez(A, A + up * 0.12 + ra * 0.035, F + Vector((s * 0.03, -0.02, 0.09)), F, 26)
    pts += [lerp(F, K, i / 8) for i in range(1, 9)]
    pts += bez(K, K + Vector((s * 0.03, -0.02, -0.09)), B_ + up * 0.12 + rb_ * 0.035, B_, 26)[1:]
    lint(H, pts, 0.025, 0.0016, BAND, GREEP_Y)
    # korte lusjes onder de sleuf (band komt uit de sleuf en gaat terug de wand in)
    for th0 in (ta, tb):
        G = [[V3(th0 + u / rp, rp + 0.0008 * math.sin(math.pi * j / 6), LAP_Y + 0.007 - 0.016 * j / 6) for u in (-0.0125, 0.0125)] for j in range(7)]
        H.raster([[P(p.x, p.y, p.z) for p in rij] for rij in G], BAND)
# greep: platte ovale buis langs z, ronde uiteinden, zwarte bies aan de kanten
def greep_ring(z, sx, sy, n=24): return [P(sx * math.cos(2 * math.pi * k / n), GREEP_Y + sy * math.sin(2 * math.pi * k / n), z) for k in range(n + 1)]
G = []
for j in range(21):
    z = lerp(0.068, -0.068, j / 20); e = max(0, abs(z) - 0.055) / 0.013; f = math.sqrt(max(0.0, 1 - e * e)) * 0.85 + 0.15 if e > 0 else 1.0
    G.append(greep_ring(z, 0.021 * f, 0.016 * f * (1 + 0.04 * math.cos(z * 60))))
H.raster(G, GREEP)
for z0 in (0.069, -0.069):
    G = [greep_ring(z0 + dz, 0.0085, 0.0075) for dz in (-0.003, 0.003)]; H.raster(G, BAND)
G = []                                                # zwarte bies langs de klittenbandnaad onder
for j in range(21):
    z = lerp(0.058, -0.058, j / 20); G.append([P(x, GREEP_Y - 0.0163, z) for x in (-0.006, 0.006)])
H.raster(G, BAND, omkeren=True)
hengsel_mesh = H.klaar('hengsel-band')
# Lege ouder-nodes: de meshopt-compressie (quantisatie) zet een eigen schaal/verschuiving op de mesh-node; zo blijven
# "emmer" (oorsprong midden op de bodem) en "hengsel" (draaipunt op lapjeshoogte) schoon bruikbaar in het spel.
def leeg(naam, plek, ouder=None):
    e = bpy.data.objects.new(naam, None); e.location = plek; e.parent = ouder; sc.collection.objects.link(e); return e
emmer.name = 'emmer-romp'
wortel = leeg('emmer', Vector((0, 0, 0))); hengsel = leeg('hengsel', P(0, LAP_Y, 0), wortel); emmer.parent = wortel
hengsel_mesh.parent = hengsel; hengsel_mesh.location = -P(0, LAP_Y, 0)

for o in (wortel, emmer, hengsel, hengsel_mesh): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_apply=True, export_image_format='AUTO')
print('klaar', OUT)
