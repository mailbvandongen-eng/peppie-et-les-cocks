// NODE_PATH=<map met @gltf-transform> node tools/aas/madenbakje-instancing.cjs <in.glb> <uit.glb>
// De vaste maden in de hoop (nodes "made_hoop_###", 5 gedeelde meshes) worden EXT_mesh_gpu_instancing: één node per vorm
// ("hoop_maden_<vorm>") = één draw call per vorm in three.js (InstancedMesh). gltf-transform optimize doet dit zelf niet
// zodra er een animatie in het bestand zit, daarom apart, vóór optimize.
const { NodeIO } = require("@gltf-transform/core");
const { ALL_EXTENSIONS, EXTMeshGPUInstancing } = require("@gltf-transform/extensions");
(async () => {
  const [IN, UIT] = process.argv.slice(2);
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const doc = await io.read(IN);
  const ext = doc.createExtension(EXTMeshGPUInstancing); const buf = doc.getRoot().listBuffers()[0];
  const scene = doc.getRoot().getDefaultScene() || doc.getRoot().listScenes()[0];
  const groepen = new Map();
  for (const n of doc.getRoot().listNodes()) if (n.getName().startsWith("made_hoop_") && n.getMesh()) {
    const m = n.getMesh(); if (!groepen.has(m)) groepen.set(m, []); groepen.get(m).push(n); }
  let k = 0;
  for (const [mesh, nodes] of groepen) {
    const T = new Float32Array(nodes.length * 3), R = new Float32Array(nodes.length * 4), S = new Float32Array(nodes.length * 3);
    nodes.forEach((n, i) => { T.set(n.getTranslation(), i * 3); R.set(n.getRotation(), i * 4); S.set(n.getScale(), i * 3); });
    const acc = (a, t) => doc.createAccessor().setType(t).setArray(a).setBuffer(buf);
    const inst = ext.createInstancedMesh().setAttribute("TRANSLATION", acc(T, "VEC3")).setAttribute("ROTATION", acc(R, "VEC4")).setAttribute("SCALE", acc(S, "VEC3"));
    const nn = doc.createNode(`hoop_maden_${k++}`).setMesh(mesh).setExtension("EXT_mesh_gpu_instancing", inst);
    scene.addChild(nn); for (const n of nodes) n.dispose();
    console.log(`${mesh.getName()}: ${nodes.length} maden`);
  }
  await io.write(UIT, doc);
})();
