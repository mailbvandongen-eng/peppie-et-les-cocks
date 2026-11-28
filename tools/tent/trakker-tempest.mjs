// node tools/tent/trakker-tempest.mjs — bouwt assets/kamperen/trakker-tempest.glb: de Trakker Tempest RS Brolly (Full System),
// nagebouwd naar de productfoto's (hengelsportvught.nl) en de maten van Trakker: buiten 255 cm breed, 215 cm diep, 145 cm hoog.
// Een paraplu-shelter: bovenop de voorkant zit het scharnierblok ("Rapid Knuckle"), vijf stokken lopen in een boog naar de grond
// (twee langs de voorkant, twee schuin naar achteren, één recht naar achteren). Daartussen vier panelen doek met elk een gaasraam,
// en een los voorpaneel (node "voorpaneel", in het spel weg te laten voor een open voorkant).
// Doek: "Fabric082A" van ambientCG (CC0), olijfgroen getint (kleur gemeten op de foto's). Geen andere afhankelijkheden: schrijft zelf .glb.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path"; import { fileURLToPath } from "node:url";
const HIER = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HIER, "../..");
const UIT = path.join(ROOT, "assets/kamperen/trakker-tempest.glb");

const H = 1.45, B = 1.275, D = 2.15;           // hoogte, halve breedte, diepte (m)
const NAAF = [0, H, 0];                        // het scharnierblok, bovenop het midden van de voorkant
const HOEKEN = [0, 42, 90, 138, 180].map((g) => (g * Math.PI) / 180); // de vijf stokken, gezien van boven
// grondplan: een afgeronde rechthoek (superellips), zodat de achterhoeken ver naar buiten staan zoals op de foto's
const se = (x, e) => Math.sign(x) * Math.pow(Math.abs(x), e);
const voet = (a) => [B * se(Math.cos(a), 0.6), 0, -D * se(Math.sin(a), 0.6)];
// een stok: van de naaf in een bolle boog naar de grond (langs de voorkant: vlak dak en steile zijkanten; naar achteren: een dak dat geleidelijk afloopt, zoals op de foto's)
const stok = (a, t) => { const v = voet(a), k = Math.abs(Math.sin(a)), s = Math.pow(Math.sin((t * Math.PI) / 2), 0.62 + 0.12 * k), c = Math.pow(Math.cos((t * Math.PI) / 2), 0.62 + 0.45 * k);
  return [NAAF[0] + v[0] * s, H * c, NAAF[2] + v[2] * s]; };
const lerp = (p, q, k) => p.map((x, i) => x + (q[i] - x) * k);
const sub = (p, q) => p.map((x, i) => x - q[i]), len = (p) => Math.hypot(...p);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (p) => { const l = len(p) || 1; return p.map((x) => x / l); };

// ---------- geometrie-bouwer ----------
function mesh() { return { p: [], n: [], uv: [], idx: [] }; }
function raster(m, f, NU, NV, tegel = 0.5) { // f(u, v) → punt; maakt een raster met normalen en uv's (doek herhaalt elke `tegel` m)
  const start = m.p.length / 3, P = [];
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) P.push(f(i / NU, j / NV));
  const breed = (j) => { let s = 0; for (let i = 1; i <= NU; i++) s += len(sub(P[j * (NU + 1) + i], P[j * (NU + 1) + i - 1])); return s; };
  const hoog = (i) => { let s = 0; for (let j = 1; j <= NV; j++) s += len(sub(P[j * (NU + 1) + i], P[(j - 1) * (NU + 1) + i])); return s; };
  const Bm = breed(Math.round(NV / 2)), Hm = hoog(Math.round(NU / 2));
  for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
    const k = j * (NU + 1) + i, du = sub(P[j * (NU + 1) + Math.min(i + 1, NU)], P[j * (NU + 1) + Math.max(i - 1, 0)]), dv = sub(P[Math.min(j + 1, NV) * (NU + 1) + i], P[Math.max(j - 1, 0) * (NU + 1) + i]);
    m.p.push(...P[k]); m.n.push(...norm(cross(dv, du))); m.uv.push(((i / NU) * Bm) / tegel, ((j / NV) * Hm) / tegel);
  }
  for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = start + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; m.idx.push(a, c, b, b, c, d); }
}
function buis(m, punten, r, zijden = 8) { // een buis langs een reeks punten
  const start = m.p.length / 3;
  punten.forEach((p, k) => { const vooruit = norm(sub(punten[Math.min(k + 1, punten.length - 1)], punten[Math.max(k - 1, 0)]));
    const a = norm(cross(vooruit, Math.abs(vooruit[1]) > 0.9 ? [1, 0, 0] : [0, 1, 0])), b = cross(vooruit, a);
    for (let z = 0; z <= zijden; z++) { const h = (z / zijden) * Math.PI * 2, d = a.map((x, i) => x * Math.cos(h) + b[i] * Math.sin(h));
      m.p.push(...p.map((x, i) => x + d[i] * r)); m.n.push(...d); m.uv.push(z / zijden, k / punten.length); } });
  for (let k = 0; k < punten.length - 1; k++) for (let z = 0; z < zijden; z++) { const a = start + k * (zijden + 1) + z, c = a + zijden + 1; m.idx.push(a, a + 1, c, a + 1, c + 1, c); }
}
function doos(m, mid, [bx, by, bz]) { const s = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
  for (const n of s) { const st = m.p.length / 3, a = n[0] ? [0, 1, 0] : [1, 0, 0], b = cross(n, a);
    for (const [u, v] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { m.p.push(...[0, 1, 2].map((i) => mid[i] + (n[i] + a[i] * u + b[i] * v) * [bx, by, bz][i] / 2)); m.n.push(...n); m.uv.push((u + 1) / 2, (v + 1) / 2); }
    m.idx.push(st, st + 1, st + 2, st, st + 2, st + 3); } }

// ---------- de tent ----------
const doek = mesh(), gaas = mesh(), voor = mesh(), rits = mesh(), stokken = mesh(), zwart = mesh();
const T = 28, V = 14, BOL = 0.035, NAAD = 0.012;
// een punt op een paneel tussen stok i en i+1: rechte lijn tussen de stokken, iets ingezakt naar binnen in het midden
const paneel = (i, u, t) => { const p = lerp(stok(HOEKEN[i], t), stok(HOEKEN[i + 1], t), u), z = Math.sin(Math.PI * u) * Math.sin(Math.PI * Math.min(1, t * 1.2)) * BOL;
  const r = norm([p[0] - NAAF[0], 0, p[2] - NAAF[2]]); return [p[0] - r[0] * z, p[1] - z * 0.4, p[2] - r[2] * z]; };
for (let i = 0; i < 4; i++) {
  raster(doek, (u, t) => paneel(i, u, t), V, T);
  // gaasraam: groot op de twee achterpanelen, kleiner op de zijpanelen; net buiten het doek
  const [u0, u1, t0, t1] = i === 1 || i === 2 ? [0.1, 0.9, 0.5, 0.86] : [0.16, 0.84, 0.52, 0.86];
  raster(gaas, (u, t) => { const uu = u0 + (u1 - u0) * u, tt = t0 + (t1 - t0) * t, p = paneel(i, uu, tt), q = paneel(i, Math.min(uu + 0.01, 1), tt), w = paneel(i, uu, Math.min(tt + 0.01, 1));
    let n = norm(cross(sub(w, p), sub(q, p))); if (n[0] * p[0] + n[2] * p[2] < 0) n = n.map((x) => -x); return p.map((x, k) => x + n[k] * 0.006); }, 6, 6, 0.3);
}
// voorpaneel: plat in het vlak van de voorkant, tussen de twee voorste stokken
raster(voor, (u, t) => { const l = stok(HOEKEN[4], t), r = stok(HOEKEN[0], t); return [l[0] + (r[0] - l[0]) * u, l[1], -0.01]; }, 16, T);
// stokken (net buiten het doek), met zwarte punten in de grond, en de naad onderaan
for (const a of HOEKEN) { const pts = []; for (let k = 0; k <= 40; k++) { const t = k / 40, p = stok(a, t), r = norm([p[0], 0, p[2]]); pts.push([p[0] + r[0] * NAAD, p[1] + NAAD * 0.6, p[2] + r[2] * NAAD]); }
  buis(stokken, pts, 0.0085); const v = voet(a), r = norm([v[0], 0, v[2] || -1e-3]); buis(zwart, [[v[0] + r[0] * NAAD, 0.05, v[2] + r[2] * NAAD], [v[0] + r[0] * 0.03, -0.12, v[2] + r[2] * 0.03]], 0.006, 6); }
// ritsen van de deur in het voorpaneel (zoals op de foto van de voorkant)
for (const x of [-0.42, 0.42]) buis(rits, [[x, 0.02, 0.004], [x, 1.22, 0.004]], 0.004, 5);
buis(rits, [[-0.42, 1.22, 0.004], [0.42, 1.22, 0.004]], 0.004, 5);
// het scharnierblok bovenop, met de korte stang naar voren
doos(zwart, [0, H + 0.035, -0.02], [0.2, 0.07, 0.12]); buis(zwart, [[0, H + 0.07, -0.02], [0, H + 0.08, 0.3]], 0.011, 8); doos(zwart, [0, H + 0.08, 0.3], [0.05, 0.04, 0.05]);
// haringen in het midden van elk paneel onderaan, met een lusje
for (let i = 0; i < 4; i++) { const p = paneel(i, 0.5, 1); buis(zwart, [[p[0], 0.02, p[2]], [p[0], -0.1, p[2]]], 0.004, 5); }

// ---------- .glb schrijven ----------
const delen = [], views = [], accs = [], bin = [];
let off = 0; const add = (buf, target) => { const pad = (4 - (buf.length % 4)) % 4; bin.push(buf, Buffer.alloc(pad)); views.push({ buffer: 0, byteOffset: off, byteLength: buf.length, ...(target ? { target } : {}) }); off += buf.length + pad; return views.length - 1; };
const acc = (arr, type, comp, target, minmax) => { const buf = Buffer.from(comp === 5126 ? new Float32Array(arr).buffer : new Uint32Array(arr).buffer);
  const a = { bufferView: add(buf, target), componentType: comp, count: arr.length / { VEC3: 3, VEC2: 2, SCALAR: 1 }[type], type };
  if (minmax) { a.min = [0, 1, 2].map((i) => Math.min(...arr.filter((_, k) => k % 3 === i))); a.max = [0, 1, 2].map((i) => Math.max(...arr.filter((_, k) => k % 3 === i))); }
  accs.push(a); return accs.length - 1; };
const prim = (m, material) => ({ attributes: { POSITION: acc(m.p, "VEC3", 5126, 34962, true), NORMAL: acc(m.n, "VEC3", 5126, 34962), TEXCOORD_0: acc(m.uv, "VEC2", 5126, 34962) }, indices: acc(m.idx, "SCALAR", 5125, 34963), material });
const img = (f) => ({ bufferView: add(readFileSync(path.join(HIER, "stof", f))), mimeType: "image/jpeg" });
const images = [img("kleur.jpg"), img("normaal.jpg")];
const materials = [
  { name: "doek", doubleSided: true, pbrMetallicRoughness: { baseColorTexture: { index: 0 }, baseColorFactor: [0.34, 0.3, 0.18, 1], metallicFactor: 0, roughnessFactor: 0.82 }, normalTexture: { index: 1, scale: 0.6 } },
  { name: "gaas", doubleSided: true, pbrMetallicRoughness: { baseColorFactor: [0.06, 0.064, 0.055, 1], metallicFactor: 0, roughnessFactor: 0.9 } },
  { name: "stok", pbrMetallicRoughness: { baseColorFactor: [0.11, 0.115, 0.095, 1], metallicFactor: 0.2, roughnessFactor: 0.55 } },
  { name: "zwart", pbrMetallicRoughness: { baseColorFactor: [0.03, 0.03, 0.03, 1], metallicFactor: 0.1, roughnessFactor: 0.6 } },
];
const meshes = [
  { name: "shelter", primitives: [prim(doek, 0), prim(gaas, 1), prim(stokken, 2), prim(zwart, 3)] },
  { name: "voorpaneel", primitives: [prim(voor, 0), prim(rits, 3)] },
];
const json = { asset: { version: "2.0", generator: "tools/tent/trakker-tempest.mjs", extras: { titel: "Trakker Tempest RS Brolly (Full System)", bron: "Zelf gebouwd naar de productfoto's; doek: Fabric082A, ambientCG (CC0)" } },
  scene: 0, scenes: [{ name: "trakker-tempest", nodes: [0] }], nodes: [{ name: "trakker-tempest", children: [1, 2] }, { name: "shelter", mesh: 0 }, { name: "voorpaneel", mesh: 1 }],
  meshes, materials: materials, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }],
  textures: [{ source: 0, sampler: 0 }, { source: 1, sampler: 0 }], images, accessors: accs, bufferViews: views, buffers: [{ byteLength: off }] };
const J = Buffer.from(JSON.stringify(json)), Jp = Buffer.concat([J, Buffer.alloc((4 - (J.length % 4)) % 4, 0x20)]), BIN = Buffer.concat(bin);
const kop = Buffer.alloc(12); kop.writeUInt32LE(0x46546c67, 0); kop.writeUInt32LE(2, 4); kop.writeUInt32LE(12 + 8 + Jp.length + 8 + BIN.length, 8);
const ck = (b, t) => { const h = Buffer.alloc(8); h.writeUInt32LE(b.length, 0); h.writeUInt32LE(t, 4); return h; };
mkdirSync(path.dirname(UIT), { recursive: true }); writeFileSync(UIT, Buffer.concat([kop, ck(Jp, 0x4e4f534a), Jp, ck(BIN, 0x004e4942), BIN]));
const tri = meshes.flatMap((m) => m.primitives).reduce((s, p) => s + accs[p.indices].count / 3, 0);
console.log(`${path.relative(ROOT, UIT)}: ${tri} driehoeken, ${(off / 1024).toFixed(0)} kB`);
