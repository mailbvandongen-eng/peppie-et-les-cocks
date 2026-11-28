// Het visbestand van de Lot: het stikt er van de vis. Rond de boot zwemmen altijd honderden vissen: meervallen van klein
// tot reus bij de bodem, groepjes karper, scholen brasem, snoekbaarzen, en grote scholen voorn die voorbij trekken.
// Wie te ver weg raakt, verschijnt opnieuw ergens om je heen, dus waar je ook vaart, de rivier zit vol.
// Ze zijn echt te zien in het heldere water (modellen: Sketchfab CC BY, zie README) en op de livescope.
// Aan het oppervlak: kringen van vissen die azen, en af en toe springt er een karper of een voorntje.
import * as THREE from "three";
import { onderWater } from "./water.js";

const tussen = (a, b) => a + Math.random() * (b - a);
// de verhouding zoals op de Lot: vooral meerval (van klein tot reus), veel kleine vis op de bodem en in scholen, karper zelden
const SOORTEN = {
  Meerval: { model: "meerval", lengte: [0.6, 1.0], boven: [0.1, 1.2], snel: 0.22, kans: 3.0, groep: [1, 1] },
  Karper: { model: "karper", lengte: [0.55, 0.95], boven: [1, 5], snel: 0.45, kans: 0.12, groep: [1, 2] },
  Brasem: { model: "brasem", lengte: [0.3, 0.42], boven: [0.05, 0.5], snel: 0.28, kans: 1.4, groep: [4, 10] }, // de kleine vis die op de bodem schuilt
  Snoekbaars: { model: "snoekbaars", lengte: [0.4, 0.75], boven: [0.3, 2.5], snel: 0.35, kans: 0.5, groep: [1, 3] },
};
/** De lengte van een meerval: de meeste rond 80 cm, minder rond anderhalve meter, een enkele over de twee. */
const meervalLengte = () => { const r = Math.random(); return r < 0.5 ? tussen(0.6, 1.0) : r < 0.8 ? tussen(1.0, 1.5) : r < 0.95 ? tussen(1.5, 1.95) : tussen(1.95, 2.3); };
const NAMEN = Object.keys(SOORTEN);

export async function maakVisbestand(scene, W, { telefoon = false, fx = null, geluid = null } = {}) {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../lib/three-addons.js"), import("../lib/meshopt_decoder.mjs")]);
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder), M = {};
  await Promise.all(["meerval", "karper", "brasem", "snoekbaars", "voorn"].map(async (n) => { M[n] = await L.loadAsync(`assets/vis/${n}.glb?v=${window.VERSIE ?? ""}`); }));
  // elk model: kop naar +z, lengte 1, midden in de oorsprong
  const vorm = {};
  for (const [n, g] of Object.entries(M)) { g.scene.updateMatrixWorld(true); const delen = []; g.scene.traverse((o) => { if (o.isMesh) { const m = onderWater(o.material.clone()); m.metalness = 0; m.roughness = 0.5; const geo = o.geometry.clone(); geo.morphAttributes = {}; geo.deleteAttribute("skinIndex"); geo.deleteAttribute("skinWeight"); delen.push({ geo: geo.applyMatrix4(o.matrixWorld), mat: m }); } });
    if (n === "karper") for (const d of delen) d.geo.rotateY(Math.PI / 2);
    if (n === "voorn") for (const d of delen) d.mat.color = new THREE.Color("#c9d3dc");
    const b = new THREE.Box3(); for (const d of delen) { d.geo.computeBoundingBox(); b.union(d.geo.boundingBox); } const c = b.getCenter(new THREE.Vector3()), l = b.max.z - b.min.z;
    for (const d of delen) d.geo.translate(-c.x, -c.y, -c.z).scale(1 / l, 1 / l, 1 / l); vorm[n] = delen; }

  const R = telefoon ? 34 : 40, NIND = telefoon ? 200 : 260, NSCHOOL = telefoon ? 22 : 30;
  const lijst = [], scholen = []; let midden = new THREE.Vector3();
  const bodem = (x, z) => W.diepte(x, z);
  /** Een plek in het water rond het midden (niet te ondiep). */
  // een derde van de vis zoekt de structuur op: rond de muren onder water is het altijd druk
  const bijMuur = () => { const m = W.muren.filter((q) => Math.hypot(q.midden.x - midden.x, q.midden.z - midden.z) < R * 1.4); if (!m.length) return null; const q = m[(Math.random() * m.length) | 0], f = tussen(-0.6, 0.6), dx = q.b[0] - q.a[0], dz = q.b[1] - q.a[1];
    return [q.midden.x + dx * f * 0.5 + tussen(-3.5, 3.5), q.midden.z + dz * f * 0.5 + tussen(-3.5, 3.5)]; };
  const plek = (rmin, rmax, minDiep = 1.5) => { if (Math.random() < 0.33) { const p = bijMuur(); if (p && bodem(p[0], p[1]) > minDiep) return p; } for (let i = 0; i < 25; i++) { const a = Math.random() * 6.283, r = tussen(rmin, rmax), x = midden.x + Math.cos(a) * r, z = midden.z + Math.sin(a) * r; if (bodem(x, z) > minDiep) return [x, z]; } return null; };
  const nieuw = (v, soort, x, z) => { const S = SOORTEN[soort]; Object.assign(v, { soort, x, z, x0: x, z0: z, tx: x, tz: z, h: Math.random() * 6.28, lengte: soort === "Meerval" ? meervalLengte() : tussen(...S.lengte), boven: tussen(...S.boven), zin: 0, d: 0, staart: Math.random() * 6, lok: null, straal: soort === "Meerval" ? 8 : 14 }); v.d = Math.max(0.5, bodem(x, z) - v.boven); return v; };
  const vulGroep = (n0 = 0) => { while (lijst.length < NIND + n0) { const soort = (() => { let r = Math.random() * NAMEN.reduce((s, n) => s + SOORTEN[n].kans, 0); for (const n of NAMEN) if ((r -= SOORTEN[n].kans) <= 0) return n; return "Meerval"; })(), p = plek(4, R); if (!p) break;
      const [g0, g1] = SOORTEN[soort].groep, n = Math.round(tussen(g0, g1)); for (let i = 0; i < n && lijst.length < NIND + n0; i++) lijst.push(nieuw({}, soort, p[0] + tussen(-2, 2), p[1] + tussen(-2, 2))); } };
  // de reuzen: in elke diepe kolk één
  const reuzen = W.kolken.map(([x, z, r]) => { const v = nieuw({}, "Meerval", x + tussen(-4, 4), z + tussen(-4, 4)); v.lengte = tussen(2.04, 2.45); v.straal = r * 0.45; v.reus = true; v.boven = 0.3; return v; });
  const nieuweSchool = (q = {}, rmin = 8, rmax = R) => { const p = plek(rmin, rmax, 2.5) ?? [midden.x + 20, midden.z]; const a = Math.random() * 6.28, sn = tussen(0.45, 1.0);
    return Object.assign(q, { x: p[0], z: p[1], vx: Math.sin(a) * sn, vz: Math.cos(a) * sn, d: tussen(0.6, Math.min(5, bodem(p[0], p[1]) - 0.8)), n: 18 + ((Math.random() * 30) | 0), r: tussen(1.2, 3), zaad: Math.random() * 100, lengte: tussen(0.12, 0.22) }); };

  // ---- in 3D: één InstancedMesh per onderdeel per soort ----
  const NMAX = NIND + 12 + 40, inst = {};
  for (const n of ["meerval", "karper", "brasem", "snoekbaars"]) inst[n] = vorm[n].map((d) => { const m = new THREE.InstancedMesh(d.geo, d.mat, NMAX); m.count = 0; m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m; });
  const VOORN = NSCHOOL * 48, voorn = vorm.voorn.map((d) => { const m = new THREE.InstancedMesh(d.geo, d.mat, VOORN); m.count = 0; m.frustumCulled = false; m.renderOrder = 3; scene.add(m); return m; });
  // kringen op het water
  const ringMat = new THREE.MeshBasicMaterial({ color: "#f4fbff", transparent: true, opacity: 0, depthWrite: false }), ringen = [];
  for (let i = 0; i < 14; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.92, 1, 40).rotateX(-Math.PI / 2), ringMat.clone()); r.visible = false; r.renderOrder = 3; scene.add(r); ringen.push({ r, t: 1, groot: 1 }); }
  const kring = (x, z, groot = 1) => { const k = ringen.find((q) => q.t >= 1) ?? ringen[0]; k.t = 0; k.groot = groot; k.r.position.set(x, 0.015, z); k.r.visible = true; };
  // een springende vis
  const springer = new THREE.Group(); for (const d of vorm.karper) springer.add(new THREE.Mesh(d.geo, d.mat)); springer.visible = false; scene.add(springer);
  const sprong = { t: 1, x: 0, z: 0, h: 0, l: 0.7 };

  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  let ringT = 0, sprongT = tussen(4, 10), klok = 0;
  /** Elk beeld: de vissen laten zwemmen rond `centrum` (de boot) en tekenen. */
  function stap(dt, centrum, camera) {
    klok += dt; midden.copy(centrum);
    if (!lijst.length) { vulGroep(); for (let i = 0; i < NSCHOOL; i++) scholen.push(nieuweSchool({}, 6, R)); }
    // te ver weg: opnieuw ergens om de boot heen (buiten beeld van de livescope)
    for (let i = lijst.length - 1; i >= 0; i--) { const v = lijst[i]; if (v.vast) continue; if (Math.hypot(v.x - midden.x, v.z - midden.z) > R * 1.35) { const p = plek(R * 0.55, R * 1.2); if (p) nieuw(v, v.soort, p[0], p[1]); } }
    for (const s of scholen) { s.x += s.vx * dt; s.z += s.vz * dt; if (Math.random() < dt * 0.05) s.dDoel = tussen(0.8, Math.max(1, bodem(s.x, s.z) - 0.6)); if (s.dDoel != null) s.d += (s.dDoel - s.d) * Math.min(1, dt * 0.25); if (Math.hypot(s.x - midden.x, s.z - midden.z) > R * 1.4 || bodem(s.x, s.z) < s.d + 0.5) nieuweSchool(s, R * 0.5, R * 1.1); }
    const alle = lijst.concat(reuzen);
    for (const v of alle) { if (v.vast) continue;
      if (Math.hypot(v.tx - v.x, v.tz - v.z) < 0.8) { const a = Math.random() * 6.28, r = Math.random() * v.straal; v.tx = v.x0 + Math.cos(a) * r; v.tz = v.z0 + Math.sin(a) * r; }
      const dx = v.tx - v.x, dz = v.tz - v.z, l = Math.hypot(dx, dz) || 1, sn = SOORTEN[v.soort].snel * (0.7 + v.lengte * 0.3) + (v.zin > 0 ? 0.3 : 0);
      const nx = v.x + (dx / l) * sn * dt, nz = v.z + (dz / l) * sn * dt; if (bodem(nx, nz) > 0.8) { v.x = nx; v.z = nz; } else { v.tx = v.x0; v.tz = v.z0; }
      let dh = Math.atan2(dx, dz) - v.h; dh = Math.atan2(Math.sin(dh), Math.cos(dh)); const dr = dh * Math.min(1, dt * 2); v.h += dr; v.draai = (v.draai ?? 0) * 0.9 + (dr / Math.max(dt, 0.001)) * 0.1;
      const doelD = v.lok ?? Math.max(0.4, bodem(v.x, v.z) - v.boven); v.d += (doelD - v.d) * Math.min(1, dt * (v.lok != null ? 1.2 : 0.4)); v.staart += dt * (4 + sn * 8); }
    // tekenen (alleen wat in de buurt van de camera is; diep onder water zie je het toch niet)
    const cp = camera.position, n = { meerval: 0, karper: 0, brasem: 0, snoekbaars: 0 };
    for (const v of alle) { if (v.verborgen) continue; const dx = v.x - cp.x, dz = v.z - cp.z; if (dx * dx + dz * dz > 45 * 45) continue; const mod = SOORTEN[v.soort].model, i = n[mod]++; if (i >= NMAX) continue;
      m4.compose(p3.set(v.x, -v.d, v.z), q.setFromEuler(e.set(Math.sin(v.staart * 0.5) * 0.04, v.h + Math.sin(v.staart) * 0.08, 0)), s3.setScalar(v.lengte)); for (const m of inst[mod]) m.setMatrixAt(i, m4); }
    for (const [mod, ms] of Object.entries(inst)) for (const m of ms) { m.count = Math.min(NMAX, n[mod]); m.instanceMatrix.needsUpdate = true; }
    let nv = 0; for (const s of scholen) { const dx = s.x - cp.x, dz = s.z - cp.z; if (dx * dx + dz * dz > 40 * 40) continue; const h = Math.atan2(s.vx, s.vz);
      for (let i = 0; i < Math.min(48, s.n) && nv < VOORN; i++) { const a = s.zaad + i * 2.4, o = schoolPunt(s, i); m4.compose(p3.set(o.x, -o.d, o.z), q.setFromEuler(e.set(0, h + Math.sin(klok * 3 + a) * 0.25, 0)), s3.setScalar(s.lengte)); for (const m of voorn) m.setMatrixAt(nv, m4); nv++; } }
    for (const m of voorn) { m.count = nv; m.instanceMatrix.needsUpdate = true; }
    // kringen en sprongen
    if ((ringT -= dt) <= 0) { ringT = tussen(0.4, 1.6); const s = scholen[(Math.random() * scholen.length) | 0], v = lijst[(Math.random() * lijst.length) | 0];
      if (Math.random() < 0.6 && s && Math.hypot(s.x - midden.x, s.z - midden.z) < 45) { for (let k = 0; k < 3; k++) kring(s.x + tussen(-s.r, s.r), s.z + tussen(-s.r, s.r), tussen(0.3, 0.7)); } else if (v && v.soort === "Karper" && Math.hypot(v.x - midden.x, v.z - midden.z) < 45) kring(v.x, v.z, 1.3); }
    for (const k of ringen) { if (k.t >= 1) continue; k.t = Math.min(1, k.t + dt / 2.6); const s = (0.15 + k.t * 1.6) * k.groot; k.r.scale.set(s, 1, s); k.r.material.opacity = (1 - k.t) * 0.55; if (k.t >= 1) k.r.visible = false; }
    if ((sprongT -= dt) <= 0 && sprong.t >= 1) { sprongT = tussen(6, 16); const p = plek(8, 38, 1.5); if (p) { Object.assign(sprong, { t: 0, x: p[0], z: p[1], h: Math.random() * 6.28, l: tussen(0.5, 0.9) }); fx?.(V3(p[0], 0, p[1]), 10); } }
    if (sprong.t < 1) { const t0 = sprong.t; sprong.t = Math.min(1, sprong.t + dt / 1.1); const f = sprong.t, h = Math.sin(f * Math.PI) * 1.1 * sprong.l, vx = Math.sin(sprong.h), vz = Math.cos(sprong.h);
      springer.visible = f < 0.97; springer.position.set(sprong.x + vx * (f - 0.5) * 1.6, h - 0.2, sprong.z + vz * (f - 0.5) * 1.6); springer.rotation.set(0, sprong.h, 0); springer.rotateX(-Math.cos(f * Math.PI) * 0.9); springer.scale.setScalar(sprong.l);
      if (t0 < 0.82 && f >= 0.82) { fx?.(springer.position.clone().setY(0), 26); kring(springer.position.x, springer.position.z, 1.6); geluid?.(Math.hypot(sprong.x - cp.x, sprong.z - cp.z)); } }
  }
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  /** De plek van vis i in een school (voor de livescope en in 3D). */
  function schoolPunt(s, i) { const a = s.zaad + i * 2.4, f = (i * 0.618) % 1; return { x: s.x + Math.sin(a + klok * 0.3) * s.r * f, z: s.z + Math.cos(a * 1.3 + klok * 0.25) * s.r * f, d: s.d + Math.sin(a * 0.7) * 0.6 * f }; }
  return { lijst, reuzen, scholen, stap, schoolPunt, alle: () => lijst.concat(reuzen), weg: (v) => { const i = lijst.indexOf(v); if (i >= 0) lijst.splice(i, 1); const j = reuzen.indexOf(v); if (j >= 0) reuzen.splice(j, 1); vulGroep(); } };
}
