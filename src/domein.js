// Het huis aan de Lot met alles eromheen, nagebouwd naar Bobs foto's, video's en de luchtfoto (zie PLAN.md, ref/ staat niet in de repo).
// Eén groep met eigen assen: x = langs de oever naar het westen (stroomafwaarts), z = naar de rivier, y = omhoog. De oorsprong is
// het midden van de voorgevel uit IGN BD TOPO. Van oost naar west: het witte woonhuis, de toren (met de slaapkamer boven),
// de bakstenen schuur met het rode dak. Voor de toren het zwembad. Langs de oever drie steigers: de rechter onder de bomen
// (oost), de middelste, en de linker bij de toren met de groene boot (links en rechts zoals je ze vanaf het huis ziet).
import * as THREE from "three";
import { grondMat, natUit } from "./grond.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
function ruis(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }

// ---------- texturen, op de canvas getekend; 1 herhaling = 1 meter ----------
function tex(px, teken) { const c = document.createElement("canvas"); c.width = c.height = px; const x = c.getContext("2d"); teken(x, px); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
const korrel = (x, n, a, kleur = "0,0,0") => { for (let i = 0; i < n * n * 0.5; i++) { x.fillStyle = `rgba(${kleur},${Math.random() * a})`; x.fillRect(Math.random() * n, Math.random() * n, 1 + Math.random() * 2, 1 + Math.random() * 2); } };
const TEX = {
  // de roze-oranje platte bakstenen van de streek (brique foraine): lang en dun, met brede lichte voegen
  // de roze-oranje bakstenen van de streek: lang en dun, brede lichte voegen, en hier en daar een band in visgraat (zie ref/huis-zwembad-*.jpg)
  baksteen: () => tex(512, (x, n) => { x.fillStyle = "#d9c3a8"; x.fillRect(0, 0, n, n); const R = 30, rij = n / R;
    const steen = (px, py, l, h, hoek = 0) => { const hu = 14 + Math.random() * 12, sa = 42 + Math.random() * 20, li = 64 + Math.random() * 14; x.save(); x.translate(px, py); x.rotate(hoek); x.fillStyle = `hsl(${hu},${sa}%,${li}%)`; x.fillRect(-l / 2, -h / 2, l, h); x.restore(); };
    for (let r = 0; r < R; r++) { const y = r * rij + rij / 2;
      if (r % 9 === 4 || r % 13 === 8) { for (let p = 0; p < n + 20; p += rij * 1.1) steen(p, y, rij * 1.6, rij * 0.5, (Math.floor(p / (rij * 1.1)) % 2 ? 0.7 : -0.7)); continue; } // visgraat
      let p = (r % 2) * -rij * 1.7; while (p < n) { const l = rij * (2.6 + Math.random() * 1.2); steen(p + l / 2, y, l - 3, rij - 4); p += l; } }
    korrel(x, n, 0.1); }),
  pleister: () => tex(256, (x, n) => { x.fillStyle = "#ece3c9"; x.fillRect(0, 0, n, n); korrel(x, n, 0.05); korrel(x, n, 0.06, "255,255,255"); }),
  // holle pannen: banen van boven naar beneden met licht op de bolling
  pannen: (kleur = [16, 58, 46]) => tex(256, (x, n) => { const b = n / 5; for (let k = 0; k < 5; k++) for (let r = 0; r < 6; r++) { const y = r * (n / 6), li = kleur[2] + (Math.random() - 0.5) * 10;
      const g = x.createLinearGradient(k * b, 0, (k + 1) * b, 0); g.addColorStop(0, `hsl(${kleur[0]},${kleur[1]}%,${li - 16}%)`); g.addColorStop(0.45, `hsl(${kleur[0] + 4},${kleur[1]}%,${li + 6}%)`); g.addColorStop(1, `hsl(${kleur[0]},${kleur[1]}%,${li - 20}%)`);
      x.fillStyle = g; x.fillRect(k * b, y, b, n / 6); x.fillStyle = "rgba(40,15,5,0.45)"; x.fillRect(k * b, y + n / 6 - 4, b, 4); }
    korrel(x, n, 0.15); }),
  // verweerde gegroefde vlonderplanken
  planken: (licht = 62, warm = 0.25) => tex(256, (x, n) => { const b = n / 7; for (let k = 0; k < 7; k++) { const li = licht + (Math.random() - 0.5) * 10; x.fillStyle = `hsl(32,${warm * 40}%,${li}%)`; x.fillRect(0, k * b, n, b);
      for (let g = 0; g < 6; g++) { x.fillStyle = `rgba(30,25,20,${0.25 + Math.random() * 0.1})`; x.fillRect(0, k * b + 4 + g * (b - 6) / 6, n, 1.5); }
      x.fillStyle = "rgba(20,15,10,0.7)"; x.fillRect(0, k * b + b - 2, n, 2); for (let i = 0; i < 3; i++) { x.fillStyle = "rgba(20,15,10,0.5)"; x.fillRect(Math.random() * n, k * b, 2, b); } }
    korrel(x, n, 0.12); }),
  tegels: () => tex(256, (x, n) => { x.fillStyle = "#b9ad97"; x.fillRect(0, 0, n, n); for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = `hsl(38,${20 + Math.random() * 8}%,${76 + Math.random() * 6}%)`; x.fillRect(i * n / 2 + 2, j * n / 2 + 2, n / 2 - 4, n / 2 - 4); } korrel(x, n, 0.1); }),
  // blauw mozaïek (kleine tegeltjes in verschillende blauwen)
  zwembad: () => tex(256, (x, n) => { x.fillStyle = "#cfd8dc"; x.fillRect(0, 0, n, n); const k = n / 32; for (let i = 0; i < 32; i++) for (let j = 0; j < 32; j++) { x.fillStyle = `hsl(${205 + Math.random() * 10},${70 + Math.random() * 20}%,${36 + Math.random() * 18}%)`; x.fillRect(i * k + 0.6, j * k + 0.6, k - 1.2, k - 1.2); } }),
  rand: () => tex(256, (x, n) => { x.fillStyle = "#d6c4a3"; x.fillRect(0, 0, n, n); x.strokeStyle = "rgba(120,100,70,0.5)"; x.lineWidth = 2; for (let i = 0; i <= 2; i++) { x.beginPath(); x.moveTo(i * n / 2, 0); x.lineTo(i * n / 2, n); x.stroke(); } korrel(x, n, 0.12); korrel(x, n, 0.06, "255,255,255"); }),
  steen: () => tex(256, (x, n) => { x.fillStyle = "#9c9488"; x.fillRect(0, 0, n, n); korrel(x, n, 0.25); korrel(x, n, 0.12, "255,255,255"); }),
};

/** Zet de uv's van een doos in meters, zodat texturen op elke maat even groot blijven. */
function uvMeter(g, bx, by, bz) { const uv = g.attributes.uv, maat = [[bz, by], [bz, by], [bx, bz], [bx, bz], [bx, by], [bx, by]]; for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * maat[f][0], uv.getY(i) * maat[f][1]); } return g; }

export function bouwDomein(W, scene) {
  const O = V(1.05, 0, -2.0), t = V(0.954, 0, 0.299).normalize(), u = V(0.299, 0, -0.954).normalize(), yaw = Math.atan2(u.x, u.z);
  const D = new THREE.Group(); D.position.copy(O); D.rotation.y = yaw; scene.add(D); D.updateMatrixWorld(true);
  const wereld = (x, y, z) => V(x, y, z).applyMatrix4(D.matrixWorld);
  const lokaal = (p) => D.worldToLocal(p.clone());
  // ---------- het gazon en de wal: een fijn eigen grondstuk (0,5 m) in plaats van het grove raster (3 m) ----------
  // Op de foto's loopt het gazon vlak tot de oever en dan een wal van een meter steil naar het water, met stenen treden.
  const VK = { x0: -46, x1: 46, z0: -32, z1: 30, stap: 0.5 }, basisH = W.hoogte, zacht = (a, b, x) => { const q = Math.min(1, Math.max(0, (x - a) / (b - a))); return q * q * (3 - 2 * q); };
  const naarLokaal = (x, z) => { const dx = x - O.x, dz = z - O.z; return [-(dx * t.x + dz * t.z), dx * u.x + dz * u.z]; };
  const fijnH = (x, z) => { const [lx, lz] = naarLokaal(x, z), b = basisH(x, z);
    const rand = Math.min(lx - VK.x0, VK.x1 - lx, lz - VK.z0, VK.z1 - lz); if (rand <= 0) return b;
    const s = W.oever(x, z); if (s > 0) return b; // in het water: de rivierbodem blijft zoals hij is
    const gras = 0.05 + 0.95 * zacht(0, 2.2, -s) + 0.25 * zacht(4, 40, -s) + (ruis(Math.round(lx / 4), Math.round(lz / 4)) - 0.5) * 0.04, w = zacht(0, 8, rand);
    return b * (1 - w) + gras * w; };
  W.hoogte = (x, z) => fijnH(x, z);
  const gy = (x, z) => { const p = wereld(x, 0, z); return W.hoogte(p.x, p.z); };
  // het grove raster binnen dit stuk niet tekenen
  const knip = (m, rects) => { m.onBeforeCompile = (sh) => { sh.uniforms.uO = { value: new THREE.Vector2(O.x, O.z) }; sh.uniforms.uT = { value: new THREE.Vector2(t.x, t.z) }; sh.uniforms.uU = { value: new THREE.Vector2(u.x, u.z) }; sh.uniforms.uKnip = { value: rects.map((r) => new THREE.Vector4(...r)) };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vWp;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvWp = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>\nvarying vec3 vWp; uniform vec2 uO, uT, uU; uniform vec4 uKnip[${rects.length}];`).replace("void main() {", "void main() {\n  { vec2 d = vWp.xz - uO; float lx = -dot(d, uT), lz = dot(d, uU); for (int i = 0; i < " + rects.length + "; i++) { vec4 r = uKnip[i]; if (lx > r.x && lx < r.z && lz > r.y && lz < r.w) discard; } }"); };
    m.needsUpdate = true; };
  if (W.grond) W.grond.material = grondMat({ O, t, u, rects: [[VK.x0 + 0.3, VK.z0 + 0.3, VK.x1 - 0.3, VK.z1 - 0.3]] });
  /** Waar begint het water, recht voor x? */
  const oeverZ = (x) => { let z = 0; while (z < 90) { const p = wereld(x, 0, z); if (W.inWater(p.x, p.z)) return z; z += 0.2; } return z; };

  const ZBgat = [6, 5.5, 16, 10.5];
  { const nx = Math.round((VK.x1 - VK.x0) / VK.stap), nz = Math.round((VK.z1 - VK.z0) / VK.stap), pos = new Float32Array((nx + 1) * (nz + 1) * 3), kl = new Float32Array(pos.length), nat = new Float32Array((nx + 1) * (nz + 1)), idx = [], c = new THREE.Color();
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) { const lx = VK.x0 + i * VK.stap, lz = VK.z0 + j * VK.stap, p = wereld(lx, 0, lz), h = W.hoogte(p.x, p.z), s = W.oever(p.x, p.z), k = (j * (nx + 1) + i) * 3;
      pos.set([lx, h - 0.005, lz], k);
      if (s > 0) c.set("#5b5a44").lerp(new THREE.Color("#2a3328"), zacht(0, 5, -h)); else if (s > -0.5) c.set("#6a6142"); else if (s > -2.4) c.set("#5f8a3c").lerp(new THREE.Color("#4f7a34"), ruis(i, j));
      else { c.set(Math.floor(lx / 1.6) % 2 ? "#6b8f45" : "#638840").lerp(new THREE.Color("#8d9a50"), ruis(Math.round(lx / 3), Math.round(lz / 3)) * 0.6); }
      kl.set([c.r, c.g, c.b], k); nat[k / 3] = s > 0 ? natUit(s) : Math.max(0, 1 + s / 0.7); }
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const x = VK.x0 + (i + 0.5) * VK.stap, z = VK.z0 + (j + 0.5) * VK.stap; if (x > ZBgat[0] && x < ZBgat[2] && z > ZBgat[1] && z < ZBgat[3]) continue; const a = j * (nx + 1) + i, b = a + nx + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(pos, 3)); g.setAttribute("color", new THREE.BufferAttribute(kl, 3)); g.setAttribute("nat", new THREE.BufferAttribute(nat, 1)); g.setIndex(idx); g.computeVertexNormals();
    const m = new THREE.Mesh(g, grondMat()); m.receiveShadow = true; D.add(m); }

  const M = {}; const mat = (naam, o) => (M[naam] ??= new THREE.MeshStandardMaterial({ roughness: 0.85, ...o }));
  const tx = {}; const T = (n, ...a) => (tx[n + a.join()] ??= TEX[n](...a));
  const zet = (m, x, y, z, ouder = D) => { m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; ouder.add(m); return m; };
  const doos = (x, y, z, bx, by, bz, m, ouder = D) => zet(new THREE.Mesh(uvMeter(new THREE.BoxGeometry(bx, by, bz), bx, by, bz), m), x, y, z, ouder);
  const cil = (x, y, z, r1, r2, h, m, n = 12, ouder = D) => zet(new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, n), m), x, y, z, ouder);
  const bol = (x, y, z, r, m, ouder = D) => zet(new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m), x, y, z, ouder);

  const Mb = mat("baksteen", { map: T("baksteen") }), Mp = mat("pleister", { map: T("pleister") }), Mpan = mat("pannen", { map: T("pannen") }), Mrood = mat("roodpan", { map: T("pannen", [8, 62, 44]) });
  const Mluik = mat("luik", { color: "#95ae97", roughness: 0.65 }), Mglas = mat("glas", { color: "#26343c", roughness: 0.08, metalness: 0.6 }), Mwit = mat("wit", { color: "#f4f2ec", roughness: 0.5 });
  const Mlicht = mat("lichtsteen", { color: "#e6d9bf", roughness: 0.9 }), Mzwart = mat("zwart", { color: "#1d1f22", roughness: 0.5 }), Mrvs = mat("rvs", { color: "#d8dde2", metalness: 0.9, roughness: 0.25 });
  const Mband = mat("band", { color: "#18191b", roughness: 0.95 }), Mhout = mat("hout", { color: "#6b4c33", roughness: 0.85 }), Mterra = mat("terra", { color: "#b5532f", roughness: 0.8 });

  // ---------- gebouwen ----------
  const blokken = []; // [x0, z0, x1, z1] in lokale assen: hier kun je niet doorheen lopen
  /** Een zadeldak: nok langs x (of langs z als langsZ), goot op hoogte y. */
  function zadeldak(cx, y, cz, lx, lz, nok, m, gevel, langsZ = false, over = 0.45) {
    const g = new THREE.Group(); g.position.set(cx, y, cz); if (langsZ) g.rotation.y = Math.PI / 2; D.add(g);
    const len = langsZ ? lz : lx, hb = (langsZ ? lx : lz) / 2, hoek = Math.atan2(nok, hb), zak = over * Math.tan(hoek), schuin = Math.hypot(hb + over, nok + zak);
    for (const k of [-1, 1]) { const vlak = doos(0, (nok - zak) / 2 + 0.07, k * (hb + over) / 2, len + over * 2, 0.12, schuin, m, g); vlak.rotation.x = k * hoek; }
    const sh = new THREE.Shape(); sh.moveTo(-hb, 0); sh.lineTo(hb, 0); sh.lineTo(0, nok); sh.closePath();
    const gm = gevel.clone(); gm.side = THREE.DoubleSide;
    for (const k of [-1, 1]) { const geo = new THREE.ShapeGeometry(sh); const uv = geo.attributes.uv, pp = geo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pp.getX(i), pp.getY(i));
      const m2 = new THREE.Mesh(geo, gm); m2.position.set(k * len / 2, 0, 0); m2.rotation.y = Math.PI / 2; m2.castShadow = true; g.add(m2); }
    const vorst = cil(0, nok + 0.08, 0, 0.11, 0.11, len + over * 2, m, 8, g); vorst.rotation.z = Math.PI / 2;
    return g;
  }
  /** Een schilddak: vier schuine vlakken (lx langs x, lz langs z), nok in het midden. */
  function schilddak(cx, y, cz, lx, lz, nok, m, over = 0.45) { const X = lx / 2 + over, Z = lz / 2 + over, rug = Math.max(0, X - Z), zak = over * nok / (lz / 2), y0 = y - zak;
    const P = [[-X, y0, -Z], [X, y0, -Z], [X, y0, Z], [-X, y0, Z], [-rug, y + nok, 0], [rug, y + nok, 0]], F_ = [[3, 2, 5, 4], [1, 0, 4, 5], [0, 3, 4], [2, 1, 5]];
    const pos = [], uv = []; for (const f_ of F_) { const tri = f_.length === 4 ? [[f_[0], f_[1], f_[2]], [f_[0], f_[2], f_[3]]] : [f_]; for (const t_ of tri) for (const i of t_) { const q = P[i]; pos.push(q[0] + cx, q[1], q[2] + cz); uv.push(q[0] + q[2] * (f_.length === 3 ? 1 : 0), q[1] * 1.6 + (f_.length === 4 ? q[2] : q[0]) * 0); } }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); g.computeVertexNormals();
    const mm = m.clone(); mm.side = THREE.DoubleSide; const me = new THREE.Mesh(g, mm); me.castShadow = me.receiveShadow = true; D.add(me);
    // de nok en de hoekgraten in een lichtere kleur
    return me; }
  /** Een gebouw: muren als één blok met texturen, dak erop. */
  function gebouw(x0, x1, z0, z1, hoog, muur, dak, nok, langsZ = false, schild = false) { const y = Math.min(gy(x0, z0), gy(x1, z0), gy(x0, z1), gy(x1, z1)) - 0.2, h = hoog + 0.2;
    doos((x0 + x1) / 2, y + h / 2, (z0 + z1) / 2, x1 - x0, h, z1 - z0, muur); if (schild) { schilddak((x0 + x1) / 2, y + h, (z0 + z1) / 2, x1 - x0, z1 - z0, nok, dak); blokken.push([x0, z0, x1, z1]); return y + 0.2; } zadeldak((x0 + x1) / 2, y + h, (z0 + z1) / 2, x1 - x0, z1 - z0, nok, dak, muur, langsZ); blokken.push([x0, z0, x1, z1]); return y + 0.2; }
  /** Een raam met luiken op de gevel naar de rivier (z = gevel). */
  function raam(x, y, z, b, h, { luiken = true, kozijn = Mwit, deur = false, dicht = false, boog = false, plank = false } = {}) {
    // stenen omlijsting zoals op de foto's, daarbinnen een wit kozijn met glas
    const st = Mlicht; doos(x, y + (boog ? b * 0.25 : 0), z + 0.02, b + 0.36, h + 0.3 + (boog ? b * 0.5 : 0), 0.05, st);
    doos(x, y, z + 0.05, b + 0.06, h + 0.06, 0.03, kozijn); doos(x, y, z + 0.07, b, h, 0.02, deur ? mat("deurglas", { color: "#3a4a50", roughness: 0.15, metalness: 0.4 }) : Mglas);
    doos(x, y, z + 0.085, 0.05, h, 0.02, Mwit); if (!deur) doos(x, y + h * 0.15, z + 0.085, b, 0.04, 0.02, Mwit); else for (let i = 1; i < 4; i++) doos(x, y - h / 2 + (i * h) / 4, z + 0.085, b, 0.035, 0.02, Mwit);
    if (boog) { const bg = new THREE.Mesh(new THREE.CircleGeometry(b / 2, 20, 0, Math.PI), Mglas); zet(bg, x, y + h / 2, z + 0.075); const bk = new THREE.Mesh(new THREE.RingGeometry(b / 2, b / 2 + 0.05, 20, 1, 0, Math.PI), Mwit); zet(bk, x, y + h / 2, z + 0.08);
      for (let i = 1; i < 4; i++) { const sp = doos(x, y + h / 2 + b * 0.22, z + 0.085, 0.025, b * 0.45, 0.015, Mwit); sp.rotation.z = (i - 2) * 0.7; sp.position.x = x + Math.sin((i - 2) * 0.7) * b * 0.22; sp.position.y = y + h / 2 + Math.cos((i - 2) * 0.7) * b * 0.22; } }
    if (dicht) { const l = doos(x, y, z + 0.11, b + 0.04, h + 0.04, 0.04, Mluik); for (let i = 1; i < 14; i++) doos(0, -h / 2 + (i * h) / 14, 0.025, b, 0.028, 0.012, mat("luiklat", { color: "#86a389" }), l); return; }
    if (luiken) for (const k of [-1, 1]) { const lb = b / 2 + 0.02, l = doos(x + k * (b / 2 + 0.2 + lb / 2), y + (boog ? b * 0.2 : 0), z + 0.1, lb, h + 0.05 + (boog ? b * 0.4 : 0), 0.045, Mluik);
      if (plank) for (let i = 0; i < 4; i++) doos(-lb / 2 + (i + 0.5) * lb / 4, 0, 0.026, 0.008, h + (boog ? b * 0.4 : 0), 0.01, mat("luiknaad", { color: "#7e9680" }), l);
      else for (let i = 1; i < 10; i++) doos(0, -h / 2 + (i * h) / 10, 0.026, lb, 0.03, 0.01, mat("luiklat", { color: "#86a389" }), l); } }

  // het witte woonhuis (oost), lang en laag, met witte schoorsteen en twee dakramen; achter een vleugel
  const Mdonker = mat("donkerpan", { map: T("pannen", [20, 14, 26]) });
  const yWit = gebouw(-15, 10.4, -9.5, 0, 3.3, Mp, Mdonker, 2.6, false, true);
  gebouw(-15, -4, -15, -9.5, 3.0, Mp, Mdonker, 2.2, true, true);
  doos(-2.5, yWit + 6.1, -3.2, 0.7, 1.9, 0.6, Mwit); doos(-2.5, yWit + 7.1, -3.2, 0.85, 0.12, 0.75, Mwit); doos(-2.5, yWit + 7.22, -3.2, 0.5, 0.14, 0.4, Mzwart);
  raam(-12.5, yWit + 1.4, 0, 0.9, 1.2, { dicht: true }); raam(-9.5, yWit + 1.4, 0, 0.9, 1.2);
  raam(-6.2, yWit + 1.05, 0, 1.25, 2.1, { deur: true, boog: true, plank: true }); raam(-1.8, yWit + 1.4, 0, 0.9, 1.2, { dicht: true }); raam(3, yWit + 1.4, 0, 0.9, 1.2); raam(7, yWit + 1.4, 0, 0.9, 1.2, { dicht: true });
  // een stenen boog boven de openslaande deur en een lampje
  { const bg = new THREE.Mesh(new THREE.RingGeometry(0.8, 0.95, 24, 1, 0, Math.PI), Mlicht); zet(bg, -6.2, yWit + 2.1, 0.06); doos(-4.9, yWit + 2.5, 0.08, 0.12, 0.18, 0.1, Mzwart); }
  { const goot = cil(-2.3, yWit + 3.28, 0.25, 0.07, 0.07, 25.4, mat("goot", { color: "#c9c6bf", metalness: 0.4, roughness: 0.4 }), 8); goot.rotation.z = Math.PI / 2; cil(10.1, yWit + 1.6, 0.25, 0.05, 0.05, 3.3, M.goot, 8); }

  // de toren: baksteen, lichte stenen omlijstingen, duivengaten bovenin; boven de slaapkamer met het open raam naar de rivier
  const TB = 4.6, TH = 9.6, HV = 4.4, MD = 0.3;
  const toren = new THREE.Group(); toren.position.set(12.7, Math.min(gy(10.4, 0), gy(15, 0), gy(10.4, -4.6), gy(15, -4.6)) - 0.1, -2.3); D.add(toren); blokken.push([10.4, -4.6, 15, 0]);
  const dozen = []; const tdoos = (x, y, z, bx, by, bz, m, bots = true) => { doos(x, y, z, bx, by, bz, m, toren); if (bots) dozen.push([x - bx / 2, y - by / 2, z - bz / 2, x + bx / 2, y + by / 2, z + bz / 2]); };
  const RAAM = { x: 0, y: 6.0, b: 1.15, h: 1.35 };
  tdoos(0, TH / 2, -TB / 2 + MD / 2, TB, TH, MD, Mb); tdoos(-TB / 2 + MD / 2, TH / 2, 0, MD, TH, TB, Mb); tdoos(TB / 2 - MD / 2, TH / 2, 0, MD, TH, TB, Mb);
  { const zf = TB / 2 - MD / 2, r0 = RAAM.y - RAAM.h / 2, r1 = RAAM.y + RAAM.h / 2, l0 = RAAM.x - RAAM.b / 2, l1 = RAAM.x + RAAM.b / 2;
    tdoos(0, r0 / 2, zf, TB, r0, MD, Mb); tdoos(0, (r1 + TH) / 2, zf, TB, TH - r1, MD, Mb); tdoos((-TB / 2 + l0) / 2, RAAM.y, zf, l0 + TB / 2, RAAM.h, MD, Mb); tdoos((TB / 2 + l1) / 2, RAAM.y, zf, TB / 2 - l1, RAAM.h, MD, Mb);
    // de omlijsting: licht natuursteen en een wit kozijn dat openstaat
    tdoos(0, r0 - 0.08, zf + 0.17, RAAM.b + 0.5, 0.16, 0.06, Mlicht, false); tdoos(0, r1 + 0.1, zf + 0.17, RAAM.b + 0.5, 0.2, 0.06, Mlicht, false);
    for (const k of [-1, 1]) { tdoos(k * (RAAM.b / 2 + 0.12), RAAM.y, zf + 0.17, 0.24, RAAM.h, 0.06, Mlicht, false); tdoos(k * (RAAM.b / 2 - 0.02), RAAM.y, zf - 0.25, 0.06, RAAM.h, 0.5, Mwit, false); } }
  // binnen gepleisterd, zodat je door het raam een kamer ziet
  { const bi = TB - 2 * MD - 0.02, y = (HV + TH) / 2, h = TH - HV; doos(0, y, -TB / 2 + MD + 0.01, bi, h, 0.02, Mp, toren); for (const k of [-1, 1]) doos(k * (TB / 2 - MD - 0.01), y, 0, 0.02, h, bi, Mp, toren); }
  tdoos(0, HV, 0, TB - 2 * MD, 0.2, TB - 2 * MD, mat("vloer", { color: "#9a6b44" })); tdoos(0, TH - 0.1, 0, TB, 0.2, TB, Mhout);
  // beneden: een raam met groene luiken, en de duivengaten in rijen bovenin
  { const zf = TB / 2 + 0.01; doos(-0.5, 1.05, zf + 0.12, 1.35, 2.35, 0.06, Mlicht, toren); doos(-0.5, 1.0, zf + 0.15, 0.95, 2.05, 0.04, mat("deurglas2", { color: "#8d9ea0", roughness: 0.3 }), toren); doos(-0.5, 1.0, zf + 0.17, 0.05, 2.0, 0.02, Mwit, toren);
    const gat = mat("gat", { color: "#2a1d16" }); for (let r = 0; r < 4; r++) for (let i = 0; i < 5; i++) { const y = 7.0 + r * 0.55 + (i % 2) * 0.12; if (y > TH - 0.3) continue; for (const [nx, nz, rot] of [[0, 1, 0], [1, 0, 1]]) { const p = -1.6 + i * 0.8 + (r % 2) * 0.3; doos(nx ? zf + 0.0 : p, y, nx ? p : zf + 0.0, rot ? 0.06 : 0.11, 0.16, rot ? 0.11 : 0.06, gat, toren); } }
    // hoekstenen
    for (let y = 0.3; y < TH; y += 0.7) for (const [sx, sz] of [[1, 1], [-1, 1]]) doos(sx * (TB / 2 - 0.15), y, sz * (TB / 2 - 0.15), 0.36, 0.3, 0.36, mat("hoeksteen", { color: "#d8c3a2", roughness: 0.9 }), toren); }
  // het torendak: laag schilddak
  { const d = new THREE.Mesh(new THREE.ConeGeometry(TB * 0.82, 1.5, 4, 1), Mrood); d.rotation.y = Math.PI / 4; d.material = Mrood; zet(d, 0, TH + 0.72, 0, toren); }
  // de slaapkamer: bed onder het raam, nachtkastje, lampje
  const BED = { x: 0.55, z: 0.45, y: HV + 0.1 };
  { const bm = (k) => mat("bed" + k, { color: k }); doos(BED.x, BED.y + 0.2, BED.z, 1.45, 0.4, 2.05, bm("#6b4a30"), toren); doos(BED.x, BED.y + 0.48, BED.z, 1.4, 0.18, 2.0, bm("#e8e4da"), toren); doos(BED.x, BED.y + 0.62, BED.z - 0.78, 0.7, 0.14, 0.38, bm("#f4f1ea"), toren); doos(BED.x - 1.15, BED.y + 0.3, BED.z - 0.75, 0.45, 0.6, 0.45, Mhout, toren);
    const lamp = new THREE.PointLight("#ffd9a0", 5, 6); lamp.position.set(0, TH - 0.8, 0); toren.add(lamp); }
  // achter de toren het lage bakstenen deel tot de achtergevel
  gebouw(10.4, 15, -9, -4.6, 3.6, Mb, Mrood, 1.8);
  // de bakstenen schuur in het westen: rood dak, blauwgrijze deur, bordje
  const ySchuur = gebouw(17.6, 31, -9.2, -0.8, 3.1, Mb, Mrood, 2.1);
  { const z = -0.8; doos(21, ySchuur + 1.05, z + 0.04, 1.0, 2.1, 0.06, mat("deurgrijs", { color: "#8ea0a8" })); doos(21, ySchuur + 1.05, z + 0.02, 1.25, 2.3, 0.04, Mlicht); doos(22.4, ySchuur + 1.6, z + 0.05, 0.45, 0.5, 0.03, mat("bord", { color: "#3d4a52" }));
    raam(18.8, ySchuur + 1.4, z, 0.8, 1.05); raam(26.5, ySchuur + 1.4, z, 0.9, 1.1); }

  // ---------- terras, zwembad, tuin ----------
  // houten terras voor de openslaande deuren
  { const y = gy(-4, 1.5) + 0.12; const t_ = doos(-4, y - 0.08, 1.6, 7.5, 0.16, 3.2, mat("terras", { map: T("planken", 40, 0.6) })); t_.receiveShadow = true; }
  // het zwembad: helder blauw, lichte tegelrand, rolafdekking aan de korte kant, een robot op de rand
  const ZB = { x: 11, z: 8, b: 10, d: 5 };
  const yZ = Math.max(gy(ZB.x, ZB.z), gy(ZB.x - 6, ZB.z - 4), gy(ZB.x + 6, ZB.z + 4)) + 0.06;
  { const rand = 1.5, tm = mat("zwembadrand", { map: T("rand") });
    doos(ZB.x, yZ - 0.6, ZB.z - ZB.d / 2 - rand / 2, ZB.b + 2 * rand, 1.2, rand, tm); doos(ZB.x, yZ - 0.6, ZB.z + ZB.d / 2 + rand / 2, ZB.b + 2 * rand, 1.2, rand, tm);
    for (const k of [-1, 1]) doos(ZB.x + k * (ZB.b / 2 + rand / 2), yZ - 0.6, ZB.z, rand, 1.2, ZB.d, tm);
    // aan de huiskant een breder tegelterras
    doos(ZB.x, yZ - 0.6, ZB.z - ZB.d / 2 - rand - 1.4, ZB.b + 2 * rand, 1.2, 2.8, tm);
    const bak = mat("bak", { map: T("zwembad"), roughness: 0.35 }); doos(ZB.x, yZ - 1.55, ZB.z, ZB.b, 0.1, ZB.d, bak); for (const k of [-1, 1]) { doos(ZB.x, yZ - 0.8, ZB.z + k * (ZB.d / 2 - 0.05), ZB.b, 1.5, 0.1, bak); doos(ZB.x + k * (ZB.b / 2 - 0.05), yZ - 0.8, ZB.z, 0.1, 1.5, ZB.d, bak); }
    const water = new THREE.Mesh(new THREE.PlaneGeometry(ZB.b, ZB.d).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#3fa6e0", roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.42, emissive: "#0a4f86", emissiveIntensity: 0.18 })); zet(water, ZB.x, yZ - 0.12, ZB.z).castShadow = false;
    // de rol met de blauwe afdekking aan de oostkant
    const rol = cil(ZB.x - ZB.b / 2 - 0.8, yZ + 0.45, ZB.z, 0.34, 0.34, ZB.d + 0.4, mat("afdek", { color: "#2f8fd8", roughness: 0.5 }), 18); rol.rotation.x = Math.PI / 2;
    for (const k of [-1, 1]) { doos(ZB.x - ZB.b / 2 - 0.8, yZ + 0.25, ZB.z + k * (ZB.d / 2 + 0.3), 0.08, 0.5, 0.08, Mrvs); const w = cil(ZB.x - ZB.b / 2 - 0.8, yZ + 0.45, ZB.z + k * (ZB.d / 2 + 0.36), 0.42, 0.42, 0.04, mat("wiel", { color: "#d9dde0" }), 16); w.rotation.x = Math.PI / 2; }
    const robot = new THREE.Group(); zet(robot, ZB.x - ZB.b / 2 - 0.3, yZ, ZB.z + ZB.d / 2 + 0.6); robot.rotation.y = 0.4; doos(0, 0.16, 0, 0.42, 0.26, 0.45, mat("robot", { color: "#2c6fb4", roughness: 0.4 }), robot); doos(0, 0.42, 0, 0.06, 0.28, 0.32, mat("robotgrijs", { color: "#d0d4d8" }), robot);
    // een RVS-trapje in het bad
    for (const k of [-1, 1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.025, 6, 12, Math.PI), Mrvs); b.rotation.y = Math.PI / 2; zet(b, ZB.x + ZB.b / 2 - 1.2 + k * 0.25, yZ + 0.02, ZB.z - ZB.d / 2 + 0.25); }
    blokken.push([ZB.x - ZB.b / 2, ZB.z - ZB.d / 2, ZB.x + ZB.b / 2, ZB.z + ZB.d / 2]); }

  // ---------- meubels ----------
  /** Kuipstoel (grijs op de steiger, turquoise bij het bad): een dichte kunststof stoel met hoge rug en armleuningen. */
  function kuipstoel(x, z, rot, kleur, y = null) { const g = new THREE.Group(), m = mat("kuip" + kleur, { color: kleur, roughness: 0.55 }); zet(g, x, y ?? gy(x, z), z); g.rotation.y = rot;
    doos(0, 0.4, 0.02, 0.62, 0.06, 0.55, m, g); doos(0, 0.66, -0.3, 0.7, 0.62, 0.08, m, g); for (const k of [-1, 1]) { doos(k * 0.33, 0.48, -0.02, 0.07, 0.42, 0.62, m, g); doos(k * 0.3, 0.2, 0.22, 0.12, 0.4, 0.12, m, g); doos(k * 0.3, 0.2, -0.25, 0.12, 0.4, 0.12, m, g); } return g; }
  function adirondack(x, z, rot, kleur, y = null) { const g = new THREE.Group(), m = mat("adi" + kleur, { color: kleur, roughness: 0.6 }); zet(g, x, y ?? gy(x, z), z); g.rotation.y = rot;
    for (let i = 0; i < 5; i++) doos(-0.24 + i * 0.12, 0.36, 0.05, 0.1, 0.04, 0.55, m, g); for (let i = 0; i < 5; i++) { const l = doos(-0.24 + i * 0.12, 0.72, -0.32, 0.1, 0.8 + (i === 2 ? 0.08 : 0), 0.03, m, g); l.rotation.x = -0.35; }
    for (const k of [-1, 1]) { doos(k * 0.36, 0.58, -0.02, 0.14, 0.03, 0.7, m, g); doos(k * 0.36, 0.28, 0.25, 0.05, 0.56, 0.06, m, g); doos(k * 0.3, 0.2, -0.2, 0.05, 0.4, 0.4, m, g); } return g; }
  function stapelstoel(x, z, rot, kleur, y = null) { const g = new THREE.Group(), m = mat("st" + kleur, { color: kleur, roughness: 0.5 }); zet(g, x, y ?? gy(x, z), z); g.rotation.y = rot;
    doos(0, 0.44, 0, 0.46, 0.05, 0.46, m, g); doos(0, 0.72, -0.22, 0.46, 0.5, 0.04, m, g); for (const a of [-1, 1]) for (const b of [-1, 1]) doos(a * 0.21, 0.22, b * 0.2, 0.04, 0.44, 0.04, m, g); return g; }
  function biezenstoel(x, z, rot, y = null) { const g = new THREE.Group(); zet(g, x, y ?? gy(x, z), z); g.rotation.y = rot; doos(0, 0.45, 0, 0.42, 0.06, 0.4, mat("bies", { color: "#b58d55", roughness: 0.95 }), g);
    for (const a of [-1, 1]) { doos(a * 0.2, 0.22, 0.18, 0.04, 0.45, 0.04, Mwit, g); doos(a * 0.2, 0.5, -0.18, 0.04, 1.0, 0.04, Mwit, g); } for (const y_ of [0.72, 0.86]) doos(0, y_, -0.19, 0.4, 0.06, 0.02, Mwit, g); doos(0, 0.12, 0, 0.4, 0.025, 0.025, Mwit, g); return g; }
  function tafeltje(x, z, kleur, y = null, b = 0.7) { const g = new THREE.Group(), m = mat("taf" + kleur, { color: kleur, roughness: 0.6 }); zet(g, x, y ?? gy(x, z), z); doos(0, 0.7, 0, b, 0.04, b, m, g); for (const a of [-1, 1]) for (const c of [-1, 1]) doos(a * (b / 2 - 0.05), 0.35, c * (b / 2 - 0.05), 0.03, 0.7, 0.03, m, g); return g; }
  function parasol(x, z, kleur, open, y = null) { const g = new THREE.Group(); zet(g, x, y ?? gy(x, z), z); cil(0, 0.07, 0, 0.32, 0.36, 0.14, Mzwart, 18, g); cil(0, 1.25, 0, 0.022, 0.022, 2.5, mat("paal", { color: "#c4c4c4", metalness: 0.5 }), 8, g);
    const m = mat("par" + kleur, { color: kleur, roughness: 0.8, side: THREE.DoubleSide }); if (open) zet(new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.45, 8, 1, true), m), 0, 2.4, 0, g); else zet(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.16, 1.4, 8), m), 0, 1.9, 0, g); return g; }
  function band(x, y, z, rot, ouder = D) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.11, 8, 16), Mband); b.rotation.y = rot; return zet(b, x, y, z, ouder); }
  function emmer(x, y, z, kleur) { const g = new THREE.Group(); zet(g, x, y, z); cil(0, 0.15, 0, 0.15, 0.12, 0.3, mat("em" + kleur, { color: kleur, roughness: 0.5 }), 14, g); return g; }
  function pot(x, z, palm = true) { const g = new THREE.Group(); zet(g, x, gy(x, z), z); cil(0, 0.28, 0, 0.3, 0.2, 0.56, Mterra, 14, g); cil(0, 0.55, 0, 0.31, 0.31, 0.05, Mterra, 14, g);
    const blad = mat("palmblad", { color: "#3f7a32", roughness: 0.8, side: THREE.DoubleSide });
    if (palm) for (let i = 0; i < 9; i++) { const b = new THREE.Mesh(new THREE.PlaneGeometry(0.14, 0.9).translate(0, 0.45, 0), blad); b.rotation.set(0.5 + Math.random() * 0.5, (i / 9) * 6.28, 0, "YXZ"); zet(b, 0, 0.55, 0, g); }
    else for (let i = 0; i < 6; i++) bol(Math.sin(i) * 0.15, 0.75 + (i % 3) * 0.08, Math.cos(i) * 0.15, 0.2, mat("plant", { color: "#4c8a3a" }), g);
    return g; }
  function lig(x, z, rot) { const g = new THREE.Group(), m = mat("lig", { color: "#5c6166", roughness: 0.75 }); zet(g, x, gy(x, z), z); g.rotation.y = rot; doos(0, 0.32, 0.2, 0.65, 0.05, 1.4, m, g); const r = doos(0, 0.52, -0.7, 0.65, 0.05, 0.7, m, g); r.rotation.x = -0.7; for (const a of [-1, 1]) doos(a * 0.3, 0.16, 0, 0.04, 0.32, 1.9, Mzwart, g); return g; }
  function prullenbak(x, y, z) { const g = new THREE.Group(); zet(g, x, y, z); cil(0, 0.38, 0, 0.24, 0.22, 0.76, mat("prul", { color: "#7c8084", metalness: 0.6, roughness: 0.4 }), 16, g); cil(0, 0.78, 0, 0.26, 0.26, 0.05, M.prul, 16, g); return g; }
  function hengelsteun(x, y, z, rot) { const g = new THREE.Group(); zet(g, x, y, z); g.rotation.y = rot; cil(0, 0.6, 0, 0.012, 0.012, 1.2, Mzwart, 6, g); doos(0, 1.2, 0, 0.12, 0.04, 0.04, Mzwart, g);
    const h = cil(0, 1.45, 1.4, 0.008, 0.016, 3.2, mat("hengelstok", { color: "#1e2a24" }), 6, g); h.rotation.x = 1.15; doos(0, 1.08, 0.12, 0.08, 0.08, 0.09, mat("molen", { color: "#2a3f9a", metalness: 0.5 }), g); return g; }

  // tuin bij het huis
  for (const [x, z] of [[4.6, 5], [4.6, 11.8], [17.4, 11.8], [5.2, 4.2]]) pot(x, z, x !== 5.2);
  // aan de huiskant van het bad: metalen stoelen (grijsgroen), witte ronde tafeltjes, donkergrijze ligbedden (zie ref/huis-zwembad-1.jpg)
  function metaalstoel(x, z, rot) { const g = new THREE.Group(), m = mat("metaalstoel", { color: "#93a9a8", roughness: 0.45, metalness: 0.4 }); zet(g, x, gy(x, z), z); g.rotation.y = rot;
    doos(0, 0.44, 0.02, 0.5, 0.03, 0.48, m, g); const r = doos(0, 0.78, -0.24, 0.5, 0.62, 0.03, m, g); r.rotation.x = -0.15; for (const a of [-1, 1]) { const p1 = cil(a * 0.24, 0.42, 0, 0.012, 0.012, 0.9, Mrvs, 6, g); p1.rotation.x = 0.5; const p2 = cil(a * 0.24, 0.42, 0, 0.012, 0.012, 0.9, Mrvs, 6, g); p2.rotation.x = -0.5; } return g; }
  function rondTafeltje(x, z) { const g = new THREE.Group(), w = mat("witmetaal", { color: "#f2f2f0", roughness: 0.4, metalness: 0.3 }); zet(g, x, gy(x, z), z); cil(0, 0.5, 0, 0.26, 0.26, 0.02, w, 20, g); for (let i = 0; i < 3; i++) { const p_ = cil(Math.sin(i * 2.1) * 0.13, 0.25, Math.cos(i * 2.1) * 0.13, 0.012, 0.012, 0.52, w, 6, g); p_.rotation.set(Math.cos(i * 2.1) * 0.45, 0, -Math.sin(i * 2.1) * 0.45); } return g; }
  metaalstoel(14.6, 3.0, Math.PI + 0.3); metaalstoel(16.0, 3.1, Math.PI - 0.2); rondTafeltje(15.3, 2.6); rondTafeltje(20.2, 2.8);
  for (const x of [17.6, 18.9]) lig(x, 3.4, Math.PI + 0.1);
  // grote struiken: voor de schuur (laurier) en aan de voet van de toren
  { const blad = (k) => mat("heester" + k, { color: k, roughness: 0.9, flatShading: true }); for (const [x, z, r, k] of [[21.2, 1.6, 1.7, "#3e5f2c"], [11.3, 0.9, 1.0, "#2f4f27"], [8.7, 0.8, 0.6, "#4b6b36"], [13.8, 0.8, 0.55, "#56763c"]]) for (let i = 0; i < 7; i++) { const b = new THREE.Mesh(new THREE.IcosahedronGeometry(r * (0.55 + (i % 3) * 0.15), 1), blad(k)); zet(b, x + Math.sin(i * 2.4) * r * 0.45, gy(x, z) + r * (0.6 + (i % 2) * 0.45), z + Math.cos(i * 2.4) * r * 0.35); } }
  parasol(-8.4, 1.5, "#b9b2a4", false); kuipstoel(-6.5, 2.4, 0.5, "#2a2c2e"); stapelstoel(-3.2, 2.4, Math.PI * 0.9, "#26282a"); tafeltje(-4.4, 2.2, "#26282a");
  // de picknicktafel op het gras bij de middelste steiger
  { const x = -6.5, z = oeverZ(-6.5) - 6, g = new THREE.Group(), m = mat("picknick", { map: T("planken", 48, 0.8) }); zet(g, x, gy(x, z), z); g.rotation.y = 0.15;
    doos(0, 0.74, 0, 2.0, 0.05, 0.8, m, g); for (const k of [-1, 1]) { doos(0, 0.44, k * 0.7, 2.0, 0.04, 0.28, m, g); for (const a of [-1, 1]) { const p = doos(a * 0.75, 0.37, 0, 0.07, 0.04, 1.7, m, g); p.position.y = 0.36; p.rotation.x = 0; doos(a * 0.75, 0.37, k * 0.35, 0.07, 0.74, 0.07, m, g); } } }
  // hortensia's en struiken langs de gevel
  { const roze = mat("hort", { color: "#e7a2b8", roughness: 0.9 }), groen = mat("struik", { color: "#3d6b30", roughness: 0.9 });
    for (const [x, z, r] of [[-14, 0.8, 0.9], [-11, 0.9, 0.7], [9.6, 0.7, 0.6], [16, 0.6, 0.8], [26, 0, 0.8], [-15.5, -4, 1.1]]) { bol(x, gy(x, z) + r * 0.6, z, r, groen); for (let i = 0; i < 6; i++) bol(x + Math.sin(i * 2.4) * r * 0.7, gy(x, z) + r * (0.9 + (i % 2) * 0.3), z + Math.cos(i * 2.4) * r * 0.7, 0.18, roze); } }

  // ---------- de steigers ----------
  const DEK = 0.42; // hoogte van het dek boven het water
  const steigers = [];
  /** Een steiger: dekstukken [cx, cz, bx, bz, draai] (lokaal), banden aan de waterkant, palen, en een stenen trap het talud op. */
  function steiger(naam, x, delen, { hout, trap = null }) { const z0 = oeverZ(x), g = new THREE.Group(); zet(g, x, 0, z0); const stukken = [];
    for (const [cx, cz, bx, bz, r = 0] of delen) { const s = new THREE.Group(); s.position.set(cx, 0, cz); s.rotation.y = r; g.add(s);
      doos(0, DEK, 0, bx, 0.07, bz, hout, s).receiveShadow = true; doos(0, DEK - 0.12, bz / 2 - 0.04, bx, 0.18, 0.08, hout, s); doos(-bx / 2 + 0.04, DEK - 0.12, 0, 0.08, 0.18, bz, hout, s); doos(bx / 2 - 0.04, DEK - 0.12, 0, 0.08, 0.18, bz, hout, s);
      for (let i = 0; i <= Math.ceil(bx / 2); i++) for (const k of [-1, 1]) cil(-bx / 2 + 0.1 + i * ((bx - 0.2) / Math.ceil(bx / 2)), DEK - 1.3, k * (bz / 2 - 0.1), 0.08, 0.08, 2.6, mat("paal", { color: "#3e3226" }), 8, s);
      stukken.push(s); }
    if (trap) { const [tx_, n] = trap, st = mat("traptree", { map: T("steen") }), achter = Math.min(...delen.map((d) => d[1] - d[3] / 2)), yTop = gy(x + tx_, z0 + achter - n * 0.42) + 0.04;
      for (let i = 0; i < n; i++) { const top = DEK + ((yTop - DEK) * (i + 1)) / n; doos(tx_, (top - 0.4) / 2, achter - 0.21 - i * 0.42, 1.3, top + 0.4, 0.44, st, g); } }
    g.updateMatrixWorld(true); const inv = stukken.map((s) => ({ s, b: s.children[0].geometry.parameters }));
    const st_ = { naam, x, z0, groep: g, dek: DEK, stukken,
      /** Lokaal punt (in domein-assen) op dit dek? */
      op(px, pz) { for (const { s, b } of inv) { const l = s.worldToLocal(wereld(px, 0, pz)); if (Math.abs(l.x) < b.width / 2 + 0.05 && Math.abs(l.z) < b.depth / 2 + 0.05) return true; } return false; },
      punt(lx, lz) { return V(x + lx, DEK, z0 + lz); } };
    steigers.push(st_); return st_; }

  // de linker steiger, bij de toren: laag en lang langs de oever, stenen trap omhoog, zwarte stoeltjes, rode parasol, de groene boot ligt ervoor
  const houtL = mat("houtL", { map: T("planken", 58, 0.35) }), houtM = mat("houtM", { map: T("planken", 64, 0.15) }), houtR = mat("houtR", { map: T("planken", 34, 0.6) });
  const SL = steiger("links", 16.5, [[0, 0.5, 7.6, 1.9]], { hout: houtL, trap: [0.4, 4] });
  { const y = DEK, g = SL.groep; band(-3.2, y - 0.25, 1.48, 0, g); band(2.6, y - 0.25, 1.48, 0, g);
    stapelstoel(SL.x - 2.6, SL.z0 + 0.6, 0.3, "#26282a", y); stapelstoel(SL.x - 1.5, SL.z0 + 0.6, -0.2, "#26282a", y); tafeltje(SL.x - 2.05, SL.z0 + 0.15, "#26282a", y, 0.5); parasol(SL.x + 1.4, SL.z0 + 0.6, "#e0573a", false, y);
    // RVS-trapje aan het westeinde
    for (const k of [-1, 1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 14, Math.PI), Mrvs); b.rotation.y = Math.PI / 2; zet(b, 3.4 + k * 0.22, y + 0.05, 1.3, g); cil(3.4 + k * 0.22, y - 0.6, 1.62, 0.02, 0.02, 1.3, Mrvs, 6, g); } }
  // de middelste steiger: twee delen in een hoek, trapje links, drie grijze kuipstoelen, band met parasolvoet, emmers, prullenbak, hengels
  const SM = steiger("midden", -1.7, [[0, 0.95, 8.6, 2.9]], { hout: houtM, trap: [-1.2, 4] }); // één recht dek, een paar planken breder (Bobs foto 28-11)
  { const y = DEK, g = SM.groep, P = (lx, lz) => [SM.x + lx, SM.z0 + lz];
    band(-3.4, y - 0.25, 2.4, 0, g); band(0.4, y - 0.25, 2.4, 0, g);
    for (const [lx, lz, r] of [[1.2, 0.7, 0.5], [2.3, 1.1, 0.1], [-2.6, 0.3, -0.3]]) kuipstoel(...P(lx, lz), r, "#8e9a9b", y);
    band(-0.6, y + 0.11, 0.3, 0, g).rotation.x = Math.PI / 2; parasol(...[SM.x - 0.6, SM.z0 + 0.3], "#c8c2b4", false, y);
    emmer(SM.x + 2.6, y, SM.z0 + 1.7, "#e9e9e4"); emmer(SM.x - 1.6, y, SM.z0 + 1.1, "#5a5f63"); doos(-1.7, y + 0.15, 1.15, 0.35, 0.3, 0.3, mat("krukje", { color: "#4d5258" }), g); doos(-2.6, y + 0.12, 1.3, 0.55, 0.24, 0.38, mat("aasbak", { color: "#dfe7c8", transparent: true, opacity: 0.85 }), g);
    prullenbak(SM.x - 4.0, y, SM.z0 + 0.2);
    for (const [lx, r] of [[3.9, 0.2], [-3.9, -0.15], [-4.15, 0.25]]) hengelsteun(SM.x + lx, y, SM.z0 + 2.1, r);
    // trapje aan de linkerkant van het schuine deel
    for (const k of [-1, 1]) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.025, 6, 14, Math.PI), Mrvs); b.rotation.y = Math.PI / 2; zet(b, 3.6 + k * 0.22, y + 0.05, 2.25, g); cil(3.6 + k * 0.22, y - 0.6, 2.45, 0.02, 0.02, 1.3, Mrvs, 6, g); } }
  // de rechter steiger: donker hout onder hoge bomen, drie banden, oranje vlaggetjes, turquoise en witte stoelen
  const SR = steiger("rechts", -21, [[0, 0.8, 7.8, 2.6]], { hout: houtR, trap: null });
  { const y = DEK, g = SR.groep; for (const lx of [-3.4, -0.2, 3.2]) band(lx, y - 0.22, 2.15, 0, g);
    adirondack(SR.x - 1.8, SR.z0 + 0.8, Math.PI * 0.95, "#45d1c6", y); adirondack(SR.x + 2.0, SR.z0 + 0.8, Math.PI * 1.05, "#45d1c6", y); biezenstoel(SR.x - 0.3, SR.z0 + 0.3, Math.PI, y); biezenstoel(SR.x + 0.9, SR.z0 + 0.2, Math.PI * 0.8, y); tafeltje(SR.x + 0.3, SR.z0 + 0.9, "#c9c9c9", y, 0.6);
    // de vlaggetjeslijn langs de oever naar het oosten
    const vl = mat("vlag", { color: "#ff6a1f", side: THREE.DoubleSide }); const a = V(-3.9, y + 0.2, 1.9), b = V(-11, 0.5, 1.2);
    for (let i = 0; i <= 14; i++) { const f = i / 14, p = a.clone().lerp(b, f); p.y -= Math.sin(f * Math.PI) * 0.25; const v = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([V(-0.12, 0, 0), V(0.12, 0, 0), V(0, -0.2, 0)]), vl); v.geometry.computeVertexNormals(); zet(v, p.x, p.y, p.z, g); } }

  // ---------- de groene boot: polyester roeiboot met elektromotor, aan de linker steiger ----------
  const boot = maakGroeneBoot(mat, cil, doos, zet);
  boot.position.set(SL.x - 0.6, 0.02, SL.z0 + 2.4); boot.rotation.y = Math.PI / 2 + 0.06; D.add(boot);

  // ---------- bomen: populieren achter het huis, grote bomen in het oosten en rond de rechter steiger (echte modellen: src/natuur.js) ----------
  const bomen = [];
  { const boom = (x, z, h, soort) => { const p = wereld(x, 0, z); bomen.push({ x: p.x, z: p.z, y: gy(x, z), h, soort }); };
    for (let x = -34; x <= 36; x += 3.0) boom(x + Math.sin(x) * 0.6, -27 + Math.cos(x) * 1.2, 21 + ruis(x, 1) * 5, "populier");
    // struiken langs de oever tussen de steigers (de stekken), zoals op Bobs foto's en video
    for (const [a, b] of [[-38, -25.5], [-16.5, -6.5], [3, 12.5], [21, 34]]) for (let x = a; x < b; x += 1.6 + ruis(x, 3) * 1.4) { const z = oeverZ(x) - 1.1 - ruis(x, 7) * 1.6; boom(x, z, 2.2 + ruis(x, 9) * 2.4, "struik"); }
    for (const [x, z, h, soort] of [[-17, 4, 13, "esdoorn"], [-24, 9, 15, "esdoorn"], [-30, 3, 15, "esdoorn"], [-27, 16, 10, "wilg"], [-17, 13, 9, "wilg"], [-35, 12, 14, "esdoorn"], [-22, -8, 13, "esdoorn"], [33, 6, 12, "esdoorn"], [36, -6, 14, "esdoorn"], [-14, -20, 12, "esdoorn"], [24, -18, 11, "esdoorn"], [29, 15, 9, "wilg"], [-40, 18, 10, "wilg"]]) boom(x, Math.min(z, oeverZ(x) - 2.5), h, soort); }

  // ---------- de wereld laten weten wat waar is ----------
  D.updateMatrixWorld(true);
  const tw = (p) => p.clone().applyMatrix4(toren.matrixWorld);
  const huis = { groep: toren, pos: toren.getWorldPosition(V(0, 0, 0)), yaw, u, t, naarBinnen: (p) => toren.worldToLocal(p.clone()), uit: (x, y, z) => tw(V(x, y, z)), raam: tw(V(RAAM.x, RAAM.y, TB / 2)), bed: tw(V(BED.x, BED.y + 0.58, BED.z)), vloerY: tw(V(0, HV + 0.1, 0)).y, RAAM, BX: TB, BZ: TB, HT: TH };
  const opSteiger = (x, z) => { const l = lokaal(V(x, 0, z)); for (const s of steigers) if (Math.abs(l.x - s.x) < 7 && s.op(l.x, l.z)) return DEK; return null; };
  const inGebouw = (x, z, marge = 0.4) => { const l = lokaal(V(x, 0, z)); for (const [x0, z0, x1, z1] of blokken) if (l.x > x0 - marge && l.x < x1 + marge && l.z > z0 - marge && l.z < z1 + marge) return true; return false; };
  const wSt = (s, lx, lz) => wereld(s.x + lx, DEK, s.z0 + lz);
  // voor de missies: de middelste steiger is "de" steiger (van de kant naar het water)
  const steigerInfo = { groep: SM.groep, begin: wSt(SM, 0, -0.4), eind: wSt(SM, 0, 1.6), midden: wSt(SM, 0, 0.6), dek: DEK, breed: 2.2, lengte: 2.0 };
  return { groep: D, wereld, lokaal, gy, oeverZ, huis, dozen, steigers, steiger: steigerInfo, opSteiger, inGebouw, bomen, boot, zwembad: { ...ZB, y: yZ },
    oeverPunt: wereld(-1.7, 0, SM.z0), tuin: wereld(-3, gy(-3, 6), 6.5), lawn: { x0: -16, x1: 20, z0: 1.5 }, t, u, yaw };
}

/** De groene polyester roeiboot (± 3,6 m) met houten zitbanken, beugels en een elektrische buitenboordmotor met helmstok. */
function maakGroeneBoot(mat, cil, doos, zet) {
  const g = new THREE.Group(), L = 3.6, B = 1.35, H = 0.55, NS = 22, NT = 12;
  // de romp als raster: s langs de boot (0 = spiegel, 1 = boeg), a rond de doorsnede
  const pos = [], idx = [];
  const breed = (s) => (s < 0.62 ? 1 - 0.08 * (0.62 - s) : Math.sqrt(Math.max(0, 1 - ((s - 0.62) / 0.38) ** 2)) * 0.92 + 0.08 * (1 - (s - 0.62) / 0.38)) * B / 2;
  const sheer = (s) => H + (s > 0.7 ? ((s - 0.7) / 0.3) ** 2 * 0.18 : 0);
  for (let i = 0; i <= NS; i++) { const s = i / NS, w = breed(s), top = sheer(s), bodem = 0.02 + (s > 0.75 ? ((s - 0.75) / 0.25) ** 1.5 * 0.35 : 0);
    for (let j = 0; j <= NT; j++) { const a = (j / NT) * Math.PI, c = Math.cos(a), sn = Math.sin(a); const x = Math.sign(c) * Math.abs(c) ** 0.55 * w, y = top - (top - bodem) * sn ** 0.35; pos.push(x, y, (s - 0.5) * L); } }
  for (let i = 0; i < NS; i++) for (let j = 0; j < NT; j++) { const a = i * (NT + 1) + j, b = a + NT + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
  const groen = mat("bootgroen", { color: "#2b7466", roughness: 0.45, side: THREE.DoubleSide }); const romp = new THREE.Mesh(geo, groen); romp.position.y = -0.18; romp.castShadow = true; g.add(romp);
  // de spiegel (achterkant) dicht
  { const sh = new THREE.Shape(), w = breed(0); for (let j = 0; j <= NT; j++) { const a = (j / NT) * Math.PI, c = Math.cos(a), sn = Math.sin(a), x = Math.sign(c) * Math.abs(c) ** 0.55 * w, y = H - (H - 0.02) * sn ** 0.35; if (j) sh.lineTo(x, y); else sh.moveTo(x, y); }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), groen); m.position.set(0, -0.18, -L / 2); g.add(m); }
  // het dolboord: een lichtere rand
  { const pts = []; for (let i = 0; i <= NS; i++) { const s = i / NS; pts.push(new THREE.Vector3(breed(s), sheer(s) - 0.18, (s - 0.5) * L)); } for (let i = NS; i >= 0; i--) { const s = i / NS; pts.push(new THREE.Vector3(-breed(s), sheer(s) - 0.18, (s - 0.5) * L)); }
    const rand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 80, 0.035, 6, true), mat("bootrand", { color: "#3a8a7a", roughness: 0.5 })); g.add(rand); }
  // zitbanken van hout en de beugels op de zijkant
  const bank = mat("bank", { color: "#b48a5a", roughness: 0.8 }); for (const [z, b] of [[-1.35, 1.15], [0.05, 1.25], [0.95, 1.05]]) doos(0, 0.2, z, b, 0.05, 0.28, bank, g);
  const ring = mat("ring", { color: "#c8ccd0", metalness: 0.8, roughness: 0.3 }); for (const z of [-0.6, 0.5]) for (const k of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.012, 6, 12, Math.PI), ring); r.rotation.set(0, Math.PI / 2, Math.PI); zet(r, k * (breed(0.5 + z / 3.6) + 0.02), 0.22, z, g); }
  // de motor: accu-bak, kop met helmstok, schacht het water in
  const mz = -L / 2 - 0.05; doos(0, 0.45, mz - 0.05, 0.16, 0.22, 0.12, mat("motorkop", { color: "#1d1f22", roughness: 0.4 }), g); const helm = doos(0, 0.5, mz + 0.4, 0.05, 0.05, 0.75, mat("motorkop"), g); helm.rotation.x = -0.15;
  cil(0, -0.05, mz - 0.08, 0.025, 0.025, 1.0, mat("motorkop"), 8, g); cil(0, -0.55, mz - 0.08, 0.06, 0.06, 0.3, mat("motorkop"), 10, g).rotation.x = Math.PI / 2; doos(0, 0.08, -1.45, 0.32, 0.22, 0.2, mat("accu", { color: "#26292d" }), g);
  g.userData = { lengte: L, breed: B };
  return g;
}
