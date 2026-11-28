# Zonnebaars (Henk), stap 1: CC0-scan van een blauwbaars (ffishAsia-and-floraZia, Sketchfab 55a4ad9883cc4388b6ba3baca5a86d3d) opschonen.
# "C:/Program Files/Blender Foundation/Blender 5.3/blender.exe" -b -P tools/vis/zonnebaars.py -- in.glb uit.glb [driehoeken] [lengte_m] [textuur_px]
# Gooit het sokkelblokje weg, draait de kop naar +z (rug +y), schaalt naar echte lengte (midden in de oorsprong),
# maakt een vereenvoudigde kopie met schone uv's en bakt de kleur van de volle scan daarop (de scan-atlas is te versnipperd om mee te vereenvoudigen).
import bpy, sys, mathutils
a = sys.argv[sys.argv.index("--") + 1:]
src, dst = a[0], a[1]; doel = int(a[2]) if len(a) > 2 else 12000; lengte = float(a[3]) if len(a) > 3 else 0.15; px = int(a[4]) if len(a) > 4 else 1024
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
for o in [o for o in bpy.context.scene.objects if o.type == "MESH"]:
    if any(s.material and s.material.name.startswith("Material.001") for s in o.material_slots) or len(o.data.polygons) < 100:
        bpy.data.objects.remove(o)
obs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
bpy.ops.object.select_all(action="DESELECT")
for o in obs: o.select_set(True)
bpy.context.view_layer.objects.active = obs[0]
bpy.ops.object.join(); hoog = bpy.context.view_layer.objects.active
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM"); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in [o for o in bpy.context.scene.objects if o.type != "MESH"]: bpy.data.objects.remove(o)
# Blender-assen: de scan ligt met de lengte langs Blender-x, kop op -x. glTF +z = Blender -y, glTF +y = Blender +z.
# 90 graden om Blender-z: -x -> -y, dus kop naar glTF +z.
hoog.data.transform(mathutils.Matrix.Rotation(1.5707963, 4, "Z"))
vs = [v.co for v in hoog.data.vertices]
lo = mathutils.Vector([min(v[i] for v in vs) for i in range(3)]); hi = mathutils.Vector([max(v[i] for v in vs) for i in range(3)])
k = lengte / (hi.y - lo.y); c = (lo + hi) / 2
hoog.data.transform(mathutils.Matrix.Scale(k, 4) @ mathutils.Matrix.Translation(-c))
# vereenvoudigde kopie
bpy.ops.object.select_all(action="DESELECT"); hoog.select_set(True); bpy.context.view_layer.objects.active = hoog
bpy.ops.object.duplicate(); laag = bpy.context.view_layer.objects.active
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.remove_doubles(threshold=0.00002 * k); bpy.ops.object.mode_set(mode="OBJECT")
n = sum(len(p.vertices) - 2 for p in laag.data.polygons)
m = laag.modifiers.new("dec", "DECIMATE"); m.ratio = min(1, doel / n); m.use_collapse_triangulate = True
bpy.ops.object.modifier_apply(modifier="dec")
while laag.data.uv_layers: laag.data.uv_layers.remove(laag.data.uv_layers[0])
laag.data.uv_layers.new(name="UVMap")
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=1.15, island_margin=0.004, area_weight=0.0, scale_to_bounds=True)
bpy.ops.uv.pack_islands(margin=0.004, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")
img = bpy.data.images.new("zonnebaars", px, px)
mat = bpy.data.materials.new("zonnebaars"); mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]; tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = img
nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = 0.55; bsdf.inputs["Metallic"].default_value = 0
laag.data.materials.clear(); laag.data.materials.append(mat); nt.nodes.active = tex
# bakken: kleur van de scan naar de nieuwe uv's
sc = bpy.context.scene; sc.render.engine = "CYCLES"; sc.cycles.device = "CPU"; sc.cycles.samples = 4
bk = sc.render.bake; bk.use_selected_to_active = True; bk.cage_extrusion = 0.0015; bk.max_ray_distance = 0.004; bk.margin = 6
# de scan is 'unlit': textuur rechtstreeks als emissie bakken
for ms in hoog.material_slots:
    t = ms.material.node_tree; im = next(n for n in t.nodes if n.type == "TEX_IMAGE"); uitv = next(n for n in t.nodes if n.type == "OUTPUT_MATERIAL")
    em = t.nodes.new("ShaderNodeEmission"); t.links.new(im.outputs["Color"], em.inputs["Color"]); t.links.new(em.outputs[0], uitv.inputs["Surface"])
bpy.ops.object.select_all(action="DESELECT"); hoog.select_set(True); laag.select_set(True); bpy.context.view_layer.objects.active = laag
bpy.ops.object.bake(type="EMIT")
img.filepath_raw = dst.rsplit(".", 1)[0] + "-kleur.png"; img.file_format = "PNG"; img.save()
bpy.data.objects.remove(hoog)
laag.name = "zonnebaars"; laag.data.name = "zonnebaars"
print("DRIEHOEKEN", sum(len(p.vertices) - 2 for p in laag.data.polygons), "MAAT", list(laag.dimensions))
bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", export_yup=True, export_animations=False, export_image_format="AUTO")
