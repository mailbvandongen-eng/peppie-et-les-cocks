// De bellyboten van de Cocks, nagebouwd naar de foto's en de video (ref/drie-bellyboten.mp4):
//   paul — zwart/donkergrijs, hoge stoel, Garmin-scherm op een arm, transducerstang, motor achter, twee hengels (Bob heeft dezelfde)
//   wim  — groengrijs/kaki met lichte neuzen en stickers
//   dave — gifgroen met een zwarte band en een zwarte stoel
// Een U-vorm: twee pontons met spitse neuzen die achter de stoel in een boog samenkomen. Je zit laag, met je benen in het water.
// Assen: +z = vooruit, x = opzij, y = omhoog; y = 0 is de waterlijn.
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KLEUREN = {
  paul: { romp: "#1d1f22", neus: "#1d1f22", band: "#2c2f33", stoel: "#141517", sticker: null },
  bob: { romp: "#1d1f22", neus: "#1d1f22", band: "#2c2f33", stoel: "#141517", sticker: null },
  wim: { romp: "#6c705f", neus: "#d6cea6", band: "#5a5e50", stoel: "#1a1b1d", sticker: "#e8e0b8" },
  dave: { romp: "#39d43b", neus: "#39d43b", band: "#141618", stoel: "#141517", sticker: "#141618" },
};
const mats = {}; const M = (k, o = {}) => (mats[k + JSON.stringify(o)] ??= new THREE.MeshStandardMaterial({ color: k, roughness: 0.55, ...o }));

/** Een buis langs een pad met een straal die per punt verschilt (voor de pontons met hun spitse neuzen). */
function buis(pad, straal, hoogte, n = 14) {
  const pos = [], idx = [], N = pad.length;
  for (let i = 0; i < N; i++) { const p = pad[i], a = pad[Math.max(0, i - 1)], b = pad[Math.min(N - 1, i + 1)], T = b.clone().sub(a).normalize(), opzij = new THREE.Vector3().crossVectors(T, V(0, 1, 0)).normalize(), op = new THREE.Vector3().crossVectors(opzij, T).normalize(), r = straal(i / (N - 1));
    for (let j = 0; j <= n; j++) { const h = (j / n) * Math.PI * 2, q = p.clone().addScaledVector(opzij, Math.cos(h) * r).addScaledVector(op, Math.sin(h) * r * 1.0); q.y += hoogte(i / (N - 1)); pos.push(q.x, q.y, q.z); } }
  for (let i = 0; i < N - 1; i++) for (let j = 0; j < n; j++) { const a = i * (n + 1) + j, b = a + n + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
}

export function maakBellyboat(soort = "paul", { scherm = null } = {}) {
  const k = KLEUREN[soort] ?? KLEUREN.paul, g = new THREE.Group(), R = 0.19, B = 0.5, VOOR = 0.98, ACHTER = -0.3;
  const zet = (m, x, y, z, ouder = g) => { m.position.set(x, y, z); m.castShadow = true; ouder.add(m); return m; };
  const doos = (x, y, z, bx, by, bz, m, ouder = g) => zet(new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), m), x, y, z, ouder);
  const cil = (x, y, z, r, h, m, ouder = g, n = 10) => zet(new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, n), m), x, y, z, ouder);

  // ---- de romp: U-vormig pad van de linker neus via de boog achter naar de rechter neus ----
  const pad = []; for (let z = VOOR; z >= ACHTER; z -= 0.05) pad.push(V(-B, 0.1, z)); for (let a = 0; a <= 20; a++) { const h = Math.PI - (a / 20) * Math.PI; pad.push(V(Math.cos(h) * B, 0.1, ACHTER - Math.sin(h) * B * 0.78)); } for (let z = ACHTER; z <= VOOR; z += 0.05) pad.push(V(B, 0.1, z));
  const lang = pad.length; let tot = 0; const afst = [0]; for (let i = 1; i < lang; i++) afst.push((tot += pad[i].distanceTo(pad[i - 1])));
  const vanEind = (s) => Math.min(afst[Math.round(s * (lang - 1))], tot - afst[Math.round(s * (lang - 1))]);
  const straal = (s) => { const d = vanEind(s); return R * Math.max(0.04, Math.min(1, d / 0.5) ** 0.55); };
  const neusOp = (s) => { const d = vanEind(s); return d < 0.5 ? (1 - d / 0.5) ** 2 * 0.09 : 0; };
  const romp = new THREE.Mesh(buis(pad, straal, neusOp), M(k.romp, { roughness: 0.42 })); romp.castShadow = true; g.add(romp);
  // de neuzen in een andere kleur (Wim) en een band langs de zijkant (Dave)
  if (k.neus !== k.romp) { const n = 10, L = (n - 1) * 0.05, nm = M(k.neus, { roughness: 0.5 });
    for (const [stuk, tip0] of [[pad.slice(0, n), true], [pad.slice(-n), false]]) { const d = (s_) => (tip0 ? s_ : 1 - s_) * L;
      g.add(new THREE.Mesh(buis(stuk, (s_) => R * 1.012 * Math.max(0.04, Math.min(1, d(s_) / 0.5) ** 0.55), (s_) => (d(s_) < 0.5 ? (1 - d(s_) / 0.5) ** 2 * 0.09 : 0)), nm)); } }
  { const band = new THREE.Mesh(buis(pad.slice(4, -4), () => R * 1.012, () => -0.0, 14), M(k.band, { roughness: 0.6 })); band.scale.set(1, 0.16, 1); band.position.y = 0.09; g.add(band); }
  if (k.sticker) for (const x of [-B, B]) { const s = doos(x + Math.sign(x) * (R - 0.005), 0.12, 0.25, 0.01, 0.07, 0.26, M(k.sticker, { roughness: 0.4 })); s.rotation.z = Math.sign(x) * 0.25; }
  // ventielen bovenop
  for (const x of [-B, B]) cil(x, 0.1 + R, 0.55, 0.025, 0.02, M("#2b2b2b"));

  // ---- de stoel: laag tussen de pontons, met een hoge rugleuning en zijtassen ----
  const stof = M(k.stoel, { roughness: 0.9 });
  doos(0, 0.13, -0.16, 0.66, 0.1, 0.5, stof); const rug = doos(0, 0.42, -0.44, 0.56, 0.5, 0.1, stof); rug.rotation.x = -0.2;
  { const r = cil(0, 0.67, -0.5, 0.05, 0.56, stof); r.rotation.z = Math.PI / 2; } // de bovenkant van de rug
  for (const x of [-1, 1]) { doos(x * (B - 0.02), 0.36, -0.12, 0.16, 0.14, 0.48, M("#222427", { roughness: 0.95 })); doos(x * 0.34, 0.27, -0.2, 0.05, 0.24, 0.42, stof); }
  // het "schort" tussen de benen en de pontons (net onder water)
  { const s = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.7).rotateX(-Math.PI / 2), M("#16181a", { side: THREE.DoubleSide, transparent: true, opacity: 0.8 })); zet(s, 0, -0.02, 0.18); }
  // de rugtas achter en de spullen op de boog
  doos(0, 0.33, -0.78, 0.5, 0.3, 0.2, M("#26292d", { roughness: 0.95 }));

  // ---- de stang voorop: dwars over de U, hier zitten de arm met het scherm en de transducerstang aan ----
  const alu = M("#2a2c2f", { metalness: 0.6, roughness: 0.35 });
  { const st = cil(0, 0.34, 0.62, 0.018, 1.16, alu, g, 8); st.rotation.z = Math.PI / 2; for (const x of [-B, B]) cil(x, 0.27, 0.62, 0.03, 0.08, alu); }
  // de arm met het Garmin-scherm, naar de zitter gedraaid
  const armVoet = V(0.2, 0.34, 0.62);
  { cil(armVoet.x, 0.47, armVoet.z, 0.016, 0.26, alu); const a2 = cil(armVoet.x - 0.05, 0.62, armVoet.z - 0.06, 0.014, 0.18, alu); a2.rotation.x = -0.6; }
  const schermGroep = new THREE.Group(); schermGroep.position.set(armVoet.x - 0.08, 0.74, armVoet.z - 0.1); schermGroep.rotation.set(-0.42, Math.PI - 0.12, 0); g.add(schermGroep);
  doos(0, 0, 0, 0.27, 0.18, 0.045, M("#121315", { roughness: 0.4 }), schermGroep); doos(0, -0.11, 0.01, 0.12, 0.05, 0.05, alu, schermGroep);
  const beeld = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.132), scherm ? new THREE.MeshBasicMaterial({ map: scherm, toneMapped: false }) : M("#0a1a50", { emissive: "#10308a", emissiveIntensity: 0.6 })); beeld.position.set(0, 0.01, 0.024); schermGroep.add(beeld);
  // de transducerstang: rechts voorin, een verticale stok tot onder water met de LiveScope-transducer onderaan; bovenop een handvat
  const stang = new THREE.Group(); stang.position.set(B + 0.1, 0, 0.66); g.add(stang);
  cil(-0.06, 0.32, 0, 0.02, 0.06, alu).position.set(B + 0.04, 0.32, 0.66);
  cil(0, -0.05, 0, 0.016, 1.15, alu, stang); const greep = cil(0, 0.54, -0.07, 0.016, 0.16, M("#111"), stang); greep.rotation.x = Math.PI / 2;
  const tr = doos(0, -0.62, 0.04, 0.06, 0.07, 0.17, M("#151618"), stang); doos(0, -0.62, 0.13, 0.055, 0.06, 0.02, M("#30343a"), stang); // de transducer kijkt naar +z van de stang
  // ---- de motor: achter rechts, kop met helmstok, schacht omlaag, schroef onder water ----
  const motor = new THREE.Group(); motor.position.set(0.34, 0, -0.98); g.add(motor); const zwart = M("#16171a", { roughness: 0.4 });
  doos(0, 0.3, 0.12, 0.08, 0.1, 0.2, alu, motor); cil(0, 0.12, 0, 0.022, 0.9, zwart, motor); const kop = doos(0, 0.6, 0, 0.13, 0.13, 0.22, zwart, motor); const helm = doos(-0.12, 0.6, 0.12, 0.04, 0.04, 0.32, zwart, motor); helm.rotation.y = 0.9;
  const pod = cil(0, -0.34, 0, 0.045, 0.2, zwart, motor, 12); pod.rotation.x = Math.PI / 2; const schroef = new THREE.Group(); schroef.position.set(0, -0.34, -0.12); motor.add(schroef); for (let i = 0; i < 3; i++) { const b = doos(0, 0.05, 0, 0.02, 0.1, 0.012, M("#3a3d42"), schroef); b.position.set(Math.sin((i * 2 * Math.PI) / 3) * 0.05, Math.cos((i * 2 * Math.PI) / 3) * 0.05, 0); b.rotation.z = -(i * 2 * Math.PI) / 3; }
  doos(-0.34, 0.3, -0.05, 0.22, 0.16, 0.16, M("#202225"), motor); // de accu op de boog
  // ---- hengelhouders achter, met twee hengels rechtop (Paul en Bob) ----
  if (soort === "paul" || soort === "bob") for (const x of [-0.42, -0.3]) { const h = cil(x, 0.42, -0.72, 0.02, 0.28, alu); h.rotation.x = -0.25; const st = cil(x, 1.25, -0.93, 0.007, 1.8, M("#20242a"), g, 6); st.rotation.x = -0.2; doos(x + 0.05, 0.62, -0.78, 0.07, 0.08, 0.08, M("#1e3a8a", { metalness: 0.5 })); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, stang, motor, schroef, scherm: beeld, zit: V(0, 0.12, -0.18), hengelVoet: V(0, 0.4, 0.2) };
}
