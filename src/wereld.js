// De wereld: de Lot (170 m breed) met oevers, bos en heggen, de huizen van het dorp, en het huis aan de oever met steiger.
// Alles komt uit data/lot.json (IGN BD TOPO); de bodem van de rivier is een hoogteveld, zodat de livescope echte dieptes ziet.
import * as THREE from "three";

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
  // diepe kolken waar de grote meervallen liggen (x, z, straal, extra diepte)
  W.kolken = [[-55, -95, 26, 2.6], [95, -120, 30, 3.2], [-150, -60, 24, 2.2], [170, -70, 22, 2.4]];
  const hoogteUit = (x, z, s) => {
    if (s <= 0) return 0.85 * zacht(0, 7, -s) + 0.25 * zacht(20, 120, -s) * (0.5 + golf(x, z) * 0.5) + 0.05; // land: een oeverwal en dan zacht glooiend
    let h = -(0.3 + 7.6 * zacht(0, 42, s)) - golf(x, z) * 0.7 - ruis(Math.round(x / 6), Math.round(z / 6)) * 0.35;
    for (const [kx, kz, kr, kd] of W.kolken) h -= kd * zacht(kr, 0, Math.hypot(x - kx, z - kz));
    return Math.min(-0.25, h);
  };
  // het hoogteveld
  const MAAT = 1080, N = 360, CEL = MAAT / N, H = new Float32Array((N + 1) * (N + 1)), S = new Float32Array((N + 1) * (N + 1));
  for (let j = 0; j <= N; j++) for (let i = 0; i <= N; i++) { const x = -MAAT / 2 + i * CEL, z = -MAAT / 2 + j * CEL, s = totOever(x, z); S[j * (N + 1) + i] = s; H[j * (N + 1) + i] = hoogteUit(x, z, s); }
  const lees = (A, x, z) => { const fx = Math.min(N - 0.001, Math.max(0, (x + MAAT / 2) / CEL)), fz = Math.min(N - 0.001, Math.max(0, (z + MAAT / 2) / CEL)), i = fx | 0, j = fz | 0, u = fx - i, v = fz - j, k = j * (N + 1) + i; return A[k] * (1 - u) * (1 - v) + A[k + 1] * u * (1 - v) + A[k + N + 1] * (1 - u) * v + A[k + N + 2] * u * v; };
  W.hoogte = (x, z) => lees(H, x, z);
  W.oever = (x, z) => lees(S, x, z); // > 0 = in het water
  W.inWater = (x, z) => lees(S, x, z) > 0;
  W.diepte = (x, z) => Math.max(0, -lees(H, x, z));
  { const g = new THREE.PlaneGeometry(MAAT, MAAT, N, N).rotateX(-Math.PI / 2), p = g.attributes.position, kleur = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let k = 0; k < p.count; k++) { const h = H[k], s = S[k]; p.setY(k, h);
      if (s > 0) c.set("#5b5a44").lerp(new THREE.Color("#2a3328"), zacht(0, 5, -h)); else if (s > -3.5) c.set("#8a7f5c"); else c.set("#6f9a4a").lerp(new THREE.Color("#8aa856"), ruis(Math.round(p.getX(k) / 9), Math.round(p.getZ(k) / 9)));
      kleur.set([c.r, c.g, c.b], k * 3); }
    g.setAttribute("color", new THREE.BufferAttribute(kleur, 3)); g.computeVertexNormals();
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 })); m.receiveShadow = true; scene.add(m); W.grond = m; }
  // het water: groenbruin en een beetje doorzichtig, zoals de Lot in de zomer
  { const m = new THREE.Mesh(new THREE.PlaneGeometry(MAAT, MAAT).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#4d6f5e", roughness: 0.12, metalness: 0.3, transparent: true, opacity: 0.86 })); m.position.y = 0; scene.add(m); W.water = m; }

  // ---------- het huis aan de oever (zelf gebouwd, met een slaapkamer boven) ----------
  // de plek: het grootste gebouw bij de oorsprong; de lange kant langs de rivier
  let thuis = null; for (const h of d.huizen) { const cx = h.r.reduce((s, p) => s + p[0], 0) / h.r.length, cz = h.r.reduce((s, p) => s + p[1], 0) / h.r.length, a = Math.hypot(cx, cz); if (a < 40 && (!thuis || h.h > thuis.h)) thuis = { cx, cz, h: h.h }; }
  thuis ??= { cx: 0, cz: 0 };
  // de kant van de rivier: de richting waarin het water het snelst dichterbij komt
  let best = null; for (let a = 0; a < 6.283; a += 0.05) { const s = W.oever(thuis.cx + Math.sin(a) * 30, thuis.cz + Math.cos(a) * 30); if (!best || s > best.s) best = { s, a }; }
  const yaw = best.a, u = V(Math.sin(yaw), 0, Math.cos(yaw)), t = V(u.z, 0, -u.x); // u = naar de rivier, t = langs de oever
  let afst = 0; while (afst < 120 && !W.inWater(thuis.cx + u.x * afst, thuis.cz + u.z * afst)) afst += 0.25;
  // het huis staat 16 m van het water, de tuin loopt af naar de oever
  const huisPos = V(thuis.cx + u.x * (afst - 20), 0, thuis.cz + u.z * (afst - 20)); huisPos.y = W.hoogte(huisPos.x, huisPos.z);
  const huis = new THREE.Group(); huis.position.copy(huisPos); huis.rotation.y = yaw; scene.add(huis);
  const BX = 10, BZ = 7, HV = 2.8, HT = 5.5; // breed (langs de oever), diep, verdiepingshoogte, goothoogte
  const muur = new THREE.MeshStandardMaterial({ color: "#e9dcc0", roughness: 0.9 }), pan = new THREE.MeshStandardMaterial({ color: "#c2663a", roughness: 0.85 }), luik = new THREE.MeshStandardMaterial({ color: "#5e8aa0", roughness: 0.7 }), hout = new THREE.MeshStandardMaterial({ color: "#7a5a3a", roughness: 0.8 }), glas = new THREE.MeshStandardMaterial({ color: "#2b3a44", roughness: 0.1, metalness: 0.5 });
  W.dozen = []; // botsdozen in de ruimte van het huis: [x0, y0, z0, x1, y1, z1]
  const doos = (x, y, z, bx, by, bz, mat, bots = true) => { const m = new THREE.Mesh(new THREE.BoxGeometry(bx, by, bz), mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; huis.add(m); if (bots) W.dozen.push([x - bx / 2, y - by / 2, z - bz / 2, x + bx / 2, y + by / 2, z + bz / 2]); return m; };
  const D = 0.25;
  // achtergevel en zijgevels dicht; de voorgevel (naar de rivier, +z) met het open slaapkamerraam
  doos(0, HT / 2, -BZ / 2, BX, HT, D, muur); doos(-BX / 2, HT / 2, 0, D, HT, BZ, muur); doos(BX / 2, HT / 2, 0, D, HT, BZ, muur);
  const RAAM = { x: 2.2, y: 4.0, b: 1.5, h: 1.3 }; // het slaapkamerraam (midden, breedte, hoogte)
  doos(0, HV / 2, BZ / 2, BX, HV, D, muur); // begane grond
  doos(0, (HV + RAAM.y - RAAM.h / 2) / 2, BZ / 2, BX, RAAM.y - RAAM.h / 2 - HV, D, muur); // borstwering
  doos(0, (RAAM.y + RAAM.h / 2 + HT) / 2, BZ / 2, BX, HT - RAAM.y - RAAM.h / 2, D, muur); // boven het raam
  doos((-BX / 2 + RAAM.x - RAAM.b / 2) / 2, RAAM.y, BZ / 2, RAAM.x - RAAM.b / 2 + BX / 2, RAAM.h, D, muur); doos((BX / 2 + RAAM.x + RAAM.b / 2) / 2, RAAM.y, BZ / 2, BX / 2 - RAAM.x - RAAM.b / 2, RAAM.h, D, muur);
  for (const k of [-1, 1]) doos(RAAM.x + k * (RAAM.b / 2 + 0.4), RAAM.y, BZ / 2 + 0.16, 0.75, RAAM.h + 0.1, 0.05, luik, false); // de luiken staan open
  doos(0, HV, 0, BX, 0.2, BZ, hout); // de vloer van de slaapkamer
  doos(0, HT + 0.05, 0, BX, 0.1, BZ, hout); // plafond
  // het dak: twee schuine vlakken
  for (const k of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(BX + 0.8, 0.14, BZ * 0.62), pan); m.position.set(0, HT + 0.95, k * BZ * 0.26); m.rotation.x = k * 0.5; m.castShadow = true; huis.add(m); }
  for (const k of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(-BZ / 2, 0); sh.lineTo(BZ / 2, 0); sh.lineTo(0, 1.9); const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), muur); m.position.set(k * BX / 2, HT, 0); m.rotation.y = Math.PI / 2; m.material = muur.clone(); m.material.side = THREE.DoubleSide; huis.add(m); }
  // beneden: een deur en ramen met luiken (decor)
  doos(-1.2, 1.05, BZ / 2 + 0.14, 1.0, 2.1, 0.05, hout, false);
  for (const x of [-3.6, 1.4, 3.6]) { doos(x, 1.5, BZ / 2 + 0.14, 1.0, 1.2, 0.04, glas, false); for (const k of [-1, 1]) doos(x + k * 0.78, 1.5, BZ / 2 + 0.15, 0.5, 1.3, 0.04, luik, false); }
  doos(-2.6, RAAM.y, BZ / 2 + 0.14, 1.2, 1.2, 0.04, glas, false); for (const k of [-1, 1]) doos(-2.6 + k * 0.88, RAAM.y, BZ / 2 + 0.15, 0.5, 1.3, 0.04, luik, false);
  // de slaapkamer: een bed onder het raam, een nachtkastje
  const BED = { x: RAAM.x + 0.2, z: 0.7, y: HV + 0.1 };
  doos(BED.x, BED.y + 0.2, BED.z, 1.5, 0.4, 2.1, new THREE.MeshStandardMaterial({ color: "#6b4a30", roughness: 0.8 }), false);
  doos(BED.x, BED.y + 0.48, BED.z, 1.42, 0.18, 2.02, new THREE.MeshStandardMaterial({ color: "#e8e4da", roughness: 0.9 }), false);
  doos(BED.x, BED.y + 0.62, BED.z - 0.8, 0.7, 0.14, 0.4, new THREE.MeshStandardMaterial({ color: "#f4f1ea", roughness: 0.9 }), false);
  doos(BED.x - 1.2, BED.y + 0.3, BED.z - 0.8, 0.45, 0.6, 0.45, hout, false);
  { const lamp = new THREE.PointLight("#ffd9a0", 6, 7); lamp.position.set(0.5, HT - 0.5, 0.3); huis.add(lamp); }
  huis.updateMatrixWorld(true);
  const uitHuis = (x, y, z) => V(x, y, z).applyMatrix4(huis.matrixWorld);
  W.huis = { groep: huis, pos: huisPos, yaw, u, t, naarBinnen: (p) => huis.worldToLocal(p.clone()), uit: uitHuis, raam: uitHuis(RAAM.x, RAAM.y, BZ / 2), bed: uitHuis(BED.x, BED.y + 0.58, BED.z), RAAM, BX, BZ, HT };

  // ---------- de steiger ----------
  const oeverPunt = V(thuis.cx + u.x * afst, 0, thuis.cz + u.z * afst).addScaledVector(t, -6);
  { const g = new THREE.Group(), LEN = 11, BR = 1.7, dek = 0.55; g.position.copy(oeverPunt).addScaledVector(u, -1.5); g.rotation.y = yaw; scene.add(g);
    const plank = new THREE.MeshStandardMaterial({ color: "#8d7350", roughness: 0.85 }), paal = new THREE.MeshStandardMaterial({ color: "#4a3a28", roughness: 0.9 });
    for (let i = 0; i < LEN / 0.24; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(BR, 0.05, 0.21), plank); m.position.set(0, dek, i * 0.24 + 0.1); m.castShadow = m.receiveShadow = true; g.add(m); }
    for (let i = 0; i <= 4; i++) for (const k of [-1, 1]) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.4, 8), paal); m.position.set(k * (BR / 2 - 0.05), dek - 1.5, i * (LEN / 4)); g.add(m); }
    W.steiger = { groep: g, begin: g.position.clone(), eind: g.position.clone().addScaledVector(u, LEN), dek, breed: BR, lengte: LEN };
    /** Sta je op de steiger? Geeft de hoogte van het dek, of null. */
    W.opSteiger = (x, z) => { const dx = x - g.position.x, dz = z - g.position.z, langs = dx * u.x + dz * u.z, dwars = dx * t.x + dz * t.z; return langs > -0.6 && langs < LEN && Math.abs(dwars) < BR / 2 ? dek : null; }; }
  W.oeverPunt = oeverPunt; W.tuin = huisPos.clone().addScaledVector(u, 9);

  // ---------- de andere huizen: lichte gevels, oranje pannen ----------
  { const wand = [], dak = [], blok = [];
    for (const h of d.huizen) {
      const r = h.r.slice(0, -1), cx = r.reduce((s, p) => s + p[0], 0) / r.length, cz = r.reduce((s, p) => s + p[1], 0) / r.length;
      if (Math.hypot(cx - huisPos.x, cz - huisPos.z) < 16 || Math.hypot(cx - thuis.cx, cz - thuis.cz) < 9 || Math.hypot(cx, cz) > 500) continue;
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
      const l = huis.worldToLocal(V(x, 0, z)); return Math.abs(l.x) < BX / 2 + marge && Math.abs(l.z) < BZ / 2 + marge; }; }

  // ---------- wegen ----------
  { const pts = [], pad = [];
    for (const w of d.wegen) { const b = w.pad ? 1.3 : 2.4, doel = w.pad ? pad : pts; for (let i = 0; i < w.p.length - 1; i++) { const a = w.p[i], c = w.p[i + 1], dx = c[0] - a[0], dz = c[1] - a[1], l = Math.hypot(dx, dz) || 1, nx = (-dz / l) * b, nz = (dx / l) * b, ya = W.hoogte(a[0], a[1]) + 0.07, yc = W.hoogte(c[0], c[1]) + 0.07;
      if (W.inWater(a[0], a[1]) || W.inWater(c[0], c[1])) continue;
      doel.push(a[0] - nx, ya, a[1] - nz, a[0] + nx, ya, a[1] + nz, c[0] + nx, yc, c[1] + nz, a[0] - nx, ya, a[1] - nz, c[0] + nx, yc, c[1] + nz, c[0] - nx, yc, c[1] - nz); } }
    for (const [p, kleur] of [[pts, "#8f8c86"], [pad, "#b9a67c"]]) { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(p), 3)); g.computeVertexNormals(); const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.95, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 })); m.receiveShadow = true; scene.add(m); } }

  // ---------- bomen: in de bossen en heggen van de kaart, en een rij langs elke oever ----------
  { const plek = [];
    const strooi = (r, per, hMin, hMax) => { const x0 = Math.min(...r.map((p) => p[0])), x1 = Math.max(...r.map((p) => p[0])), z0 = Math.min(...r.map((p) => p[1])), z1 = Math.max(...r.map((p) => p[1])), n = Math.min(260, ((x1 - x0) * (z1 - z0)) / per);
      for (let i = 0; i < n; i++) { const x = x0 + Math.random() * (x1 - x0), z = z0 + Math.random() * (z1 - z0); if (Math.hypot(x, z) > 520 || !inRing(x, z, r) || W.oever(x, z) > -1.5) continue; if (Math.hypot(x - huisPos.x, z - huisPos.z) < 24 || Math.abs((x - oeverPunt.x) * t.x + (z - oeverPunt.z) * t.z) < 16 && W.oever(x, z) > -40) continue; plek.push([x, z, hMin + Math.random() * (hMax - hMin)]); } };
    for (const r of d.bos) strooi(r, 85, 8, 16); for (const r of d.heg) strooi(r, 30, 5, 9);
    const stam = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.26, 1, 6).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: "#5a4632", roughness: 0.95 }), plek.length);
    const kruin = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, flatShading: true }), plek.length * 2);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), c = new THREE.Color();
    plek.forEach(([x, z, h], i) => { const y = W.hoogte(x, z);
      stam.setMatrixAt(i, m.compose(V(x, y, z), q.identity(), V(h * 0.07 + 0.6, h * 0.55, h * 0.07 + 0.6)));
      for (let k = 0; k < 2; k++) { const r = h * (k ? 0.24 : 0.32); kruin.setMatrixAt(i * 2 + k, m.compose(V(x + (k ? Math.sin(i) * r * 0.5 : 0), y + h * (k ? 0.86 : 0.62), z + (k ? Math.cos(i) * r * 0.5 : 0)), q.setFromEuler(new THREE.Euler(i, i * 2, 0)), V(r, r * 1.15, r))); kruin.setColorAt(i * 2 + k, c.setHSL(0.27 + ruis(i, k) * 0.07, 0.42 + ruis(k, i) * 0.15, 0.24 + ruis(i + 3, k) * 0.1)); } });
    stam.castShadow = kruin.castShadow = true; scene.add(stam, kruin); W.bomen = plek; }
  return W;
}
