// Structuur onder water (zoals op Bobs opname ref/livescope-muur.mp4): oude muren die van de bodem rechtop staan tot een paar
// meter onder water, met een richel bovenop; daar verzamelt zich de vis. En takken van omgevallen bomen waar het ondieper wordt.
// De muren tellen mee in W.diepte (zie wereld.js); hier komen hun plek, hun 3D-vorm en de takken.
import * as THREE from "three";
import { onderWater } from "./water.js";

const tussen = (a, b) => a + Math.random() * (b - a);
const V = (x, y, z) => new THREE.Vector3(x, y, z);

export function bouwStructuur(scene, W, { start, u, t }) {
  const steen = onderWater(new THREE.MeshStandardMaterial({ color: "#5d5a4c", roughness: 0.95 }));
  // drie muren: één vlak bij de plek waar je begint (zodat je hem meteen kunt vinden), twee verder weg
  const plekken = [[22, 6, 0.4], [70, -40, 1.2], [45, 90, -0.6]];
  for (const [voor, opzij, hoek] of plekken) {
    const m = start.clone().addScaledVector(u, voor).addScaledVector(t, opzij), r = V(Math.cos(hoek) * t.x + Math.sin(hoek) * u.x, 0, Math.cos(hoek) * t.z + Math.sin(hoek) * u.z).normalize();
    const L = tussen(10, 16), a = m.clone().addScaledVector(r, -L / 2), b = m.clone().addScaledVector(r, L / 2), bodem = W.bodemZonderMuur(m.x, m.z);
    if (bodem < 6) continue;
    const muur = { a: [a.x, a.z], b: [b.x, b.z], dik: 1.3, top: tussen(3.2, 4.4), midden: m, r }; W.muren.push(muur);
    // in 3D: een blok van oude stenen, bovenop een richel die een beetje uitsteekt
    const h = bodem + 0.5 - muur.top, g = new THREE.Group(); g.position.set(m.x, -bodem - 0.5, m.z); g.rotation.y = Math.atan2(r.x, r.z) + Math.PI / 2; scene.add(g);
    const blok = new THREE.Mesh(new THREE.BoxGeometry(L, h, muur.dik), steen); blok.position.y = h / 2; g.add(blok);
    const richel = new THREE.Mesh(new THREE.BoxGeometry(L * 0.35, 0.4, muur.dik + 1.4), steen); richel.position.set(L * 0.3, h + 0.1, 0.4); g.add(richel);
    for (let i = 0; i < 6; i++) { const k = new THREE.Mesh(new THREE.DodecahedronGeometry(tussen(0.3, 0.7)), steen); k.position.set(tussen(-L / 2, L / 2), tussen(0.2, 0.6), tussen(-1.5, 1.5)); g.add(k); }
  }
  // takken: waar het water ondieper wordt (tussen 2 en 7 m), aan beide kanten
  const tak = onderWater(new THREE.MeshStandardMaterial({ color: "#3a2e22", roughness: 1 }));
  for (let i = 0; i < 260 && W.takken.length < 46; i++) {
    const p = start.clone().addScaledVector(u, tussen(-40, 170)).addScaledVector(t, tussen(-200, 200)), d = W.bodemZonderMuur(p.x, p.z);
    if (d < 2 || d > 7 || !W.inWater(p.x, p.z)) continue;
    const hoek = Math.random() * 6.28, L = tussen(2.5, 6), op = tussen(0.6, Math.min(2.6, d - 0.5)), q = p.clone().add(V(Math.cos(hoek) * L, 0, Math.sin(hoek) * L));
    const bodemQ = Math.max(0.6, W.bodemZonderMuur(q.x, q.z));
    const tk = { a: [p.x, d, p.z], b: [q.x, Math.max(0.5, bodemQ - op), q.z], zij: [] }; // b is de top die omhoog steekt
    for (let k = 0; k < 3; k++) { const f = tussen(0.3, 0.8), x = p.x + (q.x - p.x) * f, z = p.z + (q.z - p.z) * f, y = d + (tk.b[1] - d) * f, a2 = hoek + tussen(-1.4, 1.4), l2 = tussen(0.8, 1.8); tk.zij.push({ a: [x, y, z], b: [x + Math.cos(a2) * l2, Math.max(0.4, y - tussen(0.3, 1.2)), z + Math.sin(a2) * l2] }); }
    W.takken.push(tk);
    for (const s of [tk, ...tk.zij]) { const A = V(s.a[0], -s.a[1], s.a[2]), B = V(s.b[0], -s.b[1], s.b[2]), lg = A.distanceTo(B), c = new THREE.Mesh(new THREE.CylinderGeometry(s === tk ? 0.06 : 0.03, s === tk ? 0.12 : 0.05, lg, 6), tak);
      c.position.copy(A).lerp(B, 0.5); c.quaternion.setFromUnitVectors(V(0, 1, 0), B.clone().sub(A).normalize()); scene.add(c); }
  }
  /** Alle stukken tak als lijnstukken (voor de livescope en om aan vast te lopen). */
  W.takLijnen = () => W.takken.flatMap((tk) => [tk, ...tk.zij]);
  /** Zit een punt (x, diepte, z) vlak bij een tak? */
  W.bijTak = (x, d, z, r = 0.35) => { for (const s of W.takLijnen()) { const ax = s.a[0], ay = s.a[1], az = s.a[2], dx = s.b[0] - ax, dy = s.b[1] - ay, dz = s.b[2] - az, L = dx * dx + dy * dy + dz * dz, f = Math.max(0, Math.min(1, ((x - ax) * dx + (d - ay) * dy + (z - az) * dz) / L)); if (Math.hypot(x - ax - dx * f, d - ay - dy * f, z - az - dz * f) < r) return true; } return false; };
}
