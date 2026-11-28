// Peppie et les Cocks — vissen op de Lot bij Le Temple-sur-Lot. Eerste, grove versie.
// Vier missies: vissen vanaf de kant, met de belly boat en de livescope op meerval, met de drone een glas water
// op de slapende Cocks laten vallen, en beverratten scheppen vanaf de steiger.
import * as THREE from "three";
import { laadMensen, maakMens, zetPet, cartoon, zetBril, zetHoed, zetGoPro } from "./mensen.js";
import { Effecten } from "./effecten.js";
import { Livescope } from "./livescope.js";
import { Chirp } from "./chirp.js";
import { bouwWereld } from "./wereld.js";
import { laadVisspullen } from "./hengel.js";
import { Kippen } from "./kippen.js";
import { maakBellyboat2 as maakBellyboat, laadBoten } from "./bellyboat.js";
import { maakWater } from "./water.js";
import { laadBomen } from "./natuur.js";
import { maakVisbestand } from "./vissen.js";
import { maakWaterplanten } from "./planten.js";
import { bouwStructuur } from "./structuur.js";
import { Aasgedrag, Dril } from "./meerval.js";
import { maakMeervalhengel } from "./meervalhengel.js";

const $ = (q) => document.querySelector(q);
const V = (x, y, z) => new THREE.Vector3(x, y, z);
const tussen = (a, b) => a + Math.random() * (b - a);
const kies = (l) => l[(Math.random() * l.length) | 0];
const klem = (x, a, b) => Math.min(b, Math.max(a, x));
const telefoon = matchMedia("(pointer: coarse)").matches;

// ---------- beeld ----------
const renderer = new THREE.WebGLRenderer({ antialias: !telefoon, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, telefoon ? 1.5 : 2)); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05; document.body.prepend(renderer.domElement);
const scene = new THREE.Scene(); scene.background = new THREE.Color("#a9cfe8"); scene.fog = new THREE.Fog("#c4d6e2", 220, 700);
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 900), pipCam = new THREE.PerspectiveCamera(40, 1.3, 0.1, 300);
scene.add(new THREE.HemisphereLight("#dcefff", "#6f7a4e", 0.9));
const zon = new THREE.DirectionalLight("#fff2d8", 2.6); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048); Object.assign(zon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); zon.shadow.bias = -0.0006; scene.add(zon, zon.target);
function pasAan() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", pasAan); pasAan();

// ---------- geluid: een paar eenvoudige klanken ----------
const geluid = { ctx: null,
  start() { this.ctx ??= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume?.(); this.laad(); },
  // alleen echte opnames (Bob, 28-11): de zelfgemaakte piepjes en ruis staan uit
  toon() {},
  toonOud({ freq, freq2 = freq, duur, type = "sine", gain = 0.1, start = 0 }) { const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start; o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + duur); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0005, t + duur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + duur + 0.02); },
  ruis() {},
  ruisOud({ duur, freq = 1200, gain = 0.3, start = 0 }) { const c = this.ctx; if (!c) return; const n = Math.ceil(c.sampleRate * duur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = gain; s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + start); },
  plons(v = 1) { this.speel("plons-meerval", { gain: Math.min(1, v * 0.8), rate: 1.25 }); },
  piep() { for (let i = 0; i < 4; i++) this.toon({ freq: 2300, duur: 0.07, gain: 0.04, start: i * 0.11 }); },
  goed() { [523, 659, 784, 1047].forEach((f, i) => this.toon({ freq: f, duur: 0.22, type: "triangle", gain: 0.09, start: i * 0.11 })); },
  fout() { this.toon({ freq: 220, freq2: 110, duur: 0.4, type: "sawtooth", gain: 0.06 }); },
  snurk() { this.ruis({ duur: 1.1, freq: 260, gain: 0.35 }); this.ruis({ duur: 0.9, freq: 700, gain: 0.12, start: 1.3 }); },
  slip() { this.ruis({ duur: 0.25, freq: 5000, gain: 0.12 }); },
  // echte opnames (assets/geluid/*.mp3); wat er (nog) niet is, blijft stil. stemmen.json: [{ "bestand": "...", "wanneer": "beet|groot|duik|binnen" }]
  buf: {}, stemmen: [], lus: {},
  async laad() { if (this.geladen) return; this.geladen = true; const c = this.ctx;
    for (const n of ["plons-meerval", "slip", "reel", "rivier-vogels", "kabbelen", "wind-bomen", "haan", "kippen", "kip-dichtbij"]) fetch(`assets/geluid/${n}.mp3?v=${window.VERSIE ?? ""}`).then((r) => (r.ok ? r.arrayBuffer() : null)).then((a) => a && c.decodeAudioData(a)).then((b) => { if (b) this.buf[n] = b; }).catch(() => {});
    fetch(`assets/geluid/stemmen.json?v=${window.VERSIE ?? ""}`).then((r) => (r.ok ? r.json() : [])).then((l) => { this.stemmen = l; for (const s_ of l) fetch(`assets/geluid/${s_.bestand}`).then((r) => r.arrayBuffer()).then((a) => c.decodeAudioData(a)).then((b) => { s_.buf = b; }).catch(() => {}); }).catch(() => {}); },
  /** Een stukje uit een opname (kippen, de haan): vanaf een willekeurige plek, met in- en uitfaden. */
  stuk(n, duur, gain = 1) { const c = this.ctx, b = this.buf[n]; if (!c || !b) return; const s_ = c.createBufferSource(), g = c.createGain(), van = Math.random() * Math.max(0, b.duration - duur), t = c.currentTime;
    s_.buffer = b; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.08); g.gain.setValueAtTime(gain, t + duur - 0.25); g.gain.linearRampToValueAtTime(0, t + duur); s_.connect(g); g.connect(c.destination); s_.start(t, van, duur); },
  speel(n, { gain = 1, rate = 1 } = {}) { const c = this.ctx, b = this.buf[n]; if (!c || !b) return; const s_ = c.createBufferSource(), g = c.createGain(); s_.buffer = b; s_.playbackRate.value = rate; g.gain.value = gain; s_.connect(g); g.connect(c.destination); s_.start(); },
  /** Een opname die doorloopt zolang hij nodig is (de slip, de reel): sterkte 0 = uit. */
  zet(n, sterk, rate = 1) { const c = this.ctx, b = this.buf[n]; if (!c || !b) return; let l = this.lus[n];
    if (!l && sterk > 0.02) { const s_ = c.createBufferSource(), g = c.createGain(); s_.buffer = b; s_.loop = true; g.gain.value = 0; s_.connect(g); g.connect(c.destination); s_.start(); l = this.lus[n] = { s: s_, g }; }
    if (l) { l.g.gain.setTargetAtTime(sterk, c.currentTime, 0.05); l.s.playbackRate.setTargetAtTime(rate, c.currentTime, 0.1); } },
  stem(wanneer) { const l = this.stemmen.filter((s_) => s_.wanneer === wanneer && s_.buf); if (!l.length || this.ctx.currentTime < (this.stilTot ?? 0)) return; const s_ = l[(Math.random() * l.length) | 0], b = this.ctx.createBufferSource(); b.buffer = s_.buf; b.connect(this.ctx.destination); b.start(); this.stilTot = this.ctx.currentTime + s_.buf.duration + 4; },
  // kippen: getok, gekakel en de haan (zacht, en alleen als je er dichtbij bent)
  tok(v = 1) { this.stuk("kip-dichtbij", 1.4, 0.5 * v); },
  tokOud(v = 1) { for (let i = 0; i < 2 + ((Math.random() * 3) | 0); i++) this.toon({ freq: 520 + Math.random() * 80, freq2: 380, duur: 0.07, type: "square", gain: 0.018 * v, start: i * 0.16 }); },
  kakel(v = 1) { this.stuk("kippen", 2.6, 0.6 * v); },
  kakelOud(v = 1) { for (let i = 0; i < 7; i++) this.toon({ freq: 600 + Math.random() * 300, freq2: 420, duur: 0.08, type: "square", gain: 0.022 * v, start: i * 0.1 + (i > 4 ? 0.15 : 0) }); },
  kraai(v = 1) { this.speel("haan", { gain: 0.45 * v }); },
  kraaiOud(v = 1) { [[420, 560, 0.18], [560, 700, 0.16], [700, 760, 0.5], [760, 520, 0.35]].reduce((t, [a, b, d]) => { this.toon({ freq: a, freq2: b, duur: d, type: "sawtooth", gain: 0.03 * v, start: t }); this.toon({ freq: a * 2, freq2: b * 2, duur: d, type: "triangle", gain: 0.015 * v, start: t }); return t + d * 0.9; }, 0); },
};

// ---------- laden ----------
const data = await (await fetch(`data/lot.json?v=${window.VERSIE ?? ""}`)).json();
const W = bouwWereld(data, scene);
// de lucht: een echte foto-lucht (Poly Haven, CC0), ook als licht en weerkaatsing voor alles in de wereld
{ const lucht = await new THREE.TextureLoader().loadAsync(`assets/lucht.jpg?v=${window.VERSIE ?? ""}`); lucht.mapping = THREE.EquirectangularReflectionMapping; lucht.colorSpace = THREE.SRGBColorSpace;
  scene.background = lucht; scene.backgroundRotation.y = 1.2; const pm = new THREE.PMREMGenerator(renderer); scene.environment = pm.fromEquirectangular(lucht).texture; scene.environmentIntensity = 0.55; scene.environmentRotation.y = 1.2; pm.dispose(); }
W.water.visible = false;
const water = maakWater(renderer, scene, camera, W, { telefoon });
const bomen = await laadBomen(renderer, scene, W.bomenLijst, { telefoon });
const planten = maakWaterplanten(scene, W, { telefoon });
await laadMensen((v) => $("#laden").style.setProperty("--v", v));
const spul = await laadVisspullen(scene);
const fx = new Effecten(scene);
bouwStructuur(scene, W, { start: W.steiger.eind.clone().addScaledVector(W.huis.u, 32), u: W.huis.u, t: W.huis.t });
const vb = await maakVisbestand(scene, W, { telefoon, fx: (p, n) => spetter(p, n, 0.7), geluid: (afst) => { if (afst < 60) geluid.plons(Math.max(0.1, 0.6 - afst / 100)); } });
const mens = (rol) => { const m = maakMens(rol), g = new THREE.Group(); m.object.position.set(0, 0, 0); m.object.rotation.set(0, 0, 0); m.object.visible = true; g.add(m.object); scene.add(g); m.detail(true, true); return { m, g }; };
const dom = W.domein;
const huis = W.huis, u = huis.u, t = huis.t; // u = naar de rivier, t = langs de oever
// de vier Cocks: Paul (koperrood haar) speel jij; Bob slaapt zijn roes uit in de toren; Dave (witte pet) en Wim (randje, Fristi) zijn in de tuin
// de vier Cocks; wie je speelt kies je in het menu. Van de anderen slaapt er één zijn roes uit in de toren (de drone-missie),
// staat er één op de middelste steiger en zit er één aan de picknicktafel.
const C = { paul: mens("paul"), dave: mens("dave"), bob: mens("bob"), wim: mens("wim") };
zetPet(C.dave.m);
// cartoonpersonages: Paul met GoPro, Wim groot en dik met zijn zwarte bril, Bob kaal, Dave met de witte pet
for (const [n, o] of Object.entries({ paul: {}, dave: {}, bob: { hoofd: 1.15, buik: 1.12 }, wim: { lengte: 1.08, buik: 1.35 } })) cartoon(C[n].m, o);
zetBril(C.wim.m, "zwart"); zetGoPro(C.paul.m);
let peppie = C.paul, cocks = C.bob, rest = [C.dave, C.wim];
const plekken = (() => { const zet = (w, lx, lz, rot, houding, zit) => { const p = dom.wereld(lx, 0, lz); w.g.position.set(p.x, W.opSteiger(p.x, p.z) ?? W.hoogte(p.x, p.z), p.z); w.g.rotation.set(0, huis.yaw + rot, 0); w.m.zet(houding, 1, houding === "zitten" ? 0 : null); w.m.mixer.update(0.01); if (zit) w.g.position.y += 0.44 - w.m.zithoogte() + 0.02; };
  return [(w) => zet(w, -5.4, dom.oeverZ(-5.4) + 1.7, 0.4, "staan"), (w) => zet(w, -6.4, dom.oeverZ(-6.5) - 5.25, Math.PI, "zitten", true)]; })();
{
  // Wim drinkt alleen Fristi: een pak naast hem op de picknicktafel
  const pak = new THREE.Group(), roze = new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.6 }), band = new THREE.MeshStandardMaterial({ color: "#d8357a", roughness: 0.6 });
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.19, 0.07), roze); romp.position.y = 0.095; const st = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.07, 0.072), band); st.position.y = 0.1; const nok = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.05, 0.04, 4), roze); nok.position.y = 0.21; nok.rotation.y = Math.PI / 4; pak.add(romp, st, nok);
  const pp = dom.wereld(-6.0, 0, dom.oeverZ(-6.5) - 6); pak.position.set(pp.x, W.hoogte(pp.x, pp.z) + 0.76, pp.z); scene.add(pak); W.fristi = pak; }
// de kippen lopen over het gras tussen het huis en de oever, en soms over de steigers
await Kippen.laad();
const kippen = new Kippen(scene, {
  grond: (x, z) => W.opSteiger(x, z) ?? W.hoogte(x, z),
  mag: (x, z) => (W.opSteiger(x, z) !== null || W.oever(x, z) < -0.6) && !W.inHuis(x, z, 0.15) && (() => { const l = dom.lokaal(V(x, 0, z)); return l.x > -24 && l.x < 34 && l.z > -1; })(),
  plek: () => { for (let i = 0; i < 40; i++) { if (Math.random() < 0.12) { const s = kies(W.steigers), p = dom.wereld(s.x + tussen(-2.5, 2.5), 0, s.z0 + tussen(0, 1)); if (W.opSteiger(p.x, p.z) !== null) return { x: p.x, z: p.z }; }
    const lx = tussen(-18, 22), p = dom.wereld(lx, 0, tussen(1.5, dom.oeverZ(lx) - 1)); if (!W.inHuis(p.x, p.z, 0.3) && W.oever(p.x, p.z) < -0.8) return { x: p.x, z: p.z }; } const p = W.tuin; return { x: p.x, z: p.z }; },
  aantal: telefoon ? 13 : 18,
  geluid: (n) => { const c = camera.position, k = Math.hypot(c.x - W.tuin.x, c.z - W.tuin.z); if (k < 45) geluid[n]?.(Math.max(0.15, 1 - k / 45)); },
});

// Cocks ligt in bed (boven, bij het open raam) en snurkt
function legCocks(wakker = false) {
  cocks.g.position.copy(huis.bed).addScaledVector(u, wakker ? -0.3 : 0.75); cocks.g.rotation.set(0, huis.yaw, 0);
  if (wakker) cocks.m.zet("schrik", 1, 0); else cocks.m.zet("liggen", 1, "eind");
  cocks.m.mixer.update(wakker ? 0.02 : 5); cocks.wakker = wakker;
}
legCocks();
// spullen in de tuin: stoel, kratten en blikjes bij de oever
{ const zet = (o, r, b, draai = 0) => { const p = W.oeverPunt.clone().addScaledVector(u, -r).addScaledVector(t, b); o.position.set(p.x, W.hoogte(p.x, p.z), p.z); o.rotation.y = huis.yaw + draai; scene.add(o); };
  const stoel = spul.vorm("stoel", 0.9); zet(stoel, 4, 9, Math.PI / 2); zet(spul.vorm("stoel", 0.9), 4.4, 10.6, Math.PI / 2 + 0.3);
  const groen = new THREE.MeshStandardMaterial({ color: "#1b7a37", roughness: 0.55 });
  for (let i = 0; i < 3; i++) { const k = spul.vorm("krat", 0.4); k.traverse((o) => { if (o.isMesh) o.material = groen; }); zet(k, 5 + (i > 1 ? 0.5 : 0), 11.8 + (i > 1 ? 0.6 : 0)); if (i === 1) k.position.y += 0.29; }
  const blikGroen = new THREE.MeshStandardMaterial({ color: "#16803a", roughness: 0.3, metalness: 0.55 });
  for (let i = 0; i < 14; i++) { const b = spul.vorm("blik", 0.066); b.scale.setScalar(1.9); b.traverse((o) => { if (o.isMesh) o.material = blikGroen; }); zet(b, 4 + tussen(-1.2, 1.2), 10 + tussen(-1.6, 1.6), Math.random() * 6); if (i % 2) { b.rotation.z = Math.PI / 2; b.position.y += 0.035; } } }

// ---------- bediening ----------
const invoer = { sonarSleep: 0, links: false, rechts: false, x: 0, y: 0, A: false, Atik: false, B: false, Btik: false, op: false, neer: false, toets: {} };
const cam = { yaw: huis.yaw + Math.PI, pitch: 0.28, afstand: 5, sleep: 0, zYaw: 0, zPitch: -0.32 };
// De stuurknop staat vast linksonder (altijd op dezelfde plek, ook boven de livescope); slepen over het beeld = rondkijken;
// in de livescope-stand is slepen over het scherm de transducer draaien.
{ const stick = $("#stick"), dop = $("#stick i"); let sid = null, kid = null, lx = 0, ly = 0, scid = null, scx = 0;
  const beweeg = (e) => { const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * 0.36; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } invoer.x = Math.abs(dx) < 0.12 ? 0 : dx; invoer.y = Math.abs(dy) < 0.12 ? 0 : -dy; dop.style.transform = `translate(${dx * R}px,${dy * R}px)`; };
  stick.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); sid = e.pointerId; stick.setPointerCapture(sid); beweeg(e); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === sid) beweeg(e); });
  for (const ev of ["pointerup", "pointercancel"]) stick.addEventListener(ev, (e) => { if (e.pointerId === sid) { sid = null; invoer.x = invoer.y = 0; dop.style.transform = ""; } });
  const vlak = renderer.domElement;
  vlak.addEventListener("pointerdown", (e) => { geluid.start(); if (kid === null) { kid = e.pointerId; lx = e.clientX; ly = e.clientY; cam.sleep = 1; vlak.setPointerCapture(e.pointerId); } });
  vlak.addEventListener("pointermove", (e) => { if (e.pointerId === kid && spel.modus === "belly" && belly.weergave === "zelf") { cam.zYaw = klem(cam.zYaw - (e.clientX - lx) * 0.005, -1.6, 1.6); cam.zPitch = klem(cam.zPitch - (e.clientY - ly) * 0.004, -1.0, 0.5); lx = e.clientX; ly = e.clientY; return; }
    if (e.pointerId === kid && spel.modus === "belly" && !strepen()) { invoer.sonarSleep += (e.clientX - lx) / innerWidth * 1.4; lx = e.clientX; ly = e.clientY; return; } if (e.pointerId === kid) { cam.yaw -= (e.clientX - lx) * 0.0055; cam.pitch = klem(cam.pitch + (e.clientY - ly) * 0.004, -0.3, 1.2); lx = e.clientX; ly = e.clientY; cam.sleep = 1; } });
  const los = (e) => { if (e.pointerId === kid) kid = null; };
  vlak.addEventListener("pointerup", los); vlak.addEventListener("pointercancel", los);
  const sc = $("#scope");
  let sc0 = 0, sct = 0;
  sc.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); scid = e.pointerId; scx = sc0 = e.clientX; sct = e.clientY; sc.setPointerCapture(scid); });
  sc.addEventListener("pointermove", (e) => { if (e.pointerId === scid) { invoer.sonarSleep += (e.clientX - scx) / sc.clientWidth; scx = e.clientX; } });
  // een korte tik (zonder vegen) bedient de knoppen van het toestel: bereik, gevoeligheid, pauze
  sc.addEventListener("pointerup", (e) => { if (e.pointerId !== scid) return; scid = null; if (Math.abs(e.clientX - sc0) < 8 && Math.abs(e.clientY - sct) < 8) { const r = sc.getBoundingClientRect(); if ((strepen() ? chirp : scope).tik(((e.clientX - r.left) * sc.width) / r.width, ((e.clientY - r.top) * sc.height) / r.height)) { geluid.toon({ freq: 1400, duur: 0.04, gain: 0.03 }); belly.scopeT = 0; } } });
  sc.addEventListener("pointercancel", (e) => { if (e.pointerId === scid) scid = null; });
  for (const [id, naam] of [["#knopA", "A"], ["#knopB", "B"], ["#knopOp", "op"], ["#knopNeer", "neer"], ["#knopLinks", "links"], ["#knopRechts", "rechts"]]) { const k = $(id);
    k.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); invoer[naam] = true; if (naam === "A") invoer.Atik = true; if (naam === "B") invoer.Btik = true; k.classList.add("in"); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) k.addEventListener(ev, () => { invoer[naam] = false; k.classList.remove("in"); }); }
  const T = { Space: "A", KeyE: "B", KeyR: "op", KeyF: "neer" };
  addEventListener("keydown", (e) => { invoer.toets[e.code] = true; const n = T[e.code]; if (n && !e.repeat) { invoer[n] = true; if (n === "A") invoer.Atik = true; if (n === "B") invoer.Btik = true; e.preventDefault(); } });
  addEventListener("keyup", (e) => { invoer.toets[e.code] = false; const n = T[e.code]; if (n) invoer[n] = false; }); }
/** De stick (of WASD) als richting. */
function stuur() { const k = invoer.toets, x = invoer.x + (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), y = invoer.y + (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); return { x: klem(x, -1, 1), y: klem(y, -1, 1) }; }

// ---------- het spel ----------
const spel = { modus: "menu", t: 0, klaar: false, vangsten: [] };
const hud = { links: $("#knopLinks"), rechts: $("#knopRechts"), missie: $("#missie"), tel: $("#tel"), A: $("#knopA"), B: $("#knopB"), op: $("#knopOp"), neer: $("#knopNeer"), span: $("#span"), spanI: $("#span i"), meter: $("#meter"), melding: $("#melding"), scope: $("#scope") };
function knoppen({ A = null, B = null, hoogte = false }) { hud.links.hidden = hud.rechts.hidden = true; hud.A.classList.remove("rood"); hud.A.hidden = !A; hud.B.hidden = !B; if (A) hud.A.textContent = A; if (B) hud.B.textContent = B; hud.op.hidden = hud.neer.hidden = !hoogte; }
let meldT = 0;
function meld(tekst, sec = 3) { hud.melding.textContent = tekst; hud.melding.hidden = false; meldT = sec; }
function einde(gelukt, tekst) { if (spel.klaar) return; spel.klaar = true; (gelukt ? geluid.goed : geluid.fout).call(geluid); $("#uitslagKop").textContent = gelukt ? "Gelukt!" : "Mislukt"; $("#uitslagTekst").textContent = tekst; setTimeout(() => { $("#uitslag").hidden = false; }, gelukt ? 1800 : 900); }

// de speler te voet
const loop = { pos: W.tuin.clone(), yaw: huis.yaw, v: 0 };
function stapLopen(dt, snelheid = 3.4) {
  const s = stuur(), kracht = Math.hypot(s.x, s.y);
  if (kracht > 0.12) {
    // vooruit = van de camera af; rechts = rechts in beeld
    const dx = -Math.sin(cam.yaw) * s.y + Math.cos(cam.yaw) * s.x, dz = -Math.cos(cam.yaw) * s.y - Math.sin(cam.yaw) * s.x;
    const l = Math.hypot(dx, dz) || 1, vx = (dx / l) * snelheid * Math.min(1, kracht), vz = (dz / l) * snelheid * Math.min(1, kracht);
    const nx = loop.pos.x + vx * dt, nz = loop.pos.z + vz * dt;
    const mag = (x, z) => (W.opSteiger(x, z) !== null || W.oever(x, z) < 0.4) && !W.inHuis(x, z);
    if (mag(nx, nz)) loop.pos.set(nx, 0, nz); else if (mag(nx, loop.pos.z)) loop.pos.x = nx; else if (mag(loop.pos.x, nz)) loop.pos.z = nz;
    let d = Math.atan2(vx, vz) - loop.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); loop.yaw += d * Math.min(1, dt * 10); loop.v = snelheid * Math.min(1, kracht);
  } else loop.v = 0;
  loop.pos.y = W.opSteiger(loop.pos.x, loop.pos.z) ?? Math.max(W.hoogte(loop.pos.x, loop.pos.z), -0.2);
  peppie.g.position.copy(loop.pos); peppie.g.rotation.set(0, loop.yaw, 0);
}
const voor = (yaw) => V(Math.sin(yaw), 0, Math.cos(yaw));

// ---------- de dril: spanning op de lijn ----------
const VISSEN = [["Brasem", 0.35, 0.62, 4], ["Karper", 0.5, 0.95, 3], ["Snoekbaars", 0.4, 0.85, 2], ["Barbeel", 0.4, 0.7, 2], ["Meerval", 0.8, 1.6, 1.2]];
function nieuweVis() { let r = Math.random() * VISSEN.reduce((s, v) => s + v[3], 0); for (const [soort, a, b] of VISSEN) { r -= VISSEN.find((v) => v[0] === soort)[3]; if (r <= 0) return { soort, lengte: tussen(a, b) }; } return { soort: "Brasem", lengte: 0.4 }; }
const dril = { aan: false, vis: null, afstand: 0, span: 0.4, slap: 0, breek: 0, ren: 0, rust: 2, tijd: 0 };
function beginDril(vis, afstand) { Object.assign(dril, { aan: true, vis, afstand, span: 0.45, slap: 0, breek: 0, ren: 0, rust: 1.5, tijd: 0 }); hud.span.hidden = hud.meter.hidden = false; geluid.slip(); }
/** Eén stap: draai je in (haalt)? Geeft "bezig", "binnen", "los" of "breuk". */
function stapDril(dt, haalt) {
  const d = dril, moe = Math.min(0.55, d.tijd * 0.012), kracht = (0.3 + d.vis.lengte * 0.3) * (1 - moe);
  d.tijd += dt; if (d.ren > 0) d.ren -= dt; else if ((d.rust -= dt) <= 0) { d.ren = tussen(0.9, 2.2); d.rust = tussen(1.5, 3.8); geluid.slip(); }
  const rent = d.ren > 0;
  if (haalt) { d.span += (0.3 + (rent ? 0.75 * kracht + 0.25 : 0.05)) * dt; d.afstand -= (rent ? 0.2 : Math.max(0.5, 1.9 - kracht)) * dt; }
  else { d.span -= 0.65 * dt; d.afstand += (rent ? 1.5 * kracht + 0.3 : 0.1) * dt; }
  d.span = klem(d.span, 0, 1.12);
  d.breek = d.span > 1 ? d.breek + dt : 0; d.slap = d.span < 0.12 ? d.slap + dt : 0;
  hud.spanI.style.width = `${Math.min(100, d.span * 100)}%`; hud.spanI.style.background = d.span > 0.85 ? "#e0432f" : d.span < 0.2 ? "#7aa0c8" : "#57c26a"; hud.meter.textContent = `${Math.max(0, d.afstand).toFixed(1)} m`;
  if (d.breek > 0.9) return stopDril("breuk"); if (d.slap > 3.2) return stopDril("los"); if (d.afstand <= 1.4) return stopDril("binnen");
  return "bezig";
}
function stopDril(uit) { dril.aan = false; hud.span.hidden = hud.meter.hidden = true; return uit; }
function vangst(vis) { const cm = Math.round(vis.lengte * 100), tekst = vis.lengte >= 1 ? `${vis.soort} · ${vis.lengte.toFixed(2).replace(".", ",")} m` : `${vis.soort} · ${cm} cm`; spel.vangsten.push(vis); meld(tekst, 4); geluid.goed(); geluid.speel("plons-meerval", { gain: 0.6 }); return tekst; }

// de hengel en de lijn
const hengel = spul.maakHengel(); hengel.g.visible = false;
// de meervalhengel: 1,80 m, kort en zwaar, de reel (multiplier) bovenop; Wim draait links
const mhR = maakMeervalhengel(scene, { blank: "groen" }), mhL = maakMeervalhengel(scene, { links: true, blank: "groen" }); let hengelKort = mhR;
const lijn = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: "#f2f6f8", transparent: true, opacity: 0.8 })); lijn.frustumCulled = false; lijn.visible = false; scene.add(lijn);
function zetLijn(a, b, slap = 0) { const p = lijn.geometry.attributes.position, m = a.clone().lerp(b, 0.5); m.y -= slap; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, m.x, m.y, m.z); p.setXYZ(2, b.x, b.y, b.z); p.needsUpdate = true; lijn.visible = true; }
/** Peppie houdt de hengel vast: steil = hoe ver omhoog, bocht = hoe krom. Geeft de top terug. */
/** Op de kant: de kolf van de hengel tegen de rechterheup, de hengel schuin omhoog naar het water, de molen eronder;
 *  de rechterhand om de hengel bij de molen, de linker aan de slinger van de molen (zoals in Bobs video ref/dril-kant.mp4).
 *  steil = hoek omhoog, bocht = hoe krom. Geeft de top terug. */
function houdHengel(yaw, steil, bocht) { const m = peppie.m, f = voor(yaw), rechts = V(-f.z, 0, f.x), links = rechts.clone().negate();
  const d = f.clone().multiplyScalar(Math.cos(steil)).setY(Math.sin(steil)), onder = f.clone().multiplyScalar(Math.sin(steil)).setY(-Math.cos(steil));
  // de kolf onder de rechteronderarm langs de heup: het eind zit achter de heup, de molen hangt vlak voor de buik
  const heup = m.plek("DEF-spine001").clone().addScaledVector(rechts, 0.11).add(V(0, -0.06, 0)), voet = heup.clone().addScaledVector(d, -0.36);
  hengel.g.visible = true; hengel.buig(bocht); const top = hengel.leg(voet, d);
  const molen = voet.clone().addScaledVector(d, 0.52);
  m.arm("R", molen.clone().addScaledVector(onder, -0.035), V(0, -1, 0).addScaledVector(rechts, 0.5));               // de rechterhand om de hengel, vingers rond de molenvoet
  m.arm("L", molen.clone().addScaledVector(onder, 0.13).addScaledVector(links, 0.07), V(0, -1, 0).addScaledVector(links, 0.6)); // de linkerhand aan de slinger
  return top; }
const dobber = new THREE.Group(); { const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: "#f24a2a" })); a.scale.y = 1.5; a.position.y = 0.08; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), new THREE.MeshStandardMaterial({ color: "#fafafa" })); b.position.y = 0.26; dobber.add(a, b); dobber.visible = false; scene.add(dobber); }
const spetter = (p, n = 24, k = 1) => { for (let i = 0; i < n; i++) fx.deeltje(p.clone().add(V(tussen(-0.3, 0.3), 0.1, tussen(-0.3, 0.3))), { leven: tussen(0.4, 1), kleur: i % 3 ? "#eef7fa" : "#c5e2ea", r0: 0.1, r1: 0.45 * k, v: V(tussen(-2.5, 2.5) * k, tussen(2.5, 6.5) * k, tussen(-2.5, 2.5) * k), g: 9, a: 0.9 }); };

// ---------- missie 1: vissen vanaf de kant ----------
const kant = { fase: "loop", t: 0, wacht: 0, doel: V(0, 0, 0), vis: null, n: 0 };
function beginKant() { Object.assign(kant, { fase: "loop", n: 0 }); loop.pos.copy(W.steiger.midden); loop.yaw = huis.yaw; cam.yaw = huis.yaw + Math.PI; cam.afstand = 5; hud.missie.textContent = "Vang drie vissen vanaf de oever of de steiger"; }
function stapKant(dt) {
  const k = kant; k.t += dt; let top;
  if (k.fase === "loop") {
    stapLopen(dt); peppie.m.zet(loop.v > 0.3 ? "lopen" : "staan"); peppie.m.mixer.update(dt); top = houdHengel(loop.yaw, 0.85, 0.02); lijn.visible = false; dobber.visible = false;
    const doel = loop.pos.clone().addScaledVector(voor(loop.yaw), 17), kan = W.inWater(doel.x, doel.z) && W.diepte(doel.x, doel.z) > 0.8;
    knoppen({ A: kan ? "Werp" : null }); hud.tel.textContent = `${k.n} / 3`;
    if (kan && invoer.Atik) { k.fase = "worp"; k.t = 0; k.doel.copy(doel).setY(0); geluid.ruis({ duur: 0.3, freq: 3000, gain: 0.15 }); }
  } else if (k.fase === "worp") {
    peppie.m.zet("staan"); peppie.m.mixer.update(dt); const f = Math.min(1, k.t / 0.9); top = houdHengel(loop.yaw, 1.2 - Math.sin(f * Math.PI) * 0.7, 0.05);
    dobber.visible = true; dobber.position.lerpVectors(top, k.doel, f); dobber.position.y += Math.sin(f * Math.PI) * 4; zetLijn(top, dobber.position, 0.2);
    if (f >= 1) { k.fase = "wacht"; k.t = 0; k.wacht = tussen(4, 11); geluid.plons(0.4); spetter(k.doel, 10, 0.5); }
    knoppen({});
  } else if (k.fase === "wacht" || k.fase === "beet") {
    peppie.m.zet("staan"); peppie.m.mixer.update(dt); top = houdHengel(loop.yaw, 0.62, 0.02);
    const onder = k.fase === "beet"; dobber.position.copy(k.doel); dobber.position.y = onder ? -0.22 + Math.sin(k.t * 20) * 0.03 : Math.sin(k.t * 2.2) * 0.02; zetLijn(top, dobber.position, onder ? 0.05 : 0.6);
    knoppen({ A: onder ? "Sla aan!" : "Haal in" });
    if (!onder && k.t > k.wacht) { k.fase = "beet"; k.t = 0; geluid.piep(); spetter(k.doel, 6, 0.4); }
    else if (onder && invoer.Atik) { k.vis = nieuweVis(); k.fase = "dril"; beginDril(k.vis, loop.pos.distanceTo(k.doel)); }
    else if (onder && k.t > 1.6) { meld("Te laat… weg is hij"); k.fase = "loop"; }
    else if (!onder && invoer.Atik) k.fase = "loop";
  } else if (k.fase === "dril") {
    peppie.m.zet("staan"); peppie.m.mixer.update(dt); const uit = stapDril(dt, invoer.A);
    const ri = k.doel.clone().sub(loop.pos).setY(0).normalize(); k.doel.copy(loop.pos).addScaledVector(ri, dril.afstand).addScaledVector(V(ri.z, 0, -ri.x), Math.sin(k.t * 1.3) * 0.02 * dril.afstand).setY(0);
    top = houdHengel(Math.atan2(ri.x, ri.z), 0.75 + Math.sin(k.t * 1.4) * 0.22 + (invoer.A ? -0.12 : 0), 0.22 + dril.span * 0.22); // pompen: omhoog trekken, zakken en indraaien dobber.visible = false; zetLijn(top, k.doel.clone().setY(-0.1));
    if (Math.random() < dt * 4) spetter(k.doel, 4, 0.4);
    knoppen({ A: "Draai" });
    if (uit === "binnen") { vangst(k.vis); k.n++; k.fase = "loop"; if (k.n >= 3) einde(true, `Drie vissen: ${spel.vangsten.slice(-3).map((v) => v.soort).join(", ")}.`); }
    else if (uit === "breuk") { meld("Lijnbreuk! Te veel spanning."); geluid.fout(); k.fase = "loop"; } else if (uit === "los") { meld("Los… de lijn hing slap."); k.fase = "loop"; }
  }
  volg(loop.pos.clone().add(V(0, 1.4, 0)));
}

// ---------- missie 2: de bellyboat met livescope ----------
// Verticaal vissen: de hengel steekt recht vooruit, de lijn hangt recht omlaag. Eerst zoek je de vis op: met de stang draai je
// de transducer rond en op het scherm zie je wat er voor de bundel zwemt — scholen witvis, meervalletjes (kikkervisjes: dikke
// kop, pens, dunne staart), bolle karpers en in de diepe kolken de reuzen. Dan vaar je erheen tot de vis onder je hengeltop
// hangt, laat je het aas zakken tot zijn diepte en tik je tot hij pakt.
await laadBoten();
const scopeTex = new THREE.CanvasTexture(hud.scope); scopeTex.colorSpace = THREE.SRGBColorSpace;
// ieder zijn eigen bellyboat: Paul en Bob zwart met de Garmin, Wim kaki, Dave gifgroen; wie niet vaart ligt aangemeerd bij de linker steiger
const BB = Object.fromEntries(["paul", "bob", "wim", "dave"].map((n) => { const b = maakBellyboat(n, { scherm: scopeTex }); b.g.visible = false; scene.add(b.g); return [n, b]; }));
let bb = BB.paul, boot = bb.g;
const aangemeerd = [["wim", 19.6, 2.9, 0.25], ["dave", 21.4, 3.3, -0.15], ["bob", 12.4, 3.0, 0.4], ["paul", 14.2, 3.1, -0.3]].map(([soort, lx, lz, r]) => { const bb_ = maakBellyboat(soort), b = bb_.g, p = dom.wereld(lx, 0, dom.oeverZ(lx) + lz); bb_.motor.rotation.x = -1.25; bb_.motor.position.y += 0.32; bb_.motor.position.z -= 0.12; /* aangemeerd: de motor omhoog geklapt */ b.position.set(p.x, 0.02, p.z); b.rotation.y = huis.yaw + Math.PI / 2 + r; scene.add(b); return { soort, b, f: Math.random() * 6 }; });
/** Kies wie je speelt. */
function kiesSpeler(naam) {
  spelerNaam = naam;
  peppie = C[naam]; cocks = C[["bob", "dave", "wim", "paul"].find((n) => n !== naam)]; rest = Object.values(C).filter((w) => w !== peppie && w !== cocks);
  rest.forEach((w, i) => plekken[i](w)); legCocks(false); for (const w of Object.values(C)) w.g.visible = true;
  for (const b of Object.values(BB)) b.g.visible = false; bb = BB[naam]; boot = bb.g; for (const a of aangemeerd) a.b.visible = a.soort !== naam;
  for (const k of document.querySelectorAll("#spelers button")) k.classList.toggle("aan", k.dataset.speler === naam); try { localStorage.setItem("peppie-speler", naam); } catch {}
}
const belly = { wolk: null, pos: V(0, 0, 0), yaw: 0, sonar: 0, aas: 1, vis: null, klok: 0, scopeT: 0, top: V(0, 0, 0), slip: 0.75, vastTak: 0 };
const scope = new Livescope(hud.scope), chirp = new Chirp(hud.scope); scope.vooruit = 20;
let spelerNaam = "paul"; const strepen = () => spelerNaam === "wim"; // Wim heeft geen livescope, alleen zijn strepenkijker
const aasgedrag = new Aasgedrag(); let drilB = null; // de dril vanuit de bellyboat (src/meerval.js)
function beginBelly() {
  belly.pos.copy(W.steiger.eind).addScaledVector(u, 32); belly.yaw = huis.yaw; belly.sonar = 0; belly.aas = 1; belly.vis = null; belly.v = 0; belly.w = 0; drilB = null; cam.yaw = huis.yaw + Math.PI; cam.afstand = 6.5; cam.pitch = 0.3; zetWeergave("hoog");
  hud.missie.textContent = strepen() ? "Wim heeft alleen zijn strepenkijker: vaar over de vis heen, laat het aas zakken en sla aan als hij pakt" : "Zoek met de transducer (veeg over het scherm) een grote meerval, vaar erboven, laat het aas zakken tot voor zijn kop en sla aan als hij pakt"; hud.tel.textContent = "";
}
/** De hengel in de bellyboat: de kolf tegen je buik onder je onderarm, de hengel vooruit over de punt; op = opgeheven (0..1),
 *  duik = de top het water in. De reelhand op de reel (Wim links), de andere hand ervoor op de voorgreep. Geeft de top. */
function bellyHengel(b, f, op, bocht, duik = 0) { const m = peppie.m, buik = m.plek("DEF-spine001").clone().addScaledVector(f, 0.02).add(V(0, 0.1, 0)), links = V(f.z, 0, -f.x);
  const hoek = Math.max(0.08, 0.1 + op * 0.75 - duik * 0.3), d = f.clone().multiplyScalar(Math.cos(hoek)).setY(Math.sin(hoek));
  mhR.g.visible = !strepen(); mhL.g.visible = strepen(); hengelKort = strepen() ? mhL : mhR; hengelKort.buig(bocht); const top = hengelKort.leg(buik, d);
  const k = strepen() ? "L" : "R", ander = k === "R" ? "L" : "R", zijk = k === "R" ? -1 : 1;
  m.arm(k, hengelKort.reelHand(), V(0, -1, 0).addScaledVector(links, zijk * 0.7)); m.arm(ander, hengelKort.voorHand(), V(0, -1, 0).addScaledVector(links, -zijk * 0.7)); return top; }
const bodycam = { aan: false, schok: 0 };
/** Je eigen hoofd weg als je door je eigen ogen kijkt (anders zit het in beeld). */
function eigenHoofd(weg) { const hoofd = peppie.m.object.getObjectByName("DEF-head"); if (hoofd) hoofd.scale.setScalar(weg ? 0.001 : peppie.m.hoofdMaat ?? 1); for (const a of [peppie.m.pet, peppie.m.bril, peppie.m.hoed, peppie.m.gopro]) if (a) a.visible = !weg; }
function zetBodycam(aan) { bodycam.aan = aan; eigenHoofd(aan || belly.weergave === "zelf"); hud.scope.hidden = aan; $("#slip").hidden = !aan; }
function stapBelly(dt) {
  const b = belly, s = stuur(), f = voor(b.yaw), rechts = V(-f.z, 0, f.x); b.klok += dt;
  // varen met de motor: gas geven en sturen, met wat traagheid zoals een bellyboat op een elektromotor
  if (!drilB) { b.v += (s.y * 1.5 - b.v) * Math.min(1, dt * 1.2); b.w += (-s.x * 0.85 - b.w) * Math.min(1, dt * 3); b.yaw += b.w * dt;
    const nx = b.pos.x + f.x * b.v * dt, nz = b.pos.z + f.z * b.v * dt; if (W.diepte(nx, nz) > 0.7) b.pos.set(nx, 0, nz); else b.v = 0; }
  const vaart = b.v;
  // de transducerstang heb je altijd vast: vegen over het beeld (of over de livescope) draait hem, ook tijdens het varen
  const kn = invoer.toets; if (strepen()) invoer.sonarSleep = 0; b.sonar -= invoer.sonarSleep * 2.2; invoer.sonarSleep = 0; if (kn.KeyQ || kn.KeyZ) b.sonar += 1.4 * dt; if (kn.KeyC) b.sonar -= 1.4 * dt; b.sonar = klem(b.sonar, -2.6, 2.6);
  boot.visible = true; boot.position.set(b.pos.x, 0.0 + Math.sin(b.klok * 1.7) * 0.02, b.pos.z); boot.rotation.set(Math.sin(b.klok * 1.3) * 0.025 + (drilB ? drilB.trek * 0.06 : 0), b.yaw, Math.sin(b.klok * 1.1) * 0.025); bb.stang.rotation.y = b.sonar; bb.schroef.rotation.z += dt * (Math.abs(vaart) * 30); bb.motor.rotation.y = -s.x * 0.5;
  boot.updateMatrixWorld(true);
  peppie.m.zet("zitten"); peppie.m.mixer.update(dt); peppie.g.position.copy(boot.localToWorld(bb.zit.clone().add(V(0, 0.02, -0.05)))).add(V(0, -peppie.m.zithoogte(), 0)); peppie.g.rotation.set(-0.2 + (drilB ? -drilB.op * 0.25 : 0), b.yaw, 0, "YXZ"); // achterover in de hoge stoel; bij het pompen nog verder
  const bodem = W.diepte(b.pos.x, b.pos.z);
  // de bundel: vanaf de transducer rechts voorin, in de richting van de stang; ± 20 graden breed
  const bron = boot.localToWorld(V(0.74, 0, 0.78)), sy = b.yaw + b.sonar, fb = voor(sy), rb = V(-fb.z, 0, fb.x);
  const zie = (x, z) => { const rx = x - bron.x, rz = z - bron.z, v = rx * fb.x + rz * fb.z, lat = rx * rb.x + rz * rb.z; return Math.abs(lat) < 0.3 + Math.abs(v) * 0.17 ? v : null; };
  let top;
  if (!drilB) {
    // het aas: ▼ laten zakken, ▲ optillen; loslaten = stil houden
    const bodemTop = W.diepte(b.top.x, b.top.z);
    if (b.vastTak > 0) { b.vastTak -= dt; if (invoer.op && Math.random() < dt * 1.2) { b.vastTak = 0; meld("Los van de tak!", 1.5); } if (b.vastTak <= 0 && !(invoer.op)) {} }
    else { if (invoer.neer) b.aas += 1.6 * dt; if (invoer.op) b.aas -= 1.2 * dt; b.aas = klem(b.aas, 0.3, Math.max(0.4, bodemTop - 0.05));
      if (invoer.neer && W.bijTak?.(b.top.x, b.aas, b.top.z) && Math.random() < dt * 2) { b.vastTak = tussen(3, 8); meld("Vast aan een tak! Til op (▲) om los te komen", 2.5); } }
    const r = aasgedrag.stap(dt, vb.alle(), b.top, b.aas, bodemTop);
    // de top trilt als er aan geplukt wordt, en buigt als hij pakt
    const pakt = r.pakt, tril = pakt ? 0.06 + Math.sin(b.klok * 30) * 0.03 : r.pluk * (0.02 + Math.sin(b.klok * 22) * 0.015);
    top = bellyHengel(b, f, 0.02, 0.05 + tril * 2); b.top.copy(top);
    if (invoer.Atik) { // aanslaan
      if (pakt) { const v = pakt; if (v.lengte >= 1.6) b.wolk = { x: b.top.x, z: b.top.z, d: b.aas, t: 0 }; aasgedrag.pakt = null; v.nieuws = false; v.lok = null; v.vast = true; b.vis = v; drilB = new Dril(v, b.aas); geluid.stem(v.lengte >= 1.5 ? "groot" : "beet"); spetter(top.clone().setY(0), 12, 0.5); zetBodycam(true); hud.missie.style.opacity = 0; meld(v.soort === "Meerval" ? "Vast! Draai in (rode knop), pomp met ▲ ▼" : "Vast!", 2.5); }
      else { aasgedrag.mis(vb.alle(), b.top); b.aas = Math.max(0.3, b.aas - 0.7); } }
    knoppen({ A: " ", hoogte: true }); hud.A.classList.add("rood");
    zetLijn(top, V(top.x, -Math.min(b.aas, 2.5), top.z), 0);
    hud.tel.textContent = `${bodem.toFixed(1)} m diep · aas ${b.aas.toFixed(1)} m${r.aan ? " · ze zijn aan!" : ""}`;
  } else {
    // de dril: rode knop = indraaien, ▲ ▼ = pompen; de slip met + en − (rechts)
    const v = b.vis, d = drilB, uit = d.stap(dt, { draait: invoer.A, op: invoer.op, neer: invoer.neer, slip: b.slip });
    const duik = d.fase === "duik" ? Math.min(1, d.trek * 1.2) : 0;
    top = bellyHengel(b, f, 0.45 + d.op * 0.55, 0.32 + d.trek * 0.5 + duik * 0.15, duik * (b.slip > 0.6 ? 1 : 0.4)); b.top.copy(top); if (invoer.A && d.af === 0) hengelKort.draai(dt, 1.2);
    // de vis: onder de top, op de lengte van de lijn; hij zwerft heen en weer en sleept de boot mee als hij duikt
    v.h += Math.sin(b.klok * 0.7) * 0.6 * dt; const ver = Math.min(4, d.lijn * 0.35); v.x = top.x + Math.sin(v.h) * ver; v.z = top.z + Math.cos(v.h) * ver; v.d = klem(Math.sqrt(Math.max(0, d.lijn ** 2 - ver ** 2)), 0.3, W.diepte(v.x, v.z) - 0.2);
    if (d.fase === "duik" && b.slip > 0.5) { const nx = b.pos.x + Math.sin(v.h) * 0.25 * d.trek * dt, nz = b.pos.z + Math.cos(v.h) * 0.25 * d.trek * dt; if (W.diepte(nx, nz) > 1) b.pos.set(nx, 0, nz); }
    let dy = v.h - b.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); b.yaw += dy * Math.min(1, dt * 0.4);
    zetLijn(top, V(v.x, -v.d, v.z), 0); if (v.d < 0.8 && Math.random() < dt * 3) spetter(V(v.x, 0, v.z), 6, 0.6);
    // geluid: de slip gilt als de lijn eraf loopt, de reel ratelt als je indraait; soms een kreet van de maten
    geluid.zet("slip", Math.min(1, d.af * 0.8), 0.8 + Math.min(1, d.af) * 0.5); geluid.zet("reel", invoer.A && d.af === 0 ? 0.6 : 0, 1);
    if (d.fase === "duik" && Math.random() < dt * 0.3) geluid.stem("duik");
    bodycam.schok = Math.max(bodycam.schok * 0.9, duik * 0.04 + d.af * 0.01);
    hud.spanI.style.width = `${Math.min(100, d.trek * 80)}%`; hud.spanI.style.background = d.af > 0 ? "#e0432f" : d.trek < 0.15 ? "#7aa0c8" : "#57c26a"; hud.meter.textContent = `${d.lijn.toFixed(1)} m`; hud.span.hidden = hud.meter.hidden = false;
    $("#slipTekst").textContent = `slip ${Math.round(b.slip * 100)}%`;
    knoppen({ A: " ", hoogte: true }); hud.A.classList.add("rood");
    if (uit !== "bezig") { b.vis = null; drilB = null; v.vast = false; zetBodycam(false); geluid.zet("slip", 0); geluid.zet("reel", 0); hud.span.hidden = hud.meter.hidden = true;
      if (uit === "binnen") { geluid.speel("plons-meerval"); geluid.stem("binnen"); const tekst = vangst(v); vb.weg(v); spetter(b.pos.clone().addScaledVector(f, 0.9), 40, 1.2); if (v.soort === "Meerval" && v.lengte >= 2) einde(true, `${tekst}. Een echte reus!`); else meld(v.soort === "Meerval" ? `${tekst}. Nog geen twee meter…` : tekst, 4); }
      else { meld(uit === "breuk" ? "Lijnbreuk! De slip zat op slot." : "Los… de lijn hing slap toen hij omhoog kwam.", 4); geluid.fout(); v.x0 += tussen(-6, 6); } }
    hud.tel.textContent = `${bodem.toFixed(1)} m diep`;
  }
  if (b.wolk && (b.wolk.t += dt) > 3) b.wolk = null;
  // het scherm: tien keer per seconde een nieuw beeld, ook op het toestel op de arm
  if ((b.scopeT -= dt) <= 0) { b.scopeT = 0.1; const nu = new Date(), av = zie(top.x, top.z), tijd = `${String(nu.getHours()).padStart(2, "0")}:${String(nu.getMinutes()).padStart(2, "0")}`;
    const inBeeld = []; for (const v of vb.alle()) { const a = zie(v.x, v.z); if (a === null) continue; inBeeld.push({ v: a, d: v.d, lengte: v.lengte, hoek: v.h - sy, soort: v.soort, buig: Math.max(-1, Math.min(1, (v.draai ?? 0) * 2)), staand: v === b.vis && v.lengte >= 1.8 && drilB?.fase !== "omhoog", vis: v }); }
    if (strepen()) { const r = (x, z) => Math.hypot(x - bron.x, z - bron.z);
      chirp.stap(0.1, { onder: W.diepte(bron.x, bron.z), vissen: vb.alle().map((v) => ({ r: r(v.x, v.z), d: v.d, lengte: v.lengte })).filter((q) => q.r < 8),
        school: vb.scholen.flatMap((q) => { if (r(q.x, q.z) > 8) return []; const out = []; for (let i = 0; i < q.n; i++) { const o = vb.schoolPunt(q, i); out.push({ r: r(o.x, o.z), d: o.d }); } return out; }),
        aas: drilB ? null : { r: r(top.x, top.z), d: b.aas }, temp: 14.8 + Math.sin(b.klok * 0.4) * 0.05, snelheid: Math.abs(b.v) * 1.944, tijd });
    } else scope.teken({ bodem: (v) => W.diepte(bron.x + fb.x * v, bron.z + fb.z * v), vissen: inBeeld, aas: drilB || av === null ? null : { v: av, d: b.aas }, wolk: b.wolk ? (() => { const wv = zie(b.wolk.x, b.wolk.z); return wv === null ? null : { v: wv, d: b.wolk.d, t: b.wolk.t }; })() : null,
      school: vb.scholen.flatMap((q) => { const out = []; for (let i = 0; i < q.n; i++) { const o = vb.schoolPunt(q, i), v = zie(o.x, o.z); if (v !== null) out.push({ v, d: o.d }); } return out; }), planten: planten.inBundel(zie),
      takken: (W.takLijnen?.() ?? []).map((t_) => { const va = zie(t_.a[0], t_.a[2]), vb_ = zie(t_.b[0], t_.b[2]); return va === null && vb_ === null ? null : { v0: va ?? vb_, d0: t_.a[1], v1: vb_ ?? va, d1: t_.b[1] }; }).filter(Boolean),
      richting: b.sonar, onder: W.diepte(bron.x, bron.z), snelheid: Math.abs(b.v) * 1.944, volt: 12.5, temp: 14.78 + Math.sin(b.klok * 0.4) * 0.02, tijd });
    scopeTex.needsUpdate = true; }
  // de camera: tijdens de dril door je eigen ogen (bodycam); anders volgt hij de boot (tenzij je net zelf rondkeek)
  if (bodycam.aan) { const oog = peppie.m.plek("DEF-head").clone().addScaledVector(f, 0.1).add(V(0, 0.1, 0)), sch = bodycam.schok; // een camera op het hoofd (bij de hoofdlamp)
   
    camera.position.copy(oog).add(V((Math.random() - 0.5) * sch, (Math.random() - 0.5) * sch, (Math.random() - 0.5) * sch)); camera.lookAt(top.clone().lerp(oog, 0.15).add(V(0, -0.25 - (drilB?.fase === "duik" ? 0.3 : 0), 0)));
    zon.target.position.copy(b.pos); zon.position.copy(b.pos).add(V(40, 70, 25)); return; }
  if (belly.weergave === "zelf") { // door je eigen ogen: de hengel op de stang, het scherm, de bekerhouder en de tassen
    const oog = peppie.m.plek("DEF-head").clone().addScaledVector(f, 0.06).add(V(0, 0.08, 0)), ky = b.yaw + cam.zYaw, kp = cam.zPitch;
    camera.position.copy(oog); camera.lookAt(oog.clone().add(V(Math.sin(ky) * Math.cos(kp), Math.sin(kp), Math.cos(ky) * Math.cos(kp))));
    zon.target.position.copy(b.pos); zon.position.copy(b.pos).add(V(40, 70, 25)); return; }
  // hoog achter de boot, met zicht over de rivier (en op de boot zelf)
  cam.sleep = Math.max(0, cam.sleep - dt * 0.4); if (cam.sleep <= 0) { let d = b.yaw + Math.PI - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 1.6); cam.pitch += (0.42 - cam.pitch) * Math.min(1, dt * 2); }
  cam.afstand += (8.5 - cam.afstand) * Math.min(1, dt * 2);
  volg(b.pos.clone().add(V(0, 1.0, 0)).addScaledVector(f, 2.2));
}
/** Hoog (achter de boot, klein scherm linksboven), Zelf (door je eigen ogen, groter scherm) of Vol (alleen de livescope). */
function zetWeergave(w) { belly.weergave = w; for (const k of document.querySelectorAll("#weergave button")) k.classList.toggle("aan", k.dataset.w === w); hud.scope.hidden = false; eigenHoofd(w === "zelf" || bodycam.aan); cam.zYaw = 0; cam.zPitch = -0.32; plaatsScope(); }
function plaatsScope() { const sc = hud.scope, W_ = innerWidth, H_ = innerHeight, staand = H_ > W_, w = belly.weergave; let b, h, l = 8, tp = 52;
  if (w === "vol") { b = W_; h = H_; l = 0; tp = 0; }
  else if (staand) { b = (w === "zelf" ? 0.96 : 0.62) * W_; h = (b * 9) / 16; l = 6; tp = 52; }
  else { b = Math.min((w === "zelf" ? 0.5 : 0.3) * W_, (w === "zelf" ? 0.62 : 0.42) * H_ * 16 / 9); h = (b * 9) / 16; }
  sc.style.left = `${l}px`; sc.style.top = `${tp}px`; sc.style.width = `${b}px`; sc.style.height = `${h}px`; sc.classList.toggle("vol", w === "vol");
  // het canvas zelf in de juiste verhouding (scherp, ook als het klein is)
  const k = Math.min(devicePixelRatio, 2), cw = Math.max(480, Math.round(b * k)), ch = Math.max(270, Math.round(h * k)); if (sc.width !== cw || sc.height !== ch) { sc.width = cw; sc.height = ch; } }
addEventListener("resize", () => { if (spel.modus === "belly") plaatsScope(); });

// ---------- missie 3: de drone en het glas water ----------
const drone = new THREE.Group(); const rotors = []; { const zwart = new THREE.MeshStandardMaterial({ color: "#1c1e22", roughness: 0.5 }), grijs = new THREE.MeshStandardMaterial({ color: "#c9ccd0", roughness: 0.4 });
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), grijs); drone.add(romp); const cam_ = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), zwart); cam_.position.set(0, -0.03, 0.16); drone.add(cam_);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.26), zwart); a.position.set(x * 0.13, 0, z * 0.13); a.rotation.y = Math.atan2(x, z); drone.add(a);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.006, 14), new THREE.MeshStandardMaterial({ color: "#2a2d33", transparent: true, opacity: 0.45 })); r.position.set(x * 0.22, 0.035, z * 0.22); drone.add(r); rotors.push(r); }
  drone.traverse((o) => { if (o.isMesh) o.castShadow = true; }); drone.visible = false; scene.add(drone); }
// de echte drone: een DJI Mini (model van Sketchfab, CC BY, zie README); 25 cm breed, neus naar voren; de oude doos-drone weg
{ const { GLTFLoader } = await import("../lib/three-addons.js"), { MeshoptDecoder } = await import("../lib/meshopt_decoder.mjs");
  const g = (await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(`assets/drone/drone.glb?v=${window.VERSIE ?? ""}`)).scene; const b = new THREE.Box3().setFromObject(g), m = b.getSize(V(0, 0, 0)), c = b.getCenter(V(0, 0, 0)), k = 0.25 / Math.max(m.x, m.z);
  g.position.set(-c.x * k, -c.y * k, -c.z * k); g.scale.setScalar(k); g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.material.metalness = 0.1; } });
  for (const o of [...drone.children]) if (!rotors.includes(o)) drone.remove(o); drone.add(g); for (const r of rotors) { r.scale.setScalar(0.62); r.position.multiplyScalar(0.55); r.position.y = 0.03; r.material.opacity = 0.07; } }
const glas = new THREE.Group(); { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.11, 12, 1, true), new THREE.MeshStandardMaterial({ color: "#dff1f6", transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.05 })); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.085, 12), new THREE.MeshStandardMaterial({ color: "#58b8e0", transparent: true, opacity: 0.8 })); w.position.y = -0.008; glas.add(g, w); glas.visible = false; scene.add(glas); }
const dr = { pos: V(0, 0, 0), yaw: 0, v: V(0, 0, 0), glas: "hangt", gp: V(0, 0, 0), gv: 0, accu: 100, snurk: 0, over: 3 };
// Paul en Bob vliegen samen, stomdronken, vanaf het gras. Eén van de twee heeft de afstandsbediening; de ander drinkt.
// Ze wankelen, nemen een slok, en soms valt er een om: dan gaat de drone alle kanten op en pakt de ander de bediening.
// Dave ligt boven in de toren zijn roes uit te slapen; Wim zit nuchter aan de picknicktafel met zijn Fristi.
const piloot = { lijst: [], t: 0 };
const ab = new THREE.Group(); { const zw = new THREE.MeshStandardMaterial({ color: "#2a2c30", roughness: 0.5 }); const k = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.035, 0.09), zw); ab.add(k);
  for (const x of [-0.05, 0.05]) { const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.025, 6), zw); st.position.set(x, 0.025, 0); ab.add(st); }
  const tel = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.008, 0.075), new THREE.MeshStandardMaterial({ color: "#10141a", emissive: "#3a6aa0", emissiveIntensity: 0.6 })); tel.position.set(0, 0.06, -0.03); tel.rotation.x = -0.9; ab.add(tel); ab.visible = false; scene.add(ab); }
const blikMat = new THREE.MeshStandardMaterial({ color: "#16803a", roughness: 0.3, metalness: 0.55 });
const maakBlik = () => { const b = spul.vorm("blik", 0.066); b.scale.setScalar(1.9); b.traverse((o) => { if (o.isMesh) o.material = blikMat; }); b.visible = false; scene.add(b); return b; };
function beginDrone() {
  // rollen: Paul en Bob vliegen, Dave slaapt, Wim aan tafel
  cocks = C.dave; rest = [C.wim]; plekken[1](C.wim); for (const w of Object.values(C)) w.g.visible = true;
  const basis = W.tuin.clone(); piloot.lijst = [C.paul, C.bob].map((w, i) => { const p = basis.clone().addScaledVector(t, i ? 0.9 : -0.9).addScaledVector(u, -1.5); p.y = W.hoogte(p.x, p.z);
    w.g.position.copy(p); w.g.rotation.set(0, huis.yaw + Math.PI + (i ? 0.25 : -0.25), 0); w.m.zet("staan", 1, null); return { w, basis: p.clone(), fase: Math.random() * 6, val: 0, drink: 3 + Math.random() * 6, slok: 0, blik: w.blik ??= maakBlik(), wandel: V(0, 0, 0) }; });
  piloot.heeft = piloot.lijst[Math.random() < 0.5 ? 0 : 1]; piloot.valT = tussen(18, 35); piloot.hikT = tussen(4, 9); ab.visible = true;
  dr.pos.copy(W.tuin).setY(W.hoogte(W.tuin.x, W.tuin.z) + 1.3); dr.yaw = huis.yaw + Math.PI; dr.v.set(0, 0, 0); Object.assign(dr, { glas: "hangt", accu: 110, over: 3, schok: 0 }); cam.pitch = 0.18; legCocks(false);
  hud.missie.textContent = "Paul en Bob vliegen (stomdronken). Vlieg door het torenraam en laat het glas water op Dave vallen"; }
/** Botst een bol (in de wereld) tegen het huis, de grond of een ander huis? */
function droneBotst(p, r = 0.28) { if (p.y < Math.max(0, W.hoogte(p.x, p.z)) + r) return true; const l = huis.naarBinnen(p); for (const [x0, y0, z0, x1, y1, z1] of W.dozen) if (l.x > x0 - r && l.x < x1 + r && l.y > y0 - r && l.y < y1 + r && l.z > z0 - r && l.z < z1 + r) return true;
  if (Math.abs(l.x) > huis.BX / 2 + 1 || Math.abs(l.z) > huis.BZ / 2 + 1) { if (p.y < 9 && W.inHuis(p.x, p.z, r)) return true; } return false; }
function stapPiloten(dt) {
  piloot.t += dt; const uit = { wiebel: { x: 0, y: 0, h: 0 }, dood: false };
  for (const p of piloot.lijst) { const m = p.w.m, heeft = p === piloot.heeft;
    if (p.val > 0) { // ligt in het gras, en krabbelt dan op
      p.val -= dt; if (p.val < 2.6 && m.huidig !== "LayToIdle") m.zet("opstaan", 1, 0); if (p.val <= 0) m.zet("staan");
      m.mixer.update(dt); p.blik.visible = !heeft; if (!heeft) { p.blik.position.copy(p.w.g.position).addScaledVector(t, 0.4).setY(p.w.g.position.y + 0.04); p.blik.rotation.set(0, 0, Math.PI / 2); } if (heeft) uit.dood = true; continue; }
    // wankelen: om de voeten heen, en af en toe een stapje opzij
    p.fase += dt; const zw = Math.sin(p.fase * 0.9) * 0.07 + Math.sin(p.fase * 2.3 + 1) * 0.03, vw = Math.sin(p.fase * 0.7 + 2) * 0.05;
    p.wandel.lerp(V(Math.sin(p.fase * 0.31) * 0.5, 0, Math.cos(p.fase * 0.23) * 0.35), dt * 0.5); p.w.g.position.copy(p.basis).addScaledVector(t, p.wandel.x).addScaledVector(u, p.wandel.z);
    p.w.g.rotation.x = vw; p.w.g.rotation.z = zw; m.zet("staan", 0.7); m.mixer.update(dt);
    const g = p.w.g, fv = voor(g.rotation.y), borst = m.plek("DEF-spine003").clone(), mond = m.plek("DEF-head").clone().addScaledVector(fv, 0.12).add(V(0, -0.05, 0)), links = V(fv.z, 0, -fv.x);
    // een slok: de ander vaak, de piloot soms (dan één hand van de bediening!)
    if ((p.drink -= dt) <= 0 && p.slok <= 0) { p.slok = 2.4; p.drink = heeft ? tussen(14, 24) : tussen(5, 10); }
    const drinkt = p.slok > 0; if (drinkt) p.slok -= dt; const op = drinkt ? Math.sin(Math.min(1, (2.4 - p.slok) / 2.4) * Math.PI) : 0;
    if (heeft) { const voorBorst = borst.clone().addScaledVector(fv, 0.32).add(V(0, -0.12, 0)); ab.position.copy(voorBorst); ab.rotation.set(0.5, g.rotation.y, 0, "YXZ");
      m.arm("L", voorBorst.clone().addScaledVector(links, 0.08), V(0, -1, 0)); if (!drinkt) m.arm("R", voorBorst.clone().addScaledVector(links, -0.08), V(0, -1, 0));
      uit.wiebel.x = zw * 3.5; uit.wiebel.y = vw * 3; uit.wiebel.h = Math.sin(p.fase * 1.7) * 0.5; if (drinkt) { uit.wiebel.x += Math.sin(piloot.t * 3) * 0.6; uit.wiebel.h -= 0.5; } }
    const hand = drinkt ? borst.clone().lerp(mond, op).addScaledVector(fv, 0.05 * (1 - op)) : borst.clone().addScaledVector(links, -0.28).add(V(0, -0.35, 0)).addScaledVector(fv, 0.08);
    if (!heeft || drinkt) { m.arm("R", hand, V(0, -1, 0)); p.blik.visible = true; p.blik.position.copy(m.plek("DEF-handR")).add(V(0, -0.06, 0)); p.blik.rotation.set(drinkt ? -op * 1.9 : 0, g.rotation.y, 0, "YXZ"); } else p.blik.visible = false; }
  // af en toe valt er een om; heeft hij de bediening, dan pakt de ander hem op zodra hij kan
  if ((piloot.valT -= dt) <= 0) { piloot.valT = tussen(22, 45); const p = piloot.lijst[Math.random() < 0.6 ? piloot.lijst.indexOf(piloot.heeft) : 1 - piloot.lijst.indexOf(piloot.heeft)];
    if (p.val <= 0) { p.val = 6; p.w.m.zet("liggen", 1, 0); geluid.ruis({ duur: 0.4, freq: 300, gain: 0.4 }); meld(`${p.w === C.paul ? "Paul" : "Bob"} gaat onderuit!`, 2.5);
      if (p === piloot.heeft) setTimeout(() => { const ander = piloot.lijst.find((q) => q !== p); if (ander.val <= 0 && spel.modus === "drone") { piloot.heeft = ander; meld(`${ander.w === C.paul ? "Paul" : "Bob"} pakt de bediening`, 2); } }, 1500); } }
  if (piloot.heeft.val > 0) { ab.position.copy(piloot.heeft.w.g.position).addScaledVector(u, 0.5).setY(piloot.heeft.w.g.position.y + 0.03); ab.rotation.set(0, 0.5, 0); }
  if ((piloot.hikT -= dt) <= 0) { piloot.hikT = tussen(5, 11); geluid.toon({ freq: 320, freq2: 520, duur: 0.12, type: "triangle", gain: 0.05 }); }
  if (piloot.nuchter) { uit.wiebel = { x: 0, y: 0, h: 0 }; uit.dood = false; } // alleen voor de test
  return uit;
}
function stapDrone(dt) {
  const s0 = stuur(), pl = stapPiloten(dt), s = { x: pl.dood ? 0 : s0.x + pl.wiebel.x, y: pl.dood ? 0 : s0.y + pl.wiebel.y }; dr.yaw = cam.yaw + Math.PI; const f = voor(dr.yaw), rechts = V(-f.z, 0, f.x);
  if (pl.dood) dr.v.add(V(Math.sin(spel.t * 7) * 3, -1.2, Math.cos(spel.t * 5) * 3).multiplyScalar(dt)); // de bediening ligt in het gras: de drone zwalkt en zakt
  const doel = f.clone().multiplyScalar(s.y * 3.6).addScaledVector(rechts, s.x * 2.6); doel.y = pl.dood ? -0.6 : (invoer.op ? 2.2 : 0) - (invoer.neer ? 2.2 : 0) + pl.wiebel.h; dr.v.lerp(doel, Math.min(1, dt * (pl.dood ? 0.6 : 3.5)));
  for (const as of ["x", "y", "z"]) { const p = dr.pos.clone(); p[as] += dr.v[as] * dt; if (droneBotst(p)) dr.v[as] *= -0.25; else dr.pos.copy(p); }
  dr.accu -= dt; drone.visible = true; drone.position.copy(dr.pos); drone.rotation.set(dr.v.dot(f) * 0.07, dr.yaw, -dr.v.dot(rechts) * 0.08, "YXZ"); for (const r of rotors) r.rotation.y += dt * 60;
  cocks.m.mixer.update(cocks.wakker ? dt : 0);
  if (!cocks.wakker && (dr.snurk -= dt) <= 0) { dr.snurk = 3.2; if (dr.pos.distanceTo(huis.bed) < 14) geluid.snurk(); }
  glas.visible = dr.glas !== "weg";
  if (dr.glas === "hangt") { glas.position.copy(dr.pos).add(V(0, -0.16, 0)); glas.rotation.set(0, 0, 0); if (invoer.Atik) { dr.glas = "valt"; dr.gp.copy(glas.position); dr.gv = 0; dr.over--; } }
  else if (dr.glas === "valt") { dr.gv -= 9.8 * dt; dr.gp.y += dr.gv * dt; glas.position.copy(dr.gp); glas.rotation.x += dt * 5;
    const l = huis.naarBinnen(dr.gp), binnen = Math.abs(l.x) < huis.BX / 2 && Math.abs(l.z) < huis.BZ / 2 && dr.gp.y > huis.vloerY - 0.2, grond = binnen ? huis.vloerY + 0.15 : Math.max(0, W.hoogte(dr.gp.x, dr.gp.z)) + 0.05, opBed = binnen && Math.hypot(dr.gp.x - huis.bed.x, dr.gp.z - huis.bed.z) < 1.05;
    if (dr.gp.y <= (opBed ? huis.bed.y + 0.25 : grond)) { dr.glas = "weg"; spetter(dr.gp.clone(), opBed ? 40 : 14, opBed ? 0.9 : 0.5); geluid.plons(opBed ? 0.8 : 0.3); geluid.toon({ freq: 3200, freq2: 900, duur: 0.18, type: "triangle", gain: 0.05 });
      if (opBed) { legCocks(true); geluid.toon({ freq: 300, freq2: 520, duur: 0.5, type: "sawtooth", gain: 0.07, start: 0.2 }); einde(true, "Raak! Cocks zit rechtop in bed, drijfnat."); }
      else if (dr.over > 0) { meld(`Mis! Nog ${dr.over} ${dr.over === 1 ? "glas" : "glazen"}.`); setTimeout(() => { if (spel.modus === "drone" && !spel.klaar) dr.glas = "hangt"; }, 1500); } else einde(false, "Alle glazen zijn op. Cocks slaapt rustig verder."); } }
  knoppen({ A: dr.glas === "hangt" ? "Laat los" : null, hoogte: true }); hud.tel.textContent = `accu ${Math.max(0, Math.ceil(dr.accu))} s · glazen ${dr.over + (dr.glas === "hangt" ? 1 : 0)}`;
  if (dr.accu <= 0) einde(false, "De accu is leeg; de drone ligt in de tuin.");
  // de camera vlak achter de drone, zodat je door het raam kunt mikken
  const cp = dr.pos.clone().addScaledVector(f, -1.25 * Math.cos(cam.pitch)).add(V(0, 0.28 + Math.sin(cam.pitch) * 1.1, 0)); camera.position.lerp(cp, Math.min(1, dt * 12)); camera.lookAt(dr.pos.clone().addScaledVector(f, 2).add(V(0, -0.3 - cam.pitch * 1.2, 0)));
  zon.target.position.copy(dr.pos); zon.position.copy(dr.pos).add(V(40, 70, 25));
}

// ---------- missie 4: beverratten scheppen vanaf de steiger ----------
function maakRat() { const g = new THREE.Group(), bruin = new THREE.MeshStandardMaterial({ color: "#5b4230", roughness: 0.95 });
  const lijf = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), bruin); lijf.scale.set(0.85, 0.7, 1.6); lijf.position.y = 0.02; const kop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), bruin); kop.scale.z = 1.25; kop.position.set(0, 0.08, 0.36);
  const neus = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), new THREE.MeshStandardMaterial({ color: "#1a1412" })); neus.position.set(0, 0.07, 0.5); const tand = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.04, 0.01), new THREE.MeshStandardMaterial({ color: "#f08a1c" })); tand.position.set(0, 0.02, 0.48);
  const staart = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.008, 0.5, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#3a2a22" })); staart.position.set(0, 0, -0.55); g.add(lijf, kop, neus, tand, staart);
  for (const k of [-1, 1]) { const oor = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), bruin); oor.position.set(k * 0.08, 0.16, 0.3); g.add(oor); const snor = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.003, 0.003), new THREE.MeshStandardMaterial({ color: "#ddd" })); snor.position.set(k * 0.1, 0.06, 0.47); g.add(snor); }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; }); scene.add(g); return g; }
const net = new THREE.Group(); { const steel = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 2.4, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: "#2a2d30", metalness: 0.6, roughness: 0.4 })); steel.position.z = 1.2;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.014, 6, 18).rotateX(Math.PI / 2), steel.material); ring.position.z = 2.7; const zak = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.45, 12, 1, true), new THREE.MeshStandardMaterial({ color: "#3d5a3a", transparent: true, opacity: 0.7, side: THREE.DoubleSide })); zak.rotation.x = Math.PI; zak.position.set(0, -0.23, 2.7); net.add(steel, ring, zak); net.visible = false; scene.add(net); }
const kooi = new THREE.Group(); { const m = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.55), new THREE.MeshStandardMaterial({ color: "#8a8f94", wireframe: true })); m.position.y = 0.23; kooi.add(m); kooi.visible = false; scene.add(kooi); }
const rat = { lijst: [], n: 0, tijd: 0, zwaai: 0, gevangen: [] };
function nieuweRat(r = {}) { const kant_ = Math.random() < 0.5 ? 1 : -1; Object.assign(r, { langs: -kant_ * tussen(22, 40), uit: tussen(0.6, 6), v: kant_ * tussen(0.7, 1.5), duik: 0, f: Math.random() * 6 }); r.m ??= maakRat(); r.m.visible = true; return r; }
function beginRat() { for (const r of rat.lijst) r.m.visible = false; for (const g of rat.gevangen) scene.remove(g); rat.gevangen = []; rat.lijst = [0, 1, 2, 3, 4].map((i) => nieuweRat(rat.lijst[i] ?? {})); Object.assign(rat, { n: 0, tijd: 120, zwaai: 0 });
  loop.pos.copy(W.steiger.midden); loop.yaw = huis.yaw; cam.yaw = huis.yaw + Math.PI; cam.afstand = 5.5; cam.pitch = 0.4; kooi.visible = true; kooi.position.copy(W.steiger.begin).addScaledVector(u, 1.2).setY(W.steiger.dek); kooi.rotation.y = huis.yaw;
  hud.missie.textContent = "Schep vijf beverratten vanaf de steiger. Loop rustig, anders duiken ze onder."; }
function stapRat(dt) {
  stapLopen(dt, 3); peppie.m.zet(loop.v > 0.3 ? "lopen" : "staan"); peppie.m.mixer.update(dt); rat.tijd -= dt; rat.zwaai = Math.max(0, rat.zwaai - dt * 2.4);
  const f = voor(loop.yaw), hand = peppie.m.plek("DEF-handR"), zw = Math.sin(rat.zwaai * Math.PI); net.visible = true; net.position.copy(hand); net.rotation.set(0.25 + zw * 0.55, loop.yaw, 0, "YXZ");
  peppie.m.arm("R", peppie.m.plek("DEF-spine002").clone().addScaledVector(f, 0.4).add(V(0, -0.1 - zw * 0.2, 0)), V(0, -1, 0));
  const opSteiger = W.opSteiger(loop.pos.x, loop.pos.z) !== null, netPunt = loop.pos.clone().addScaledVector(f, 2.5).setY(0);
  for (const r of rat.lijst) { r.langs += r.v * dt; r.f += dt; const p = W.steiger.begin.clone().addScaledVector(u, 1.5 + r.uit).addScaledVector(t, r.langs);
    const dichtbij = Math.hypot(p.x - loop.pos.x, p.z - loop.pos.z); if (dichtbij < 6.5 && loop.v > 2.4 && r.duik <= 0) { r.duik = 3; spetter(p.clone().setY(0.05), 8, 0.4); geluid.plons(0.25); } r.duik -= dt;
    r.m.position.set(p.x, (r.duik > 0 ? -0.6 : -0.07) + Math.sin(r.f * 3) * 0.012, p.z); r.m.rotation.y = huis.yaw + (r.v > 0 ? Math.PI / 2 : -Math.PI / 2) * (t.x * Math.cos(huis.yaw) - t.z * Math.sin(huis.yaw) > 0 ? 1 : -1);
    if (r.duik <= 0 && Math.random() < dt * 3) fx.deeltje(p.clone().setY(0.03).addScaledVector(t, -Math.sign(r.v) * 0.5), { leven: 0.9, kleur: "#e6f2f4", r0: 0.05, r1: 0.35, v: V(0, 0.05, 0), a: 0.5 });
    if (Math.abs(r.langs) > 44) nieuweRat(r);
    if (rat.zwaai > 0.45 && rat.zwaai < 0.6 && r.duik <= 0 && opSteiger && Math.hypot(p.x - netPunt.x, p.z - netPunt.z) < 1.15 && !spel.klaar) {
      rat.n++; geluid.goed(); spetter(p.clone().setY(0.05), 20, 0.8); const g = maakRat(); g.scale.setScalar(0.75); g.position.copy(kooi.position).add(V(tussen(-0.2, 0.2), 0.12 + rat.gevangen.length * 0.02, tussen(-0.12, 0.12))); g.rotation.y = Math.random() * 6; rat.gevangen.push(g); nieuweRat(r);
      meld(kies(["Hebbes!", "Die zit!", "Mooi geschept!"]), 1.5); if (rat.n >= 5) einde(true, `Vijf beverratten in de kooi, met nog ${Math.ceil(rat.tijd)} seconden over.`); } }
  if (invoer.Atik && rat.zwaai <= 0) { rat.zwaai = 1; geluid.ruis({ duur: 0.25, freq: 2500, gain: 0.12 }); setTimeout(() => { if (spel.modus === "rat") { geluid.plons(0.3); spetter(netPunt, 8, 0.5); } }, 200); }
  knoppen({ A: "Schep" }); hud.tel.textContent = `${rat.n} / 5 · ${Math.max(0, Math.ceil(rat.tijd))} s`;
  if (rat.tijd <= 0) einde(false, `De tijd is om: ${rat.n} van de 5.`);
  volg(loop.pos.clone().add(V(0, 1.3, 0)));
}

// ---------- camera ----------
function volg(doel) { const p = doel.clone().add(V(Math.sin(cam.yaw) * Math.cos(cam.pitch) * cam.afstand, Math.sin(cam.pitch) * cam.afstand + 0.3, Math.cos(cam.yaw) * Math.cos(cam.pitch) * cam.afstand)); p.y = Math.max(p.y, Math.max(0, W.hoogte(p.x, p.z)) + 0.35); camera.position.copy(p); camera.lookAt(doel); zon.target.position.copy(doel); zon.position.copy(doel).add(V(40, 70, 25)); }

// ---------- menu en lus ----------
const MISSIES = { kant: [beginKant, stapKant], belly: [beginBelly, stapBelly], drone: [beginDrone, stapDrone], rat: [beginRat, stapRat] };
function start(modus) { geluid.start(); Object.assign(spel, { modus, klaar: false, t: 0 }); $("#menu").hidden = $("#uitslag").hidden = true; $("#hud").hidden = false;
  boot.visible = drone.visible = glas.visible = net.visible = kooi.visible = dobber.visible = lijn.visible = hengel.g.visible = mhR.g.visible = mhL.g.visible = false; if (bodycam.aan) zetBodycam(false); drilB = null; geluid.zet("slip", 0); geluid.zet("reel", 0); hud.scope.hidden = true; hud.span.hidden = hud.meter.hidden = true; dril.aan = false; ab.visible = false; $("#pip").hidden = modus !== "drone"; for (const w of Object.values(C)) { w.g.rotation.x = w.g.rotation.z = 0; if (w.blik) w.blik.visible = false; } if (modus !== "drone") { kiesSpeler(spelerNaam); legCocks(false); } for (const r of rat.lijst) r.m.visible = false;
  hud.melding.hidden = true; meldT = 0; hud.missie.style.opacity = 1; clearTimeout(start.vervaag); start.vervaag = setTimeout(() => { hud.missie.style.opacity = 0; }, 6000);
  // met de livescope in beeld schuift het beeld naar rechtsonder, zodat de belly boat naast het scherm te zien is
  camera.clearViewOffset(); $("#stick").hidden = false; $("#weergave").hidden = modus !== "belly";
  MISSIES[modus][0](); }
function naarMenu() { camera.clearViewOffset(); if (bodycam.aan) zetBodycam(false); drilB = null; geluid.zet("slip", 0); geluid.zet("reel", 0); mhR.g.visible = mhL.g.visible = false; ab.visible = false; $("#pip").hidden = true; for (const w of Object.values(C)) { w.g.rotation.x = w.g.rotation.z = 0; if (w.blik) w.blik.visible = false; } kiesSpeler(spelerNaam); spel.modus = "menu"; $("#menu").hidden = false; $("#uitslag").hidden = true; $("#hud").hidden = true; }
for (const k of document.querySelectorAll("#menu [data-missie]")) k.addEventListener("click", () => start(k.dataset.missie));
$("#opnieuw").addEventListener("click", () => start(spel.modus)); for (const k of document.querySelectorAll("#weergave button")) k.addEventListener("click", () => zetWeergave(k.dataset.w));
for (const [id, d] of [["#slipMin", -0.1], ["#slipPlus", 0.1]]) $(id).addEventListener("pointerdown", (e) => { e.preventDefault(); belly.slip = klem(belly.slip + d, 0.2, 1); $("#slipTekst").textContent = `slip ${Math.round(belly.slip * 100)}%`; }); $("#terug").addEventListener("click", naarMenu); $("#stop").addEventListener("click", naarMenu);
const klok = new THREE.Clock(); let menuT = 0;
function lus() {
  const dt = Math.min(klok.getDelta(), 0.05); spel.t += dt;
  if (spel.modus === "menu") { // een rustig rondje boven de rivier
    menuT += dt * 0.06; const c = W.oeverPunt.clone().addScaledVector(u, 25); camera.position.set(c.x + Math.sin(menuT) * 70, 26, c.z + Math.cos(menuT) * 70); camera.lookAt(c.x, 2, c.z); zon.target.position.copy(c); zon.position.copy(c).add(V(40, 70, 25));
    peppie.g.position.copy(W.steiger.eind).addScaledVector(u, -1).setY(W.steiger.dek); peppie.g.rotation.set(0, huis.yaw, 0); peppie.m.zet("staan"); peppie.m.mixer.update(dt);
  } else if (spel.modus === "kijk") { /* camera van buitenaf (tools/kijk.cjs) */ } else if (!spel.klaar || spel.modus === "drone") MISSIES[spel.modus][1](dt);
  if (meldT > 0 && (meldT -= dt) <= 0) hud.melding.hidden = true;
  // achtergrondgeluid: de rivier met vogels, wind in de bomen, en het kabbelen van het water als je bij de oever bent
  if (geluid.ctx) { const cp = camera.position, oever = Math.abs(W.oever(cp.x, cp.z)); geluid.zet("rivier-vogels", 0.32); geluid.zet("wind-bomen", 0.16); geluid.zet("kabbelen", Math.max(0, 0.4 - oever / 30)); }
  for (const a of aangemeerd) { a.f += dt; a.b.position.y = 0.02 + Math.sin(a.f * 1.5) * 0.015; }
  for (const w of rest) w.m.mixer.update(dt); for (const w of Object.values(C)) for (const a of [w.m.pet, w.m.bril, w.m.hoed, w.m.gopro]) a?.userData.pas?.();
  kippen.stap(dt, spel.modus === "kant" || spel.modus === "rat" ? { x: loop.pos.x, z: loop.pos.z, v: loop.v } : null);
  invoer.Atik = invoer.Btik = false; fx.stap(dt); bomen.stap(dt, camera); water.stap(dt); vb.stap(dt, spel.modus === "belly" ? belly.pos : spel.modus === "kant" || spel.modus === "rat" ? loop.pos.clone().addScaledVector(u, 20) : W.steiger.eind.clone().addScaledVector(u, 25), camera);
  renderer.render(scene, camera);
  // in de drone-missie rechtsboven een tweede beeld: Paul en Bob op het gras, zodat je ze altijd ziet
  if (spel.modus === "drone" && piloot.lijst.length) { const el = $("#pip"), r = el.getBoundingClientRect(), H = renderer.domElement.clientHeight;
    const a = piloot.lijst[0].basis, b = piloot.lijst[1].basis, mid = a.clone().lerp(b, 0.5); pipCam.position.copy(mid).addScaledVector(u, -3.3).add(V(0, 2.1, 0)); pipCam.lookAt(mid.x, mid.y + 0.95, mid.z); pipCam.aspect = r.width / r.height; pipCam.updateProjectionMatrix();
    renderer.setScissorTest(true); renderer.setScissor(r.left, H - r.bottom, r.width, r.height); renderer.setViewport(r.left, H - r.bottom, r.width, r.height); renderer.render(scene, pipCam);
    renderer.setScissorTest(false); renderer.setViewport(0, 0, renderer.domElement.clientWidth, H); }
  requestAnimationFrame(lus);
}
for (const k of document.querySelectorAll("#spelers button")) k.addEventListener("click", () => kiesSpeler(k.dataset.speler));
kiesSpeler((() => { try { return localStorage.getItem("peppie-speler"); } catch { return null; } })() || "paul");
$("#laden").hidden = true; $("#menu").hidden = false;
window.__spel = { mhR, mhL, aasgedrag, get drilB() { return drilB; }, bodycam, piloot, chirp, C, kiesSpeler, get dave() { return C.dave; }, get wim() { return C.wim; }, vb, kippen, zon, THREE, spel, W, start, belly, dr, rat, kant, loop, cam, invoer, dril, get peppie() { return peppie; }, get cocks() { return cocks; }, scope, camera, stapDril, MISSIES };
requestAnimationFrame(lus);
