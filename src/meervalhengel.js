// De meervalhengel zoals op Bobs beelden (ref/uitrusting/): kort en zwaar (1,80 m), zwart, een lang handvat met de reel
// (multiplier) bovenop, de ogen aan de bovenkant, gele lijn. In de dril buigt de top tot bijna dubbel.
// Assen van de hengel: +z = van het handvat naar de top, +y = de bovenkant (reel en ogen). links = de draaiknop links (Wim).
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function maakMeervalhengel(scene, { links = false, lengte = 1.8 } = {}) {
  const L = lengte, HANDVAT = 0.62, N = 46, ZIJ = 8;
  // dikte langs de hengel: handvat (EVA) dik, reelzitting, voorgreep, dan de blank die dunner wordt tot de top
  const straal = (z) => z < 0.02 ? 0.016 : z < 0.32 ? 0.0165 : z < 0.46 ? 0.0115 : z < 0.6 ? 0.015 : 0.0105 - 0.0078 * ((z - 0.6) / (L - 0.6)) ** 0.8;
  const ringZ = []; for (let i = 0; i <= N; i++) { const f = i / N; ringZ.push(f < 0.4 ? (f / 0.4) * HANDVAT : HANDVAT + ((f - 0.4) / 0.6) * (L - HANDVAT)); }
  const pos = new Float32Array((N + 1) * (ZIJ + 1) * 3), kleur = new Float32Array(pos.length), idx = [];
  const kl = (z) => z < 0.32 ? [0.12, 0.12, 0.12] : z < 0.46 ? [0.3, 0.3, 0.32] : z < 0.6 ? [0.12, 0.12, 0.12] : z > L - 0.05 ? [0.9, 0.85, 0.2] : [0.16, 0.17, 0.18];
  for (let i = 0; i <= N; i++) for (let j = 0; j <= ZIJ; j++) kleur.set(kl(ringZ[i]), (i * (ZIJ + 1) + j) * 3);
  for (let i = 0; i < N; i++) for (let j = 0; j < ZIJ; j++) { const a = i * (ZIJ + 1) + j, b = a + ZIJ + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3)); geo.setAttribute("color", new THREE.BufferAttribute(kleur, 3)); geo.setIndex(idx);
  const g = new THREE.Group(), blank = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.25, side: THREE.DoubleSide })); blank.castShadow = true; blank.frustumCulled = false; g.add(blank); scene.add(g);

  // de reel: een multiplier bovenop het handvat, goud en zwart, de draaiknop opzij
  const reel = new THREE.Group(), goud = new THREE.MeshStandardMaterial({ color: "#b8913a", metalness: 0.8, roughness: 0.3 }), zw = new THREE.MeshStandardMaterial({ color: "#151618", metalness: 0.4, roughness: 0.4 });
  const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 18), zw); sp.rotation.z = Math.PI / 2; reel.add(sp);
  const lijnOpSpoel = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.062, 18), new THREE.MeshStandardMaterial({ color: "#d8d23a", roughness: 0.7 })); lijnOpSpoel.rotation.z = Math.PI / 2; lijnOpSpoel.position.y = 0.006; reel.add(lijnOpSpoel);
  for (const k of [-1, 1]) { const pl = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.014, 20), goud); pl.rotation.z = Math.PI / 2; pl.position.x = k * 0.042; reel.add(pl); }
  const kant = links ? -1 : 1, as = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.03, 8), zw); as.rotation.z = Math.PI / 2; as.position.x = kant * 0.062; reel.add(as);
  const slinger = new THREE.Group(); slinger.position.x = kant * 0.075; reel.add(slinger);
  const armS = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.012, 0.075), zw); slinger.add(armS); for (const k of [-1, 1]) { const knop = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.022, 10), zw); knop.rotation.z = Math.PI / 2; knop.position.set(kant * 0.014, 0, k * 0.036); slinger.add(knop); }
  const ster = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 6), goud); ster.rotation.z = Math.PI / 2; ster.position.x = kant * 0.056; reel.add(ster); // de slipster
  const voet = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.06), zw); voet.position.y = -0.03; reel.add(voet);
  reel.position.set(0, 0.048, 0.39); reel.traverse((o) => { if (o.isMesh) o.castShadow = true; }); g.add(reel);

  // de ogen aan de bovenkant
  const oogZ = [0.75, 0.95, 1.13, 1.3, 1.45, 1.58, 1.7, L - 0.004], ogen = oogZ.map((z) => { const r = new THREE.Mesh(new THREE.TorusGeometry(z < 1 ? 0.013 : 0.008, 0.0022, 5, 12), zw); g.add(r); return { z, r }; });
  const lijnMat = new THREE.LineBasicMaterial({ color: "#e6e04a" }), lijnLangs = new THREE.Line(new THREE.BufferGeometry().setFromPoints(new Array(oogZ.length + 1).fill(0).map(() => V(0, 0, 0))), lijnMat); lijnLangs.frustumCulled = false; g.add(lijnLangs);

  // de buiging: alleen de blank buigt (vanaf de voorgreep); hoek groeit naar de top. k = 1 is bijna dubbel.
  const C = [], NR = [], T = [];
  const midden = (z) => { let i = 0; while (i < N && ringZ[i + 1] < z) i++; const f = (z - ringZ[i]) / Math.max(1e-6, ringZ[i + 1] - ringZ[i]); return { c: C[i].clone().lerp(C[Math.min(N, i + 1)], f), n: NR[i].clone().lerp(NR[Math.min(N, i + 1)], f).normalize(), t: T[i].clone().lerp(T[Math.min(N, i + 1)], f).normalize() }; };
  const h = { g, bocht: -1, lengte: L, top: V(0, 0, 0), slinger,
    buig(k) { if (Math.abs(k - h.bocht) < 0.003) return; h.bocht = k; let p = V(0, 0, 0), vorigZ = 0;
      for (let i = 0; i <= N; i++) { const z = ringZ[i], u = Math.max(0, (z - HANDVAT) / (L - HANDVAT)), a = k * 2.3 * u ** 1.4, t = V(0, -Math.sin(a), Math.cos(a)), n = V(0, Math.cos(a), Math.sin(a));
        if (i > 0) p = p.clone().addScaledVector(T[i - 1].clone().lerp(t, 0.5).normalize(), z - vorigZ); vorigZ = z; C[i] = p; NR[i] = n; T[i] = t; const r = straal(z);
        for (let j = 0; j <= ZIJ; j++) { const w = (j / ZIJ) * Math.PI * 2, o = (i * (ZIJ + 1) + j) * 3; pos[o] = Math.cos(w) * r; pos[o + 1] = p.y + n.y * Math.sin(w) * r; pos[o + 2] = p.z + n.z * Math.sin(w) * r; } }
      geo.attributes.position.needsUpdate = true; geo.computeVertexNormals(); geo.computeBoundingSphere();
      const lp = lijnLangs.geometry.attributes.position; lp.setXYZ(0, 0, 0.075, 0.39);
      ogen.forEach((o, i) => { const m = midden(o.z), up = o.z < 1 ? 0.03 : 0.018, q = m.c.clone().addScaledVector(m.n, up); o.r.position.copy(q); o.r.quaternion.setFromUnitVectors(V(0, 0, 1), m.t); lp.setXYZ(i + 1, q.x, q.y, q.z); });
      lp.needsUpdate = true; },
    /** handvat (het eind van de kolf) op p, de hengel in richting d (onbelast); de bovenkant naar boven. Geeft de top in de wereld. */
    leg(p, d) { const z = d.clone().normalize(), x = new THREE.Vector3().crossVectors(V(0, 1, 0), z).normalize(), y = new THREE.Vector3().crossVectors(z, x);
      g.position.copy(p); g.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z)); g.updateMatrixWorld(true);
      return h.top.copy(C[N]).addScaledVector(NR[N], 0.004).applyMatrix4(g.matrixWorld); },
    /** waar de handen horen (in de wereld): op de reel, en voor de reel op de voorgreep */
    reelHand() { return V(kant * 0.04, 0.05, 0.37).applyMatrix4(g.matrixWorld); },
    voorHand() { return V(0, 0.01, 0.53).applyMatrix4(g.matrixWorld); },
    draai(dt, snel) { slinger.rotation.x += dt * snel * 12; } };
  h.buig(0); g.visible = false;
  return h;
}
