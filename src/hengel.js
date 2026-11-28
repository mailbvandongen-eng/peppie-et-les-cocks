// Hengels en andere vismodellen (Sketchfab, CC BY 4.0; zie README). Overgenomen uit het vislevel van Fatbike Sniper.
import * as THREE from "three";
const V = (x, y, z) => new THREE.Vector3(x, y, z);

/** Alle punten van een model, in de wereld. */
function punten(obj) {
  obj.updateMatrixWorld(true); const p = [];
  obj.traverse((o) => { if (!o.isMesh) return; const a = o.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < a.count; i += 1) p.push(v.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld).clone()); });
  return p;
}
/** Zet een model in een groep: gedraaid zodat zijn lengte langs +z ligt, geschaald naar `lengte`, onderkant op 0. */
function recht(scene, lengte, hoek = null) {
  const p = punten(scene), n = p.length; let mx = 0, mz = 0; for (const q of p) { mx += q.x / n; mz += q.z / n; }
  let xx = 0, zz = 0, xz = 0; for (const q of p) { xx += (q.x - mx) ** 2; zz += (q.z - mz) ** 2; xz += (q.x - mx) * (q.z - mz); }
  const h = hoek ?? Math.atan2(2 * xz, zz - xx) / 2; // de hoofdas in het grondvlak, gemeten vanaf +z
  const draai = new THREE.Group(); draai.add(scene); draai.rotation.y = -h;
  const g = new THREE.Group(); g.add(draai); g.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(g), m = b.getSize(new THREE.Vector3()), s = lengte / Math.max(m.x, m.z);
  draai.scale.setScalar(s); draai.position.set(-((b.min.x + b.max.x) / 2) * s, -b.min.y * s, -((b.min.z + b.max.z) / 2) * s);
  if (m.x > m.z) { const om = new THREE.Group(); om.add(g); om.rotation.y = Math.PI / 2; const w = new THREE.Group(); w.add(om); return w; }
  return g;
}


/** Laad de modellen; geeft { maakHengel, vorm(naam, lengte) } terug. */
export async function laadVisspullen(scene) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../lib/three-addons.js"), import("../lib/meshopt_decoder.mjs")]);
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), M = {};
  await Promise.all(["hengel", "karper", "stoel", "blik", "krat", "molen"].map(async (n) => { M[n] = await L.loadAsync(`assets/vis/${n}.glb?v=${window.VERSIE ?? ""}`); }));
  for (const g of Object.values(M)) g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const HENGEL = 3.3;
  const molenVorm = recht(M.molen.scene, 0.15); { const b = new THREE.Box3().setFromObject(molenVorm); molenVorm.position.y = -(b.max.y - b.min.y); }
  /** lengte in meters; boven = reel bovenop (een werpmolen/baitcaster, zoals Bob en de anderen gebruiken). */
  const maakHengel = (LENGTE = HENGEL, { boven = false, dik = 0.5 } = {}) => {
    const bron = M.hengel.scene.clone(true); let mesh = null; bron.updateMatrixWorld(true); bron.traverse((o) => { if (o.isMesh && !mesh) mesh = o; });
    // (de punten in het bestand zijn ingepakt als hele getallen: eerst uitpakken naar gewone meters)
    const bronP = mesh.geometry.attributes.position, n = bronP.count, v = new THREE.Vector3(), uitgepakt = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { v.fromBufferAttribute(bronP, i).applyMatrix4(mesh.matrixWorld); uitgepakt.set([v.x, v.y, v.z], i * 3); }
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(uitgepakt, 3)); geo.setIndex(mesh.geometry.index);
    if (mesh.geometry.attributes.uv) geo.setAttribute("uv", mesh.geometry.attributes.uv);
    const p = geo.attributes.position;
    // de twee verste punten zijn handvat en top; het handvat is het eind bij de molen (daar zitten de meeste punten)
    let a = v.fromBufferAttribute(p, 0).clone(), b = a.clone(), c = new THREE.Vector3();
    for (let keer = 0; keer < 3; keer++) { let d = -1; const van = keer % 2 ? b : a, naar = keer % 2 ? a : b; for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i); const dd = v.distanceToSquared(van); if (dd > d) { d = dd; naar.copy(v); } } }
    // het handvat is het dikke eind, de top het dunne: vergelijk hoe ver de punten bij elk eind van de as af liggen
    { const as0 = b.clone().sub(a), L0 = as0.length(); as0.normalize(); let ver = -1, da = 0, na = 0, db = 0, nb = 0;
      for (let i = 0; i < n; i++) { v.fromBufferAttribute(p, i).sub(a); const langs = v.dot(as0), d = v.clone().addScaledVector(as0, -langs).length(); if (langs < L0 * 0.04) { da += d; na++; } else if (langs > L0 * 0.96) { db += d; nb++; } if (d > ver) { ver = d; c.copy(v).add(a); } } // c = wat het verst uitsteekt (molen en ogen): die kant moet naar onderen
      if (db / Math.max(1, nb) > da / Math.max(1, na)) [a, b] = [b, a]; }
    const as = b.clone().sub(a), len = as.length(); as.normalize();
    const zij = c.clone().sub(a); zij.addScaledVector(as, -zij.dot(as)).normalize();
    const basis = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(zij.clone().negate(), as), zij.clone().negate(), as).invert();
    geo.applyMatrix4(new THREE.Matrix4().makeTranslation(-a.x, -a.y, -a.z)).applyMatrix4(basis).scale((HENGEL / len) * dik, (HENGEL / len) * dik, LENGTE / len); // een karperhengel is lang en dun; een meervalhengel korter en dikker
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mesh.material); m.castShadow = true; m.frustumCulled = false;
    const g = new THREE.Group(); g.add(m); scene.add(g);
    // een echte molen onder het handvat (die van het hengelmodel is na het versmallen te klein om te zien)
    { const mo = new THREE.Group(); mo.add(molenVorm.clone()); if (boven) { mo.rotation.z = Math.PI; mo.position.set(0, 0.03, LENGTE * 0.12); mo.scale.setScalar(0.85); } else mo.position.set(0, -0.012, 0.52); g.add(mo); }
    const y0 = Float32Array.from(geo.attributes.position.array);
    const h = { g, bocht: 0, top: new THREE.Vector3(),
      /** Buig de hengel (0 = recht): de top zakt, het meest aan het eind. */
      buig(k) { if (Math.abs(k - h.bocht) < 0.004) return; h.bocht = k; const q = geo.attributes.position; for (let i = 0; i < q.count; i++) { const s = Math.max(0, y0[i * 3 + 2] / LENGTE); q.array[i * 3 + 1] = y0[i * 3 + 1] - k * LENGTE * s ** 2.0; } q.needsUpdate = true; },
      /** Leg hem neer: handvat op p, wijzend naar richting d. Geeft de top (in de wereld) terug. */
      leg(p, d) { g.position.copy(p); g.quaternion.setFromUnitVectors(V(0, 0, 1), d.clone().normalize()); const zij2 = V(0, 1, 0).applyQuaternion(g.quaternion); if (zij2.y < 0) g.rotateZ(Math.PI); g.updateMatrixWorld(true); return h.top.set(0, -h.bocht * LENGTE, LENGTE * (1 - h.bocht * h.bocht * 0.6)).applyMatrix4(g.matrixWorld); }, lengte: LENGTE };
    return h;
  };
  const vormen = {};
  /** Een kopie van een model, rechtgelegd (lengte langs +z, onderkant op 0). */
  const vorm = (naam, lengte) => { vormen[naam + lengte] ??= recht(M[naam].scene.clone(true), lengte); const g = new THREE.Group(); g.add(vormen[naam + lengte].clone(true)); return g; };
  return { maakHengel, vorm, karper: M.karper, HENGEL };
}
