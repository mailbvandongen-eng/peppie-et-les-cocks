// Waterplanten aan de overkant, waar de bodem langzaam oploopt: fonteinkruid dat van de bodem tot vlak onder het
// oppervlak groeit, velden waterlelies, en riet langs de waterlijn. Op de livescope zie je het fonteinkruid als pluimen
// die van de bodem omhoog staan.
import * as THREE from "three";
import { onderWater } from "./water.js";

const tussen = (a, b) => a + Math.random() * (b - a);
function tex(b, h, teken) { const c = document.createElement("canvas"); c.width = b; c.height = h; const x = c.getContext("2d"); teken(x, b, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
/** Twee gekruiste vlakken, onderkant op 0, hoogte 1, breedte b. */
function kruis(b = 1) { const g = new THREE.PlaneGeometry(b, 1).translate(0, 0.5, 0), g2 = g.clone().rotateY(Math.PI / 2), out = new THREE.BufferGeometry();
  for (const n of ["position", "normal", "uv"]) out.setAttribute(n, new THREE.Float32BufferAttribute([...g.attributes[n].array, ...g2.attributes[n].array], n === "uv" ? 2 : 3));
  out.setIndex([0, 2, 1, 2, 3, 1, 4, 6, 5, 6, 7, 5]); return out; }

export function maakWaterplanten(scene, W, { telefoon = false, bereik = 260 } = {}) {
  // ---- texturen ----
  const kruid = tex(128, 512, (x, b, h) => { for (let s = 0; s < 7; s++) { let px = b * (0.15 + s * 0.11) + tussen(-6, 6), py = h; x.strokeStyle = `hsl(${88 + tussen(-8, 8)},45%,${26 + tussen(-4, 6)}%)`; x.lineWidth = 2;
      x.beginPath(); x.moveTo(px, py); const top = h * tussen(0, 0.15); for (let y = h; y > top; y -= 18) { px += tussen(-4, 4); x.lineTo(px, y); } x.stroke();
      for (let y = h - 20; y > top; y -= tussen(10, 18)) { const k = Math.random() < 0.5 ? -1 : 1, l = tussen(14, 30); x.fillStyle = `hsla(${85 + tussen(-10, 10)},${45 + tussen(-8, 8)}%,${28 + tussen(-4, 10)}%,0.95)`; x.beginPath(); x.ellipse(px + k * l * 0.5, y, l * 0.5, 3.2, k * 0.5, 0, 6.3); x.fill(); } } });
  const riet = tex(256, 512, (x, b, h) => { for (let s = 0; s < 34; s++) { const px = tussen(10, b - 10), top = h * tussen(0.02, 0.4), buig = tussen(-30, 30), w = tussen(3, 6);
      x.fillStyle = `hsl(${78 + tussen(-14, 10)},${38 + tussen(-8, 12)}%,${38 + tussen(-6, 16)}%)`; x.beginPath(); x.moveTo(px - w, h); x.quadraticCurveTo(px - w * 0.5, (h + top) / 2, px + buig, top); x.quadraticCurveTo(px + w * 0.5, (h + top) / 2, px + w, h); x.fill(); }
    for (let s = 0; s < 4; s++) { const px = tussen(30, b - 30), y = h * tussen(0.1, 0.3); x.fillStyle = "#5a3a22"; x.beginPath(); x.ellipse(px, y + 18, 5, 18, 0, 0, 6.3); x.fill(); x.fillStyle = "#6a7a40"; x.fillRect(px - 1, y + 34, 2, h - y - 34); } });
  const lelie = tex(128, 128, (x, b) => { x.fillStyle = "#3f6b2a"; x.beginPath(); x.moveTo(b / 2, b / 2); x.arc(b / 2, b / 2, b * 0.46, 0.25, 6.03); x.closePath(); x.fill(); x.strokeStyle = "rgba(20,40,10,0.5)"; x.lineWidth = 1.5; for (let a = 0.4; a < 6; a += 0.5) { x.beginPath(); x.moveTo(b / 2, b / 2); x.lineTo(b / 2 + Math.cos(a) * b * 0.44, b / 2 + Math.sin(a) * b * 0.44); x.stroke(); } x.fillStyle = "rgba(160,190,110,0.25)"; x.beginPath(); x.arc(b * 0.42, b * 0.42, b * 0.22, 0, 6.3); x.fill(); });

  // ---- plekken: aan de overkant in het ondiepe; riet ook hier en daar aan onze kant buiten de tuin ----
  const kruidP = [], lelieP = [], rietP = [], c = W.steiger.eind;
  const stap = telefoon ? 3.2 : 2.4;
  for (let a = -bereik; a <= bereik; a += stap) for (let b = -40; b <= 240; b += stap) {
    const x = c.x + W.huis.t.x * a + W.huis.u.x * b + tussen(-stap / 2, stap / 2), z = c.z + W.huis.t.z * a + W.huis.u.z * b + tussen(-stap / 2, stap / 2), s = W.oever(x, z), d = W.diepte(x, z);
    const ver = !W.onzeKant(x, z), tuin = Math.abs(a) < 45 && b < 30;
    if (s > -1.0 && s < 1.2 && !tuin && (ver || Math.random() < 0.35) && Math.random() < 0.45) rietP.push([x, z, tussen(1.8, 2.8)]);
    if (ver && s > 0 && d > 0.5 && d < 3.8 && Math.random() < 0.55) kruidP.push([x, z, Math.max(0.4, d - tussen(0.1, 0.6))]);
    if (ver && s > 1 && d > 0.3 && d < 1.8 && Math.random() < 0.3) for (let i = 0; i < 5; i++) lelieP.push([x + tussen(-1.5, 1.5), z + tussen(-1.5, 1.5), tussen(0.22, 0.4)]);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = new THREE.Vector3(0, 1, 0), p3 = new THREE.Vector3(), s3 = new THREE.Vector3();
  const zet = (geo, mat, lijst, maak) => { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, lijst.length)); m.renderOrder = mat.customProgramCacheKey?.() === "onderwater" ? 3 : 0; lijst.forEach((p, i) => m.setMatrixAt(i, maak(p))); m.count = lijst.length; m.frustumCulled = false; scene.add(m); return m; };
  zet(kruis(0.9), onderWater(new THREE.MeshStandardMaterial({ map: kruid, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9 })), kruidP, ([x, z, h]) => m4.compose(p3.set(x, -W.diepte(x, z), z), q.setFromAxisAngle(Y, Math.random() * 6.28), s3.set(1, h, 1)));
  zet(kruis(1.6), new THREE.MeshStandardMaterial({ map: riet, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.9 }), rietP, ([x, z, h]) => m4.compose(p3.set(x, Math.min(0, W.hoogte(x, z)) - 0.05, z), q.setFromAxisAngle(Y, Math.random() * 6.28), s3.set(1, h, 1)));
  zet(new THREE.CircleGeometry(1, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: lelie, alphaTest: 0.3, roughness: 0.55 }), lelieP, ([x, z, r]) => m4.compose(p3.set(x, 0.02, z), q.setFromAxisAngle(Y, Math.random() * 6.28), s3.set(r, 1, r)));
  // een paar witte bloemen tussen de lelies
  { const bl = lelieP.filter(() => Math.random() < 0.08); zet(new THREE.SphereGeometry(0.07, 8, 6).scale(1, 0.6, 1), new THREE.MeshStandardMaterial({ color: "#f6f2ea", emissive: "#3a3a30" }), bl, ([x, z]) => m4.compose(p3.set(x, 0.05, z), q.identity(), s3.set(1, 1, 1))); }

  /** Wat de livescope ziet: plantenpluimen in de bundel. zie(x, z) → afstand voor de transducer of null. */
  function inBundel(zie) { const uit = []; for (const [x, z, h] of kruidP) { const v = zie(x, z); if (v === null) continue; const bodem = W.diepte(x, z); uit.push({ v, bodem, top: bodem - h }); } return uit; }
  return { inBundel, aantal: { kruid: kruidP.length, lelie: lelieP.length, riet: rietP.length } };
}
