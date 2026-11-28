// De kippen: een troep die los over het gras en de steigers loopt. Witte, bruine, lavendelgrijze, zwarte, patrijskleurige,
// zwarte met een witte krullenbol, en een haan. Ze pikken, scharrelen, rennen weg als je op ze af rent, en ze zijn gek op
// verrassingen: af en toe ligt er iets roze in het gras (zie de foto's van Bob) en dan stormt de hele troep erop af.
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tussen = (a, b) => a + Math.random() * (b - a);

// de soorten: de kleur van de veren (de kam, de lellen en de poten blijven zoals ze zijn)
const SOORTEN = [
  { kleur: null }, { kleur: null }, // roodbruin, zoals het model
  { kleur: "#f1eee6" }, { kleur: "#f1eee6" }, { kleur: "#f1eee6" }, // wit
  { kleur: "#c48d52" }, // licht bruin
  { kleur: "#8c8f99" }, { kleur: "#8c8f99" }, // lavendelgrijs
  { kleur: "#26282c" }, // zwart
  { kleur: "#202226", kuif: true }, { kleur: "#232529", kuif: true }, // zwart met een witte krullenbol
  { kleur: "#6a5440", gestreept: true }, // patrijs
];
const HAAN = { kleur: "#7a3514", haan: true };
const CLIPS = { lopen: "walk01", rennen: "run01", fladder: "run01flap", pikken: "peck_idle2", staan: "idle01", schrik: "chicken_scared01" };
let MODEL = null, ANIMS = [], BRON = null; const KLEURMAT = {};

/** Het model laden (Sketchfab, CC BY: "Chicken Model (CS2)" van kill6lucius, zie README). */
async function laadModel() { if (MODEL) return;
  const [{ GLTFLoader, SkeletonUtils }, { MeshoptDecoder }] = await Promise.all([import("../lib/three-addons.js"), import("../lib/meshopt_decoder.mjs")]);
  const g = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`assets/dieren/kip.glb?v=${window.VERSIE ?? ""}`);
  MODEL = { scene: g.scene, clone: SkeletonUtils.clone }; ANIMS = g.animations; g.scene.traverse((o) => { if (o.isMesh && !BRON) BRON = o.material; }); }
/** Een materiaal met andere veren: de bruine veren krijgen de nieuwe kleur, de rode kam en de grijze poten blijven. */
function verenMat(kleur, gestreept) { const sleutel = kleur + (gestreept ? "s" : ""); if (KLEURMAT[sleutel]) return KLEURMAT[sleutel];
  const img = BRON.map.image, c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const x = c.getContext("2d"); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height), p = d.data, doel = new THREE.Color(kleur), t = [doel.r, doel.g, doel.b].map((v) => Math.pow(v, 1 / 2.2) * 255);
  for (let i = 0; i < p.length; i += 4) { const r = p[i], gg = p[i + 1], b = p[i + 2], mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), sat = mx ? (mx - mn) / mx : 0;
    const rood = r > 120 && r > gg * 1.9 && r > b * 1.9, grijs = sat < 0.12; if (rood || grijs) continue;
    const l = (0.3 * r + 0.59 * gg + 0.11 * b) / 160, streep = gestreept ? (((i / 4) % c.width) % 9 < 3 ? 0.55 : 1.15) : 1;
    for (let k = 0; k < 3; k++) p[i + k] = Math.min(255, t[k] * l * streep); }
  x.putImageData(d, 0, 0); const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.flipY = BRON.map.flipY;
  const m = BRON.clone(); m.map = tex; return (KLEURMAT[sleutel] = m); }

/** Eén kip: een kopie van het model met eigen bewegingen; ± 45 cm (de haan 55). */
function maakKip(s) {
  const g = new THREE.Group(), o = MODEL.clone(MODEL.scene), k = s.haan ? 0.31 : 0.26; o.scale.setScalar(k); g.add(o);
  o.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.frustumCulled = false; if (s.kleur) m.material = verenMat(s.kleur, s.gestreept); } });
  if (s.kuif) { let kop = null; o.traverse((b) => { if (b.isBone && /head/i.test(b.name) && !kop) kop = b; }); const bol = new THREE.Mesh(new THREE.IcosahedronGeometry(0.05, 1), new THREE.MeshStandardMaterial({ color: "#f5f2ea", roughness: 1, flatShading: true }));
    bol.scale.set(1.1, 0.85, 1.1); if (kop) { const w = new THREE.Vector3(); kop.getWorldScale(w); bol.scale.multiplyScalar(1 / w.x); bol.position.set(0, 0.06 / w.x, 0); kop.add(bol); } else { bol.position.set(0, 0.42, 0.12); g.add(bol); } }
  const mixer = new THREE.AnimationMixer(o), acties = {};
  for (const [n, c] of Object.entries(CLIPS)) { const clip = ANIMS.find((a) => a.name === c); if (clip) acties[n] = mixer.clipAction(clip); }
  return { g, mixer, acties, nu: null };
}
const zetActie = (k, n, snel = 1) => { const a = k.acties[n]; if (!a) return; a.timeScale = snel; if (k.nu === n) return; a.reset().play(); if (k.nu && k.acties[k.nu]) k.acties[k.nu].crossFadeTo(a, 0.25, false); k.nu = n; };

export class Kippen {
  /** gebied(x, z) → mag een kip hier staan? grond(x, z) → hoogte. plekken() → een willekeurig punt { x, z } om naartoe te lopen. */
  static laad() { return laadModel(); }
  constructor(scene, { grond, mag, plek, aantal = 16, geluid = null }) {
    this.scene = scene; this.grond = grond; this.mag = mag; this.plek = plek; this.geluid = geluid; this.lijst = []; this.t = 0;
    for (let i = 0; i < aantal; i++) { const s = i === 0 ? HAAN : SOORTEN[i % SOORTEN.length], d = maakKip(s), p = plek(); d.g.position.set(p.x, grond(p.x, p.z), p.z); d.g.rotation.y = Math.random() * 6.28; scene.add(d.g);
      d.mixer.update(Math.random() * 3); this.lijst.push({ ...d, s, doel: plek(), wacht: tussen(0, 3), fase: Math.random() * 6, pik: 0, ren: 0, v: 0, fladder: 0 }); }
    // de verrassing: een roze rubberen ding in het gras
    const roze = new THREE.MeshStandardMaterial({ color: "#f2a3a8", roughness: 0.45 }), v = new THREE.Group();
    const schacht = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, 6, 12), roze); schacht.position.y = 0.16; v.add(schacht);
    for (const k of [-1, 1]) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 9), roze); b.position.set(k * 0.045, 0.045, 0.02); v.add(b); }
    const rand = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 14), roze); rand.rotation.x = Math.PI / 2; rand.position.y = 0.24; v.add(rand);
    v.traverse((o) => { if (o.isMesh) o.castShadow = true; }); v.visible = false; scene.add(v); this.verrassing = { g: v, aan: false, t: tussen(25, 60), duur: 0 };
  }
  /** Laat er nu een verrassing verschijnen (bij x, z). */
  verras(x, z) { const vr = this.verrassing; vr.g.position.set(x, this.grond(x, z), z); vr.g.rotation.set(0, Math.random() * 6, 0); vr.g.visible = vr.aan = true; vr.duur = tussen(25, 40); for (const k of this.lijst) { k.doel = { x: x + tussen(-0.5, 0.5), z: z + tussen(-0.5, 0.5) }; k.wacht = 0; k.ren = 1; } this.geluid?.("kakel"); }
  /** dt; speler = { x, z, v } (v = loopsnelheid) of null. */
  stap(dt, speler) {
    this.t += dt; const vr = this.verrassing;
    if (!vr.aan && (vr.t -= dt) <= 0) { const p = this.plek(); this.verras(p.x, p.z); }
    if (vr.aan && (vr.duur -= dt) <= 0) { vr.aan = false; vr.g.visible = false; vr.t = tussen(70, 140); }
    for (const k of this.lijst) {
      const p = k.g.position; let dx = k.doel.x - p.x, dz = k.doel.z - p.z, l = Math.hypot(dx, dz);
      // wegrennen voor de speler als die snel dichtbij komt
      if (speler) { const sx = p.x - speler.x, sz = p.z - speler.z, sl = Math.hypot(sx, sz); if (sl < (speler.v > 2.5 ? 3.2 : 1.1) && sl > 0.01) { k.doel = { x: p.x + (sx / sl) * 3, z: p.z + (sz / sl) * 3 }; k.ren = 1; k.fladder = speler.v > 2.5 ? 0.6 : 0; k.wacht = 0; dx = k.doel.x - p.x; dz = k.doel.z - p.z; l = Math.hypot(dx, dz); if (k.fladder && Math.random() < 0.3) this.geluid?.("kakel"); } }
      const bijVerrassing = vr.aan && Math.hypot(p.x - vr.g.position.x, p.z - vr.g.position.z) < 0.9;
      if (l < 0.15 || k.wacht > 0) {
        // staan en pikken
        k.v = 0; if (k.wacht > 0) k.wacht -= dt; else { k.wacht = bijVerrassing ? tussen(0.5, 1.5) : tussen(1, 5); k.pik = Math.random() < 0.8 ? 1 : 0; }
        if (k.wacht <= 0) { k.ren = 0; k.doel = vr.aan && Math.random() < 0.6 ? { x: vr.g.position.x + tussen(-0.6, 0.6), z: vr.g.position.z + tussen(-0.6, 0.6) } : Math.random() < 0.7 ? { x: p.x + tussen(-2.5, 2.5), z: p.z + tussen(-2.5, 2.5) } : this.plek(); }
      } else {
        const snel = k.ren ? 2.6 : 0.55, nx = p.x + (dx / l) * snel * dt, nz = p.z + (dz / l) * snel * dt;
        if (this.mag(nx, nz)) { p.x = nx; p.z = nz; k.v = snel; } else { k.doel = this.plek(); k.v = 0; }
        let d = Math.atan2(dx, dz) - k.g.rotation.y; d = Math.atan2(Math.sin(d), Math.cos(d)); k.g.rotation.y += d * Math.min(1, dt * 8);
      }
      p.y = this.grond(p.x, p.z);
      // de beweging: de echte bewegingen van het model (lopen, rennen, fladderen, pikken, rondkijken)
      k.fladder = Math.max(0, k.fladder - dt);
      if (k.v > 1.5) zetActie(k, k.fladder > 0 ? "fladder" : "rennen", 1.1); else if (k.v > 0) zetActie(k, "lopen", 1.3); else if (k.wacht > 0 && (k.pik > 0 || bijVerrassing)) zetActie(k, "pikken"); else zetActie(k, "staan");
      k.pik = Math.max(0, k.pik - dt * 0.3); k.mixer.update(dt);
    }
    // af en toe kraait de haan, en tokt er een kip
    if (Math.random() < dt / 40) this.geluid?.("kraai"); else if (Math.random() < dt / 6) this.geluid?.("tok");
  }
}
