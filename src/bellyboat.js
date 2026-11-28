// De bellyboten van de Cocks, nagebouwd naar de foto's en de video (ref/drie-bellyboten.mp4):
//   paul — zwart/donkergrijs, hoge stoel, Garmin-scherm op een arm, transducerstang, motor achter, twee hengels (Bob heeft dezelfde)
//   wim  — groengrijs/kaki met lichte neuzen en stickers
//   dave — gifgroen met een zwarte band en een zwarte stoel
// Een U-vorm: twee pontons met spitse neuzen die achter de stoel in een boog samenkomen. Je zit laag, met je benen in het water.
// Assen: +z = vooruit, x = opzij, y = omhoog; y = 0 is de waterlijn.
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const KLEUREN = {
  paul: { romp: "#1d1f22", neus: "#1d1f22", band: "#2c2f33", stoel: "#141517", sticker: null, logo: "RAPTOR" },
  bob: { romp: "#1d1f22", neus: "#1d1f22", band: "#2c2f33", stoel: "#141517", sticker: null, logo: "RAPTOR" },
  wim: { romp: "#a3a8ac", neus: "#c4c8cb", band: "#3b3e42", stoel: "#1a1b1d", sticker: null }, // Black Cat Battle Boat: lichtgrijs met een donkere band
  dave: { romp: "#17191b", neus: "#17191b", band: "#39d43b", onder: true, stoel: "#141517", sticker: null },
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
  { const band = new THREE.Mesh(buis(pad.slice(4, -4), () => R * 1.012, () => -0.0, 14), M(k.band, { roughness: 0.6 })); if (k.onder) { band.scale.set(1.01, 0.62, 1.01); band.position.y = 0.035; } else { band.scale.set(1, 0.16, 1); band.position.y = 0.09; } g.add(band); } // Dave: de onderste helft gifgroen, de bovenkant zwart
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

  // ---- de Garmin: laag op de voorkant van de rechter ponton, op een Scotty-mount (plaatje + kogel + korte arm), schuin naar de zitter ----
  const alu = M("#2a2c2f", { metalness: 0.6, roughness: 0.35 }), rvs = M("#c9ced3", { metalness: 0.85, roughness: 0.25 }), zwartM = M("#141517", { roughness: 0.5 });
  const top = 0.1 + R; // bovenkant van een ponton
  const mount = new THREE.Group(); mount.position.set(B - 0.02, top, 0.52); g.add(mount);
  doos(0, 0.01, 0, 0.16, 0.02, 0.2, M("#3a3d42"), mount); cil(0, 0.05, 0, 0.022, 0.06, zwartM, mount); { const k = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), zwartM); zet(k, 0, 0.09, 0, mount); }
  const arm = doos(-0.03, 0.14, -0.04, 0.035, 0.11, 0.03, zwartM, mount); arm.rotation.x = 0.5; doos(0.07, 0.03, 0.03, 0.03, 0.02, 0.12, M("#e07a14"), mount); doos(-0.06, 0.03, 0.06, 0.1, 0.018, 0.025, M("#b4d62a"), mount);
  const schermGroep = new THREE.Group(); schermGroep.position.set(-0.05, 0.25, -0.08); schermGroep.rotation.set(-0.55, Math.PI + 0.35, 0); mount.add(schermGroep);
  doos(0, 0, 0, 0.27, 0.18, 0.05, M("#121315", { roughness: 0.4 }), schermGroep); doos(0, -0.1, 0.02, 0.08, 0.04, 0.04, zwartM, schermGroep);
  if (soort === "wim") schermGroep.scale.setScalar(0.6); // Wims strepenkijker: een klein schermpje
  if (soort === "dave") { const kap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.012, 0.12), M("#101113")); kap.position.set(0, 0.1, 0.05); kap.rotation.x = 0.2; schermGroep.add(kap); for (const k_ of [-1, 1]) { const z_ = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.18, 0.12), M("#101113")); z_.position.set(k_ * 0.145, 0.01, 0.05); schermGroep.add(z_); } } // zonnekap
  const beeld = new THREE.Mesh(new THREE.PlaneGeometry(0.235, 0.132), scherm ? new THREE.MeshBasicMaterial({ map: scherm, toneMapped: false }) : M("#0a1a50", { emissive: "#10308a", emissiveIntensity: 0.6 })); beeld.position.set(0, 0.01, 0.026); schermGroep.add(beeld);
  // de kabel van het scherm over de ponton naar achteren
  { const pts = [V(B - 0.05, top + 0.1, 0.46), V(B - 0.02, top + 0.02, 0.3), V(B + 0.02, top + 0.01, 0.0), V(B, top + 0.02, -0.25)]; const kb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.005, 5), zwartM); g.add(kb); }
  // de transducerstang: een dunne RVS-stang rechts voorin naast de punt, laag, met een greep bovenaan; de transducer onder water
  const stang = new THREE.Group(); stang.position.set(B + R + 0.05, 0, 0.78); g.add(stang);
  doos(-0.05, top - 0.02, 0, 0.1, 0.04, 0.06, alu, stang); // de klem op de ponton
  cil(0, -0.12, 0, 0.011, 0.95, rvs, stang); const greep = cil(0, 0.38, 0, 0.018, 0.12, M("#111"), stang); greep.rotation.z = Math.PI / 2; greep.position.x = -0.04;
  doos(0, -0.58, 0.04, 0.06, 0.07, 0.17, M("#151618"), stang); doos(0, -0.58, 0.13, 0.055, 0.06, 0.02, M("#30343a"), stang); // de transducer kijkt naar +z van de stang
  // een drinkbeker in een houder op de linker ponton
  // de bekerhouder: een zwart plankje over de linker ponton met een houder erop; altijd een biertje erin (bij Wim een pak Fristi)
  { const plank = new THREE.Group(); plank.position.set(-B, top + 0.012, 0.36); g.add(plank);
    doos(0.02, 0, 0, 0.2, 0.018, 0.12, zwartM, plank); cil(-0.04, 0.045, 0, 0.042, 0.075, zwartM, plank, 16); cil(-0.04, 0.083, 0, 0.046, 0.008, M("#2b2b2b"), plank, 16);
    if (soort === "wim") { const pak = new THREE.Group(); pak.position.set(-0.04, 0.05, 0); plank.add(pak); doos(0, 0.06, 0, 0.065, 0.16, 0.065, M("#ece6d8"), pak); doos(0, 0.07, 0, 0.067, 0.06, 0.067, M("#d8357a"), pak); const nok = new THREE.Mesh(new THREE.CylinderGeometry(0, 0.046, 0.035, 4), M("#ece6d8")); nok.rotation.y = Math.PI / 4; zet(nok, 0, 0.157, 0, pak); }
    else { const fles = new THREE.Group(); fles.position.set(-0.04, 0.03, 0); plank.add(fles); const glas = M("#1f7a2e", { roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.9 });
      cil(0, 0.08, 0, 0.032, 0.16, glas, fles, 16); { const sch = new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.032, 0.06, 16), glas); zet(sch, 0, 0.19, 0, fles); } cil(0, 0.25, 0, 0.013, 0.06, glas, fles, 12); cil(0, 0.283, 0, 0.015, 0.008, M("#c9a33a", { metalness: 0.8, roughness: 0.3 }), fles, 12);
      const etiket = cil(0, 0.1, 0, 0.0335, 0.07, M("#f2f2f0"), fles, 16); cil(0, 0.1, 0, 0.0337, 0.02, M("#c8262b"), fles, 16); } }
  // de MADCAT-letters op de neuzen van Dave
  const opdruk = (tekst, achter, kleur, breed = 0.3, z0 = 0.45) => { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); if (achter) { x.fillStyle = achter; x.fillRect(20, 14, 472, 100); } x.font = "italic 900 78px Arial Black, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = kleur; x.fillText(tekst, 256, 66);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const mm = new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false });
    for (const k_ of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(breed, breed / 4), mm); pl.position.set(k_ * (B + R + 0.004), 0.12, z0); pl.rotation.y = k_ * Math.PI / 2; g.add(pl); } };
  // Paul en Bob: een Raptor 180 (zwart carbon), RAPTOR met drie rode klauwkrassen achter op de zijkant
  if (k.logo) { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); x.font = "900 70px Arial Black, Arial, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.fillStyle = "#d8dadc"; x.fillText(k.logo, 256, 66);
    x.strokeStyle = "#d22a1e"; x.lineWidth = 9; x.lineCap = "round"; for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(250 + i * 24, 20); x.lineTo(226 + i * 24, 112); x.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const mm = new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false });
    for (const k_ of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.085), mm); pl.position.set(k_ * (B + R + 0.004), 0.13, -0.15); pl.rotation.y = k_ * Math.PI / 2; g.add(pl); } }
  if (soort === "wim") opdruk("BLACK CAT", null, "#d9c84a", 0.36, 0.3);
  if (soort === "dave") { const c = document.createElement("canvas"); c.width = 512; c.height = 128; const x = c.getContext("2d"); x.font = "900 92px Impact, Arial Black, sans-serif"; x.textAlign = "center"; x.textBaseline = "middle"; x.lineWidth = 10; x.strokeStyle = "#0e2a10"; x.strokeText("MADCAT", 256, 66); x.fillStyle = "#8ef060"; x.fillText("MADCAT", 256, 66);
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; const mm = new THREE.MeshBasicMaterial({ map: tx, transparent: true, toneMapped: false, depthWrite: false });
    for (const k_ of [-1, 1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.105), mm); pl.position.set(k_ * (B + R + 0.004), 0.14, 0.62); pl.rotation.y = k_ * Math.PI / 2; g.add(pl); } }
  // ---- de motor: achter rechts, kop met helmstok, schacht omlaag, schroef onder water ----
  const motor = new THREE.Group(); motor.position.set(0.34, 0, -0.98); g.add(motor); const zwart = M("#16171a", { roughness: 0.4 });
  doos(0, 0.3, 0.12, 0.08, 0.1, 0.2, alu, motor); cil(0, 0.12, 0, 0.022, 0.9, zwart, motor); const kop = doos(0, 0.6, 0, 0.13, 0.13, 0.22, zwart, motor); const helm = doos(-0.12, 0.6, 0.12, 0.04, 0.04, 0.32, zwart, motor); helm.rotation.y = 0.9;
  const pod = cil(0, -0.34, 0, 0.045, 0.2, zwart, motor, 12); pod.rotation.x = Math.PI / 2; const schroef = new THREE.Group(); schroef.position.set(0, -0.34, -0.12); motor.add(schroef); for (let i = 0; i < 3; i++) { const b = doos(0, 0.05, 0, 0.02, 0.1, 0.012, M("#3a3d42"), schroef); b.position.set(Math.sin((i * 2 * Math.PI) / 3) * 0.05, Math.cos((i * 2 * Math.PI) / 3) * 0.05, 0); b.rotation.z = -(i * 2 * Math.PI) / 3; }
  doos(-0.34, 0.3, -0.05, 0.22, 0.16, 0.16, M("#202225"), motor); // de accu op de boog
  // ---- twee hengelsteunen achter naast de stoel, met reservehengels rechtop (met een reel en een lichtje op de top) ----
  for (const [x, kl] of [[-0.42, "#ff4a2a"], [0.42, "#f5b21e"]]) { cil(x, 0.5, -0.62, 0.022, 0.42, alu); const st = cil(x, 1.65, -0.62, 0.008, 2.3, M("#1a1d21"), g, 6); cil(x, 0.62, -0.62, 0.016, 0.3, M("#2b2b2b"));
    doos(x, 0.86, -0.6, 0.06, 0.05, 0.08, M("#b99a3a", { metalness: 0.6, roughness: 0.35 })); const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: kl })); zet(lamp, x, 2.78, -0.62); }
  // grote tas achter de stoel
  doos(0, 0.42, -0.86, 0.46, 0.26, 0.22, M("#4a4e52", { roughness: 0.95 }));
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { g, stang, motor, schroef, scherm: beeld, zit: V(0, 0.12, -0.18), hengelVoet: V(0, 0.4, 0.2), mount };
}

// ---------- de echte bellyboten, gebouwd in Blender naar Bobs foto's (tools/boten/bellyboat.py) ----------
// Paul en Bob: Raptor 180 (zwart carbon), Wim: Black Cat Battle Boat (grijs, klein schermpje), Dave: MADCAT (zwart met groen).
const MODELLEN = {}; const SOORT = { paul: "raptor", bob: "raptor", wim: "blackcat", dave: "madcat" };
export async function laadBoten() {
  const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([import("../lib/three-addons.js"), import("../lib/meshopt_decoder.mjs")]);
  const L = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  await Promise.all(["raptor", "blackcat", "madcat"].map(async (n) => { MODELLEN[n] = (await L.loadAsync(`assets/boten/${n}.glb?v=${window.VERSIE ?? ""}`)).scene; }));
}
const maakBellyboatOud = maakBellyboat;
export function maakBellyboat2(soort = "paul", { scherm = null } = {}) {
  const bron = MODELLEN[SOORT[soort]]; if (!bron) return maakBellyboatOud(soort, { scherm });
  const g = bron.clone(true), vind = (n) => { let r = null; g.traverse((o) => { if (!r && o.name === n) r = o; }); return r; };
  g.traverse((o) => { if (!o.isMesh) return; o.castShadow = true; o.receiveShadow = true; if (o.material?.name === "Scherm") o.material = scherm ? new THREE.MeshBasicMaterial({ map: scherm, toneMapped: false }) : new THREE.MeshBasicMaterial({ color: "#0a1a60" }); });
  const zit = vind("zit"), stang = vind("stang"), motor = vind("motor"), schroef = vind("schroef");
  // de drank in de bekerhouder: een biertje, bij Wim een pak Fristi
  const houder = vind("bekerhouder"); if (houder) { g.updateMatrixWorld(true); const p = new THREE.Vector3(); houder.getWorldPosition(p); g.worldToLocal(p);
    const d = new THREE.Group(); d.position.set(p.x, p.y + 0.03, p.z); g.add(d); const M_ = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, ...o });
    if (soort === "wim") { const pak = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.16, 0.065), M_("#ece6d8")); pak.position.y = 0.06; d.add(pak); const band = new THREE.Mesh(new THREE.BoxGeometry(0.067, 0.06, 0.067), M_("#d8357a")); band.position.y = 0.07; d.add(band); }
    else { const glas = M_("#1f7a2e", { roughness: 0.15, transparent: true, opacity: 0.92 }); const c = (r1, r2, h, y, m) => { const x = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 16), m); x.position.y = y; d.add(x); };
      c(0.032, 0.032, 0.16, 0.08, glas); c(0.013, 0.032, 0.06, 0.19, glas); c(0.013, 0.013, 0.06, 0.25, glas); c(0.015, 0.015, 0.008, 0.283, M_("#c9a33a", { metalness: 0.8 })); c(0.0335, 0.0335, 0.07, 0.1, M_("#f2f2f0")); c(0.0337, 0.0337, 0.02, 0.1, M_("#c8262b")); } }
  return { g, stang, motor, schroef, scherm: null, zit: zit ? zit.position.clone() : new THREE.Vector3(0, 0.12, -0.18), hengelVoet: new THREE.Vector3(0, 0.4, 0.2) };
}
