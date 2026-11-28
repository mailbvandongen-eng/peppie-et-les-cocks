// De wereld: de Lot (170 m breed) met oevers, bos en heggen, de huizen van het dorp, en het huis aan de oever met steiger.
// Alles komt uit data/lot.json (IGN BD TOPO); de bodem van de rivier is een hoogteveld, zodat de livescope echte dieptes ziet.
import * as THREE from "three";
import { bouwDomein } from "./domein.js";
import { grondMat, natUit } from "./grond.js";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const zacht = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
function ruis(x, z) { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); }
function golf(x, z) { return Math.sin(x * 0.043 + 1.3) * Math.cos(z * 0.037 - 0.4) * 0.6 + Math.sin(x * 0.11 + z * 0.09) * 0.4; }

export function bouwWereld(d, scene) {
  const W = { botsers: [] };
  const ring = d.water[0].r;
  const inRing = (x, z, r) => { let c = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const a = r[i], b = r[j]; if ((a[1] > z) !== (b[1] > z) && x < ((b[0] - a[0]) * (z - a[1])) / (b[1] - a[1]) + a[0]) c = !c; } return c; };
  // alleen de stukken oever in de buurt tellen mee voor de afstand
  const stukken = []; for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; if (Math.min(Math.hypot(a[0], a[1]), Math.hypot(b[0], b[1])) < 900) stukken.push([a[0], a[1], b[0] - a[0], b[1] - a[1]]); }
  /** Afstand tot de oever: positief in het water, negatief op het land. */
  const totOever = (x, z) => { let m = 1e9; for (const [ax, az, dx, dz] of stukken) { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))), q = (x - ax - dx * t) ** 2 + (z - az - dz * t) ** 2; if (q < m) m = q; } return Math.sqrt(m) * (inRing(x, z, ring) ? 1 : -1); };
  /** Ligt de dichtstbijzijnde oever aan onze kant (de kant van het huis, zuid)? */
  const UHUIS = [0.299, -0.954];
  const onzeKant = (x, z) => { let m = 1e9, bx = 0, bz = 0; for (const [ax, az, dx, dz] of stukken) { const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz || 1))), px = ax + dx * t, pz = az + dz * t, q = (x - px) ** 2 + (z - pz) ** 2; if (q < m) { m = q; bx = px; bz = pz; } } return (bx - x) * UHUIS[0] + (bz - z) * UHUIS[1] < 0; };
  // de Lot is een badkuip: aan onze kant snel steil naar beneden, dan bijna overal 10 meter; aan de overkant loopt het
  // langzaam op, met waterplanten in het ondiepe. Hier en daar een kuil van een paar meter extra (daar liggen de reuzen).
  // kuilen: hier en daar een uitschieter tot ± 14 m (daar liggen de reuzen)
  W.kolken = [[-55, -95, 18, 2.6], [95, -120, 22, 3.2], [-150, -60, 16, 2.4], [170, -70, 18, 2.8], [30, -150, 14, 2.2]];
  const hoogteUit = (x, z, s) => {
    if (s <= 0) return 0.85 * zacht(0, 7, -s) + 0.25 * zacht(20, 120, -s) * (0.5 + golf(x, z) * 0.5) + 0.05; // land: een oeverwal en dan zacht glooiend
    const ons = onzeKant(x, z), glooi = Math.sin(x * 0.021 + 0.7) * Math.cos(z * 0.017 - 1.1) * 0.6 + Math.sin(x * 0.047 - z * 0.039 + 2) * 0.4, vlak = 10 + glooi * 2.1 + (ruis(Math.round(x / 9), Math.round(z / 9)) - 0.5) * 0.3; // tussen 8 en 12 m
    let h = -(0.3 + (vlak - 0.3) * (ons ? zacht(0, 7, s) ** 0.7 : zacht(0, 45, s) ** 1.3)) - ruis(Math.round(x / 4), Math.round(z / 4)) * 0.15;
    for (const [kx, kz, kr, kd] of W.kolken) h -= kd * zacht(kr, 0, Math.hypot(x - kx, z - kz));
    return Math.min(-0.25, h);
  };
  W.onzeKant = onzeKant;
  // het hoogteveld
  const MAAT = 1080, N = 360, CEL = MAAT / N, H = new Float32Array((N + 1) * (N + 1)), S = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = -MAAT / 2 + i * CEL, z = -MAAT / 2 + j * CEL, s = totOever(x, z); S[j * (N + 1) + i] = s; H[j * (N + 1) + i] = hoogteUit(x, z, s); }
  const lees = (A, x, z) => { const fx = Math.min(N - 0.001, Math.max(0, (x + MAAT / 2) / CEL)), fz = Math.min(N - 0.001, Math.max(0, (z + MAAT / 2) / CEL)), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * (N + 1) + i; return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + N + 1] * (1 - u) * v + A[k + N + 2] * u * v; };
  W.hoogte = (x, z) => lees(H, x, z);
  W.oever = (x, z) => lees(S, x, z); // > 0 = in het water
  W.inWater = (x, z) => lees(S, x, z) > 0;
  // structuur onder water: oude muren (van een kade of een verdwenen molen) die van de bodem tot een paar meter onder het oppervlak
  // staan, en takken van omgevallen bomen waar het ondieper wordt. De muren tellen mee als bodem (de livescope ziet ze als een blok).
  W.muren = []; W.takken = [];
  const opMuur = (x, z) => { let d = Infinity; for (const m of W.muren) { const dx = m.b[0] - m.a[0], dz = m.b[1] - m.a[1], L = dx * dx + dz * dz, t_ = Math.max(0, Math.min(1, ((x - m.a[0]) * dx + (z - m.a[1]) * dz) / L)), q = Math.hypot(x - m.a[0] - dx * t_, z - m.a[1] - dz * t_); if (q < m.dik / 2) d = Math.min(d, m.top + (t_ < 0.08 || t_ > 0.92 ? 0.8 : 0)); } return d; };
  W.diepte = (x, z) => Math.min(Math.max(0, -lees(H, x, z)), opMuur(x, z));
  W.bodemZonderMuur = (x, z) => Math.max(0, -lees(H, x, z));
  { const g = new THREE.PlaneGeometry(MAAT, MAAT, N, N).rotateX(-Math.PI / 2), p = g.attributes.position, kleur = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let k = 0; k < p.count; k++) { const h = H[k], s = S[k]; p.setY(k, h);
      if (s > 0) c.set("#5b5a44").lerp(new THREE.Color("#2a3328"), zacht(0, 5, -h)); else if (s > -1.2) c.set("#6d6a48"); else c.set("#6f9a4a").lerp(new THREE.Color("#8aa856"), ruis(Math.round(p.getX(k) / 9), Math.round(p.getZ(k) / 9)));
      kleur.set([c.r, c.g, c.b], k * 3); }
    g.setAttribute("color", new THREE.BufferAttribute(kleur, 3)); g.setAttribute("nat", new THREE.BufferAttribute(Float32Array.from(S, natUit), 1)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, null); m.receiveShadow = true; scene.add(m); W.grond = m; }
  // het water: groenbruin en een beetje doorzichtig, zoals de Lot in de zomer
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(MAAT, MAAT).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#4d6f5e", roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.86 })); m.position.y = 0; scene.add(m); W.water = m; }

  // ---------- het huis aan de oever met tuin, zwembad en drie steigers (src/domein.js) ----------
  const dom = bouwDomein(W, scene); W.domein = dom;
  Object.assign(W, { huis: dom.huis, dozen: dom.dozen, steiger: dom.steiger, steigers: dom.steigers, opSteiger: dom.opSteiger, oeverPunt: dom.oeverPunt, tuin: dom.tuin });
  const binnenDomein = (x, z, rand = 0) => { const l = dom.lokaal(V(x, 0, z)); return l.x > -40 - rand && l.x < 40 + rand && l.z > -24 - rand && l.z < 70; };

  // ---------- de andere huizen: lichte gevels, oranje pannen ----------
  { const wand = [], dak = [], blok = [];
    for (const h of d.huizen) {
      const r = h.r.slice(0, -1), cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length;
      { const l = dom.lokaal(V(cx, 0, cz)); if ((l.x > -20 && l.x < 32 && l.z > -16 && l.z < 3) || Math.hypot(cx, cz) > 500) continue; }
      const y0 = W.hoogte(cx, cz) - 0.3, hh = Math.max(2.6, h.h), nok = Math.min(2.4, hh * 0.45);
      for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; wand.push(a[0], y0, a[1], b[0], y0, b[1], b[0], y0 + hh, b[1], a[0], y0, a[1], b[0], y0 + hh, b[1], a[0], y0 + hh, a[1]);
        const qa = [cx + (a[0] - cx) * 0.3, cz + (a[1] - cz) * 0.3], qb = [cx + (b[0] - cx) * 0.3, cz + (b[1] - cz) * 0.3], oa = [cx + (a[0] - cx) * 1.06, cz + (a[1] - cz) * 1.06], ob = [cx + (b[0] - cx) * 1.06, cz + (b[1] - cz) * 1.06];
        dak.push(oa[0], y0 + hh, oa[1], ob[0], y0 + hh, ob[1], qb[0], y0 + hh + nok, qb[1], oa[0], y0 + hh, oa[1], qb[0], y0 + hh + nok, qb[1], qa[0], y0 + hh + nok, qa[1]);
        dak.push(qa[0], y0 + hh + nok, qa[1], qb[0], y0 + hh + nok, qb[1], cx, y0 + hh + nok, cz); }
      blok.push({ r, x0: Math.min(...r.map((p) => p[0])), x1: Math.max(...r.map((p) => p[0])), z0: Math.min(...r.map((p) => p[1])), z1: Math.max(...r.map((p) => p[1])) });
    }
    const maak = (pts, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(pts), 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.castShadow = true; scene.add(m); };
    maak(wand, new THREE.MeshStandardMaterial({ color: "#e4d6b8", roughness: 0.9, side: THREE.DoubleSide })); maak(dak, new THREE.MeshStandardMaterial({ color: "#bd6238", roughness: 0.85, side: THREE.DoubleSide }));
    W.inHuis = (x, z, marge = 0.4) => { for (const b of blok) if (x > b.x0 - marge && x < b.x1 + marge && z > b.z0 - marge && z < b.z1 + marge && inRing(x, z, b.r)) return true;
      return dom.inGebouw(x, z, marge); }; }

  // ---------- wegen ----------
  { const pts = [], pad = [];
    for (const w of d.wegen) { const b = w.pad ? 1.3 : 2.4, doel = w.pad ? pad : pts; for (let i = 0; i < w.p.length - 1; i++) { const a = w.p[i], c = w.p[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * b, nz = (dx / l) * b, ya = W.hoogte(a[0], a[1]) + 0.07, yc = W.hoogte(c[0], c[1]) + 0.07;
      if (W.inWater(a[0], a[1]) || W.inWater(c[0], c[1])) continue;
      doel.push(a[0] - nx, ya, a[1] - nz, a[0] + nx, ya, a[1] + nz, c[0] + nx, yc, c[1] + nz, a[0] - nx, ya, a[1] - nz, c[0] + nx, yc, c[1] + nz, c[0] - nx, yc, c[1] - nz); } }
    for (const [p, kleur] of [[pts, "#8f8c86"], [pad, "#b9a67c"]]) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(p), 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; scene.add(m); } }

  // ---------- bomen: in de bossen en heggen van de kaart, en een rij langs elke oever ----------
  { const plek = [];
    const strooi = (r, per, hMin, hMax) => { const x0 = Math.min(...r.map((p) => p[0])), x1 = Math.max(...r.map((p) => p[0])), z0 = Math.min(...r.map((p) => p[1])), z1 = Math.max(...r.map((p) => p[1])), n = Math.min(260, ((x1 - x0) * (z1 - z0)) / per);
      for (let i = 0; i < n; i++) { const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0); if (Math.hypot(x, z) > 520 || !inRing(x, z, r) || W.oever(x, z) > -1.5) continue; if (binnenDomein(x, z)) continue; plek.push([x, z, hMin + Math.random() * (hMax - hMin)]); } };
    for (const r of d.bos) strooi(r, 85, 8, 16); for (const r of d.heg) strooi(r, 30, 5, 9);
    // welke soort: langs het water treurwilgen (soms), verder esdoorns (src/natuur.js maakt er echte bomen van)
    W.bomen = plek; W.bomenLijst = [...dom.bomen, ...plek.map(([x, z, h]) => { const nat = W.oever(x, z) > -14 && ruis(x * 0.37, z * 0.71) < 0.45; return { x, z, y: W.hoogte(x, z), h: nat ? Math.min(h, 10) : h * 1.15, soort: nat ? "wilg" : "esdoorn" }; })]; }
  return W;
}
