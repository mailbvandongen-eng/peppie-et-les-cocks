// De kippen: een troep die los over het gras en de steigers loopt. Witte, bruine, lavendelgrijze, zwarte, patrijskleurige,
// zwarte met een witte krullenbol, en een haan. Ze pikken, scharrelen, rennen weg als je op ze af rent, en ze zijn gek op
// verrassingen: af en toe ligt er iets roze in het gras (zie de foto's van Bob) en dan stormt de hele troep erop af.
import * as THREE from "three";

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tussen = (a, b) => a + Math.random() * (b - a);

const SOORTEN = [
  { lijf: "#f3f1ea", staart: "#ffffff", hals: "#f6f4ee" }, // wit
  { lijf: "#f3f1ea", staart: "#ffffff", hals: "#f6f4ee" },
  { lijf: "#f3f1ea", staart: "#ffffff", hals: "#f6f4ee" },
  { lijf: "#9a5a2c", staart: "#7a4020", hals: "#b8743a" }, // roodbruin
  { lijf: "#a8662f", staart: "#2a2420", hals: "#c98a45" },
  { lijf: "#b77a44", staart: "#8d5530", hals: "#d29a5c" }, // licht bruin
  { lijf: "#8d8f99", staart: "#7b7d86", hals: "#9fa1aa" }, // lavendelgrijs
  { lijf: "#878891", staart: "#6f717a", hals: "#9b9ca4" },
  { lijf: "#1e2024", staart: "#16181c", hals: "#24272c" }, // zwart
  { lijf: "#22252a", staart: "#121418", hals: "#2a2d33", kuif: true }, // zwart met witte krullenbol
  { lijf: "#26292e", staart: "#1a1c20", hals: "#2d3036", kuif: true },
  { lijf: "#7d6244", staart: "#3a2c20", hals: "#c49a5a", gestreept: true }, // patrijs
  { lijf: "#3b3a3c", staart: "#2b2a2c", hals: "#4a4a4e", gestreept: true }, // donker gespikkeld
];
const HAAN = { lijf: "#7a2e12", staart: "#13201c", hals: "#c0571c", haan: true };

const mats = {}; const M = (k, o = {}) => (mats[k + JSON.stringify(o)] ??= new THREE.MeshStandardMaterial({ color: k, roughness: 0.9, ...o }));

/** Eén kip als groep met bewegende delen: kop, poten, vleugels, staart. Lengte ± 45 cm (haan 55). */
function maakKip(s) {
  const g = new THREE.Group(), lijf = new THREE.Group(); g.add(lijf); const k = s.haan ? 1.22 : 1;
  const sfeer = (r, kleur, sx = 1, sy = 1, sz = 1, ouder = lijf, plat = false) => { const m = new THREE.Mesh(plat ? new THREE.IcosahedronGeometry(r, 1) : new THREE.SphereGeometry(r, 12, 9), M(kleur, plat ? { flatShading: true } : {})); m.scale.set(sx, sy, sz); m.castShadow = true; ouder.add(m); return m; };
  const romp = sfeer(0.16 * k, s.lijf, 0.9, 0.85, 1.25); romp.position.set(0, 0.3 * k, 0);
  const borst = sfeer(0.12 * k, s.hals, 1, 1, 1); borst.position.set(0, 0.32 * k, 0.12 * k);
  if (s.gestreept) for (let i = 0; i < 10; i++) { const v = sfeer(0.035 * k, i % 2 ? "#d8c08a" : "#2a2018", 1, 0.4, 1.4); v.position.set(Math.sin(i * 1.7) * 0.12 * k, 0.32 * k + Math.cos(i * 2.3) * 0.06, Math.cos(i) * 0.1 * k); }
  // vleugels
  const vleugels = [-1, 1].map((z) => { const w = new THREE.Group(); w.position.set(z * 0.12 * k, 0.33 * k, 0.02); lijf.add(w); const v = sfeer(0.1 * k, s.lijf, 0.35, 0.65, 1.2, w); v.position.set(z * 0.02, -0.02, -0.03); return w; });
  // de staart: een waaier omhoog naar achter (de haan: lange donkere sikkels)
  const staart = new THREE.Group(); staart.position.set(0, 0.36 * k, -0.15 * k); lijf.add(staart);
  if (s.haan) for (let i = 0; i < 6; i++) { const b = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.022, 5, 10, Math.PI * 0.85), M(s.staart, { metalness: 0.3, roughness: 0.5 })); b.rotation.set(0, Math.PI / 2, 0.3 + i * 0.12); b.position.set((i - 2.5) * 0.02, 0.05, -0.12); b.scale.set(1, 1 + i * 0.08, 1); staart.add(b); }
  else for (let i = 0; i < 5; i++) { const v = sfeer(0.075, s.staart, 0.35, 1.25, 0.8, staart); v.position.set((i - 2) * 0.025, 0.07, -0.02); v.rotation.set(-0.5, 0, (i - 2) * 0.18); }
  // hals en kop
  const hals = new THREE.Group(); hals.position.set(0, 0.4 * k, 0.15 * k); lijf.add(hals);
  const nek = sfeer(0.07 * k, s.hals, 1, 1.5, 1, hals); nek.position.set(0, 0.06 * k, 0.01);
  const kop = new THREE.Group(); kop.position.set(0, 0.15 * k, 0.03 * k); hals.add(kop);
  sfeer(0.062 * k, s.hals, 0.95, 1, 1.1, kop);
  const snavel = new THREE.Mesh(new THREE.ConeGeometry(0.022 * k, 0.06 * k, 6).rotateX(Math.PI / 2), M("#e2b545", { roughness: 0.5 })); snavel.position.set(0, -0.01, 0.075 * k); kop.add(snavel);
  const rood = M("#d4261c", { roughness: 0.6 }); const kam = s.haan ? 5 : 3;
  if (!s.kuif || s.haan) for (let i = 0; i < kam; i++) { const c = new THREE.Mesh(new THREE.SphereGeometry(0.022 * k * (s.haan ? 1.5 : 1), 6, 5), rood); c.scale.set(0.5, 1.3, 1); c.position.set(0, 0.06 * k + Math.sin((i / (kam - 1)) * Math.PI) * 0.015, 0.04 * k - i * 0.022 * k); kop.add(c); }
  for (const z of [-1, 1]) { const ll = new THREE.Mesh(new THREE.SphereGeometry(0.016 * k * (s.haan ? 1.5 : 1), 6, 5), rood); ll.scale.set(0.5, 1.4, 1); ll.position.set(z * 0.008, -0.05 * k, 0.05 * k); kop.add(ll);
    const oog = new THREE.Mesh(new THREE.SphereGeometry(0.009 * k, 6, 5), M("#d48a1a", { roughness: 0.3 })); oog.position.set(z * 0.05 * k, 0.012, 0.025 * k); kop.add(oog); const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.005 * k, 5, 4), M("#000")); pupil.position.set(z * 0.057 * k, 0.012, 0.027 * k); kop.add(pupil); }
  if (s.kuif) { const kuif = sfeer(0.085, "#f7f5ef", 1.15, 0.9, 1.1, kop, true); kuif.position.set(0, 0.06, -0.005); }
  // poten
  const geel = M("#e0b04a", { roughness: 0.6 }); const poten = [-1, 1].map((z) => { const p = new THREE.Group(); p.position.set(z * 0.055 * k, 0.2 * k, 0); g.add(p); const l = new THREE.Mesh(new THREE.CylinderGeometry(0.011 * k, 0.011 * k, 0.2 * k, 5), geel); l.position.y = -0.1 * k; p.add(l);
    for (const a of [-0.45, 0, 0.45]) { const t = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.008, 0.06 * k), geel); t.position.set(Math.sin(a) * 0.025, -0.2 * k, Math.cos(a) * 0.025); t.rotation.y = a; p.add(t); } return p; });
  return { g, lijf, hals, kop, vleugels, staart, poten, k };
}

export class Kippen {
  /** gebied(x, z) → mag een kip hier staan? grond(x, z) → hoogte. plekken() → een willekeurig punt { x, z } om naartoe te lopen. */
  constructor(scene, { grond, mag, plek, aantal = 16, geluid = null }) {
    this.scene = scene; this.grond = grond; this.mag = mag; this.plek = plek; this.geluid = geluid; this.lijst = []; this.t = 0;
    for (let i = 0; i < aantal; i++) { const s = i === 0 ? HAAN : SOORTEN[i % SOORTEN.length], d = maakKip(s), p = plek(); d.g.position.set(p.x, grond(p.x, p.z), p.z); d.g.rotation.y = Math.random() * 6.28; scene.add(d.g);
      this.lijst.push({ ...d, s, doel: plek(), wacht: tussen(0, 3), fase: Math.random() * 6, pik: 0, ren: 0, v: 0, fladder: 0 }); }
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
      // de beweging: pootjes, kopknikken bij het lopen, pikken naar de grond, vleugels bij het fladderen
      k.fase += dt * (k.v > 0 ? 6 + k.v * 4 : 0); const loopt = k.v > 0, sw = Math.sin(k.fase);
      k.poten[0].rotation.x = loopt ? sw * 0.6 : 0; k.poten[1].rotation.x = loopt ? -sw * 0.6 : 0;
      k.pik = Math.max(0, k.pik - dt * 1.6); const pik = !loopt && k.wacht > 0 ? Math.max(0, Math.sin(this.t * 7 + k.fase)) * (bijVerrassing ? 1 : 0.8) * (k.pik > 0 || bijVerrassing ? 1 : 0) : 0;
      k.lijf.rotation.x = pik * 0.75; k.hals.rotation.x = pik * 0.9; k.hals.position.z = 0.15 * k.k + (loopt ? Math.max(0, Math.sin(k.fase * 2)) * 0.03 : 0);
      k.kop.rotation.y = !loopt && !pik ? Math.sin(this.t * 1.3 + k.fase * 3) * 0.6 : 0;
      k.fladder = Math.max(0, k.fladder - dt); const fl = k.fladder > 0 ? Math.sin(this.t * 40) * 0.9 : 0; k.vleugels[0].rotation.z = -Math.abs(fl); k.vleugels[1].rotation.z = Math.abs(fl); k.lijf.position.y = k.fladder > 0 ? Math.abs(Math.sin(this.t * 12)) * 0.12 : 0;
      k.staart.rotation.x = Math.sin(this.t * 2 + k.fase) * 0.05;
    }
    // af en toe kraait de haan, en tokt er een kip
    if (Math.random() < dt / 40) this.geluid?.("kraai"); else if (Math.random() < dt / 6) this.geluid?.("tok");
  }
}
