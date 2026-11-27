// Echte bomen (Sketchfab, CC BY 4.0, zie README): esdoorns in de bossen en heggen, treurwilgen langs het water,
// Italiaanse populieren in de rij achter het huis. Dichtbij het volle model, ver weg een plaatje van dezelfde boom
// (de esdoorns hebben er zelf een; voor de wilg en de populier maken we het bij het laden). Elke soort is één
// InstancedMesh per onderdeel, dus duizend bomen kosten maar een handvol tekenopdrachten.
import * as THREE from "three";

const SOORTEN = {
  esdoorn: { bestand: "esdoorn", varianten: ["large_1", "large_2", "large_3", "medium_1", "medium_2", "medium_3"].map((v) => ({ naam: v, dicht: new RegExp(`Acer_${v}_LOD2`), ver: new RegExp(`Acer_${v}_Billboard`) })), dichtbij: 75 },
  populier: { bestand: "populier", varianten: [{ naam: "pop", dicht: /./, ver: null }], dichtbij: 140 },
  wilg: { bestand: "wilg", varianten: [{ naam: "wilg", dicht: /./, ver: null }], dichtbij: 90 },
};
const hash = (x, z) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

/** Een plaatje van het model van voren, met doorzichtige achtergrond, op twee gekruiste vlakken. */
function maakPlaatje(renderer, delen, maat) {
  const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight("#e4f0ff", "#56603e", 1.6)); const z = new THREE.DirectionalLight("#fff4e0", 2.2); z.position.set(3, 6, 5); sc.add(z);
  for (const d of delen) sc.add(new THREE.Mesh(d.geo, d.mat));
  const b = maat, h = b.max.y - b.min.y, w = Math.max(b.max.x - b.min.x, b.max.z - b.min.z), cam = new THREE.OrthographicCamera(-w / 2, w / 2, b.max.y, b.min.y, -100, 100); cam.position.set(0, 0, 10); cam.lookAt(0, 0, 0);
  const rt = new THREE.WebGLRenderTarget(256, Math.round((256 * h) / w), { samples: 4 }), oud = renderer.getRenderTarget(), kleur = renderer.getClearColor(new THREE.Color()), a = renderer.getClearAlpha();
  renderer.setRenderTarget(rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(sc, cam); renderer.setRenderTarget(oud); renderer.setClearColor(kleur, a);
  const g = new THREE.PlaneGeometry(w, h).translate(0, b.min.y + h / 2, 0), g2 = g.clone().rotateY(Math.PI / 2);
  const geo = new THREE.BufferGeometry(); const pos = [...g.attributes.position.array, ...g2.attributes.position.array], uv = [...g.attributes.uv.array, ...g2.attributes.uv.array], nor = [...g.attributes.normal.array, ...g2.attributes.normal.array];
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3)); geo.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]);
  return { geo, mat: new THREE.MeshBasicMaterial({ map: rt.texture, alphaTest: 0.45, side: THREE.DoubleSide, transparent: false }) };
}

export async function laadBomen(renderer, scene, lijst, { telefoon = false } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../lib/three-addons.js"), import("../lib/meshopt_decoder.mjs")]);
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), modellen = {};
  await Promise.all(Object.values(SOORTEN).map(async (s) => { modellen[s.bestand] = await L.loadAsync(`assets/bomen/${s.bestand}.glb?v=${window.VERSIE ?? ""}`); }));
  const groepen = []; // per variant: { soort, dicht: [InstancedMesh], ver: InstancedMesh, bomen: [...] }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), s3 = new THREE.Vector3(), Y = new THREE.Vector3(0, 1, 0);
  for (const [soortNaam, S] of Object.entries(SOORTEN)) {
    const sc = modellen[S.bestand].scene; sc.updateMatrixWorld(true);
    const bomen = lijst.filter((b) => b.soort === soortNaam); if (!bomen.length) continue;
    const per = S.varianten.map(() => []); for (const b of bomen) per[Math.floor(hash(b.x, b.z) * S.varianten.length)].push(b);
    S.varianten.forEach((va, i) => { const mijn = per[i]; if (!mijn.length) return;
      const pak = (re) => { const uit = []; sc.traverse((o) => { if (o.isMesh && re.test(o.name)) { const mat = o.material.clone(); if (mat.alphaTest || mat.transparent || mat.alphaMode === "MASK" || /leaf|Cluster|branch|Billboard|lf/i.test(mat.name)) Object.assign(mat, { alphaTest: 0.45, transparent: false, side: THREE.DoubleSide }); mat.metalness = 0; mat.roughness = 0.9; uit.push({ geo: o.geometry.clone().applyMatrix4(o.matrixWorld), mat }); } }); return uit; };
      const dicht = pak(va.dicht); if (!dicht.length) return;
      // op de grond zetten: stamvoet in de oorsprong, hoogte 1
      const b = new THREE.Box3(); for (const d of dicht) { d.geo.computeBoundingBox(); b.union(d.geo.boundingBox); }
      const c = b.getCenter(new THREE.Vector3()), h = b.max.y - b.min.y, zet = (g) => g.translate(-c.x, -b.min.y, -c.z).scale(1 / h, 1 / h, 1 / h);
      for (const d of dicht) zet(d.geo); let ver = va.ver ? pak(va.ver)[0] : null; if (ver) zet(ver.geo);
      const maat = new THREE.Box3(); for (const d of dicht) { d.geo.computeBoundingBox(); maat.union(d.geo.boundingBox); }
      if (!ver) ver = maakPlaatje(renderer, dicht, maat);
      const n = mijn.length, dm = dicht.map((d) => { const m = new THREE.InstancedMesh(d.geo, d.mat, n); m.castShadow = true; m.receiveShadow = false; m.count = 0; m.frustumCulled = false; scene.add(m); return m; });
      const vm = new THREE.InstancedMesh(ver.geo, ver.mat, n); vm.count = 0; vm.frustumCulled = false; vm.castShadow = false; scene.add(vm);
      // de vaste matrix per boom (plek, draai, maat; de populieren iets in de grond, want hun wortels steken uit)
      const mats = mijn.map((bm) => { const zak = soortNaam === "populier" ? 0.025 * bm.h : 0.01 * bm.h; return new THREE.Matrix4().compose(v.set(bm.x, bm.y - zak, bm.z), q.setFromAxisAngle(Y, hash(bm.z, bm.x) * 6.28), s3.setScalar(bm.h * (0.92 + hash(bm.x + 1, bm.z) * 0.16))); });
      groepen.push({ soort: soortNaam, dichtbij: S.dichtbij * (telefoon ? 0.7 : 1), dm, vm, bomen: mijn, mats });
    });
  }
  let wacht = 0; const cp = new THREE.Vector3();
  /** Elke paar tienden van een seconde: welke bomen staan dichtbij (vol model) en welke ver weg (plaatje)? */
  function stap(dt, camera) { if ((wacht -= dt) > 0) return; wacht = 0.35; cp.setFromMatrixPosition(camera.matrixWorld);
    for (const g of groepen) { let nd = 0, nv = 0; const d2 = g.dichtbij * g.dichtbij;
      for (let i = 0; i < g.bomen.length; i++) { const b = g.bomen[i], dx = b.x - cp.x, dz = b.z - cp.z; if (dx * dx + dz * dz < d2) { for (const m of g.dm) m.setMatrixAt(nd, g.mats[i]); nd++; } else g.vm.setMatrixAt(nv++, g.mats[i]); }
      for (const m of g.dm) { m.count = nd; m.instanceMatrix.needsUpdate = true; } g.vm.count = nv; g.vm.instanceMatrix.needsUpdate = true; } }
  return { stap, groepen };
}
