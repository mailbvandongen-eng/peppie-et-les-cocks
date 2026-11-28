// Peppie et les Cocks — vissen op de Lot bij Le Temple-sur-Lot. Eerste, grove versie.
// Vier missies: vissen vanaf de kant, met de belly boat en de livescope op meerval, met de drone een glas water
// op de slapende Cocks laten vallen, en beverratten scheppen vanaf de steiger.
import * as THREE from "three";
import { laadMensen, maakMens, zetPet } from "./mensen.js";
import { Effecten } from "./effecten.js";
import { Livescope } from "./livescope.js";
import { bouwWereld } from "./wereld.js";
import { laadVisspullen } from "./hengel.js";
import { Kippen } from "./kippen.js";
import { maakBellyboat } from "./bellyboat.js";
import { maakWater } from "./water.js";
import { laadBomen } from "./natuur.js";
import { maakVisbestand } from "./vissen.js";
import { maakWaterplanten } from "./planten.js";

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
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 900);
scene.add(new THREE.HemisphereLight("#dcefff", "#6f7a4e", 0.9));
const zon = new THREE.DirectionalLight("#fff2d8", 2.6); zon.castShadow = true; zon.shadow.mapSize.set(2048, 2048); Object.assign(zon.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 260 }); zon.shadow.bias = -0.0006; scene.add(zon, zon.target);
function pasAan() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener("resize", pasAan); pasAan();

// ---------- geluid: een paar eenvoudige klanken ----------
const geluid = { ctx: null,
  start() { this.ctx ??= new (window.AudioContext || window.webkitAudioContext)(); this.ctx.resume?.(); },
  toon({ freq, freq2 = freq, duur, type = "sine", gain = 0.1, start = 0 }) { const c = this.ctx; if (!c) return; const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start; o.type = type; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, freq2), t + duur); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.0005, t + duur); o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + duur + 0.02); },
  ruis({ duur, freq = 1200, gain = 0.3, start = 0 }) { const c = this.ctx; if (!c) return; const n = Math.ceil(c.sampleRate * duur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = b; f.type = "lowpass"; f.frequency.value = freq; g.gain.value = gain; s.connect(f); f.connect(g); g.connect(c.destination); s.start(c.currentTime + start); },
  plons(v = 1) { this.ruis({ duur: 0.7, freq: 1500, gain: 0.5 * v }); this.ruis({ duur: 0.3, freq: 4000, gain: 0.25 * v, start: 0.04 }); },
  piep() { for (let i = 0; i < 4; i++) this.toon({ freq: 2300, duur: 0.07, gain: 0.04, start: i * 0.11 }); },
  goed() { [523, 659, 784, 1047].forEach((f, i) => this.toon({ freq: f, duur: 0.22, type: "triangle", gain: 0.09, start: i * 0.11 })); },
  fout() { this.toon({ freq: 220, freq2: 110, duur: 0.4, type: "sawtooth", gain: 0.06 }); },
  snurk() { this.ruis({ duur: 1.1, freq: 260, gain: 0.35 }); this.ruis({ duur: 0.9, freq: 700, gain: 0.12, start: 1.3 }); },
  slip() { this.ruis({ duur: 0.25, freq: 5000, gain: 0.12 }); },
  // kippen: getok, gekakel en de haan (zacht, en alleen als je er dichtbij bent)
  tok(v = 1) { for (let i = 0; i < 2 + ((Math.random() * 3) | 0); i++) this.toon({ freq: 520 + Math.random() * 80, freq2: 380, duur: 0.07, type: "square", gain: 0.018 * v, start: i * 0.16 }); },
  kakel(v = 1) { for (let i = 0; i < 7; i++) this.toon({ freq: 600 + Math.random() * 300, freq2: 420, duur: 0.08, type: "square", gain: 0.022 * v, start: i * 0.1 + (i > 4 ? 0.15 : 0) }); },
  kraai(v = 1) { [[420, 560, 0.18], [560, 700, 0.16], [700, 760, 0.5], [760, 520, 0.35]].reduce((t, [a, b, d]) => { this.toon({ freq: a, freq2: b, duur: d, type: "sawtooth", gain: 0.03 * v, start: t }); this.toon({ freq: a * 2, freq2: b * 2, duur: d, type: "triangle", gain: 0.015 * v, start: t }); return t + d * 0.9; }, 0); },
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
const vb = await maakVisbestand(scene, W, { telefoon, fx: (p, n) => spetter(p, n, 0.7), geluid: (afst) => { if (afst < 60) geluid.plons(Math.max(0.1, 0.6 - afst / 100)); } });
const mens = (rol) => { const m = maakMens(rol), g = new THREE.Group(); m.object.position.set(0, 0, 0); m.object.rotation.set(0, 0, 0); m.object.visible = true; g.add(m.object); scene.add(g); m.detail(true, true); return { m, g }; };
const dom = W.domein;
const huis = W.huis, u = huis.u, t = huis.t; // u = naar de rivier, t = langs de oever
// de vier Cocks: Paul (koperrood haar) speel jij; Bob slaapt zijn roes uit in de toren; Dave (witte pet) en Wim (randje, Fristi) zijn in de tuin
// de vier Cocks; wie je speelt kies je in het menu. Van de anderen slaapt er één zijn roes uit in de toren (de drone-missie),
// staat er één op de middelste steiger en zit er één aan de picknicktafel.
const C = { paul: mens("paul"), dave: mens("dave"), bob: mens("bob"), wim: mens("wim") };
zetPet(C.dave.m);
let peppie = C.paul, cocks = C.bob, rest = [C.dave, C.wim];
const plekken = (() => { const zet = (w, lx, lz, rot, houding, zit) => { const p = dom.wereld(lx, 0, lz); w.g.position.set(p.x, W.opSteiger(p.x, p.z) ?? W.hoogte(p.x, p.z), p.z); w.g.rotation.set(0, huis.yaw + rot, 0); w.m.zet(houding, 1, houding === "zitten" ? 0 : null); w.m.mixer.update(0.01); if (zit) w.g.position.y += 0.44 - w.m.zithoogte() + 0.02; };
  return [(w) => zet(w, -2.4, dom.oeverZ(-2.4) + 0.9, 0.3, "staan"), (w) => zet(w, -6.4, dom.oeverZ(-6.5) - 5.25, Math.PI, "zitten", true)]; })();
{
  // Wim drinkt alleen Fristi: een pak naast hem op de picknicktafel
  const pak = new THREE.Group(), roze = new THREE.MeshStandardMaterial({ color: "#e8e2d4", roughness: 0.6 }), band = new THREE.MeshStandardMaterial({ color: "#d8357a", roughness: 0.6 });
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.19, 0.07), roze); romp.position.y = 0.095; const st = new THREE.Mesh(new THREE.BoxGeometry(0.072, 0.07, 0.072), band); st.position.y = 0.1; const nok = new THREE.Mesh(new THREE.CylinderGeometry(0.0, 0.05, 0.04, 4), roze); nok.position.y = 0.21; nok.rotation.y = Math.PI / 4; pak.add(romp, st, nok);
  const pp = dom.wereld(-6.0, 0, dom.oeverZ(-6.5) - 6); pak.position.set(pp.x, W.hoogte(pp.x, pp.z) + 0.76, pp.z); scene.add(pak); W.fristi = pak; }
// de kippen lopen over het gras tussen het huis en de oever, en soms over de steigers
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
const cam = { yaw: huis.yaw + Math.PI, pitch: 0.28, afstand: 5, sleep: 0 };
// De stuurknop staat vast linksonder (altijd op dezelfde plek, ook boven de livescope); slepen over het beeld = rondkijken;
// in de livescope-stand is slepen over het scherm de transducer draaien.
{ const stick = $("#stick"), dop = $("#stick i"); let sid = null, kid = null, lx = 0, ly = 0, scid = null, scx = 0;
  const beweeg = (e) => { const r = stick.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width * 0.36; let dx = (e.clientX - cx) / R, dy = (e.clientY - cy) / R; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } invoer.x = Math.abs(dx) < 0.12 ? 0 : dx; invoer.y = Math.abs(dy) < 0.12 ? 0 : -dy; dop.style.transform = `translate(${dx * R}px,${dy * R}px)`; };
  stick.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); sid = e.pointerId; stick.setPointerCapture(sid); beweeg(e); });
  stick.addEventListener("pointermove", (e) => { if (e.pointerId === sid) beweeg(e); });
  for (const ev of ["pointerup", "pointercancel"]) stick.addEventListener(ev, (e) => { if (e.pointerId === sid) { sid = null; invoer.x = invoer.y = 0; dop.style.transform = ""; } });
  const vlak = renderer.domElement;
  vlak.addEventListener("pointerdown", (e) => { geluid.start(); if (kid === null) { kid = e.pointerId; lx = e.clientX; ly = e.clientY; cam.sleep = 1; vlak.setPointerCapture(e.pointerId); } });
  vlak.addEventListener("pointermove", (e) => { if (e.pointerId === kid) { cam.yaw -= (e.clientX - lx) * 0.0055; cam.pitch = klem(cam.pitch + (e.clientY - ly) * 0.004, -0.3, 1.2); lx = e.clientX; ly = e.clientY; cam.sleep = 1; } });
  const los = (e) => { if (e.pointerId === kid) kid = null; };
  vlak.addEventListener("pointerup", los); vlak.addEventListener("pointercancel", los);
  const sc = $("#scope");
  let sc0 = 0, sct = 0;
  sc.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); scid = e.pointerId; scx = sc0 = e.clientX; sct = e.clientY; sc.setPointerCapture(scid); });
  sc.addEventListener("pointermove", (e) => { if (e.pointerId === scid) { invoer.sonarSleep += (e.clientX - scx) / sc.clientWidth; scx = e.clientX; } });
  // een korte tik (zonder vegen) bedient de knoppen van het toestel: bereik, gevoeligheid, pauze
  sc.addEventListener("pointerup", (e) => { if (e.pointerId !== scid) return; scid = null; if (Math.abs(e.clientX - sc0) < 8 && Math.abs(e.clientY - sct) < 8) { const r = sc.getBoundingClientRect(); if (scope.tik(((e.clientX - r.left) * sc.width) / r.width, ((e.clientY - r.top) * sc.height) / r.height)) { geluid.toon({ freq: 1400, duur: 0.04, gain: 0.03 }); belly.scopeT = 0; } } });
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
function knoppen({ A = null, B = null, hoogte = false }) { hud.links.hidden = hud.rechts.hidden = true; hud.A.hidden = !A; hud.B.hidden = !B; if (A) hud.A.textContent = A; if (B) hud.B.textContent = B; hud.op.hidden = hud.neer.hidden = !hoogte; }
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
function vangst(vis) { const cm = Math.round(vis.lengte * 100), tekst = vis.lengte >= 1 ? `${vis.soort} · ${vis.lengte.toFixed(2).replace(".", ",")} m` : `${vis.soort} · ${cm} cm`; spel.vangsten.push(vis); meld(tekst, 4); geluid.goed(); geluid.plons(0.6); return tekst; }

// de hengel en de lijn
const hengel = spul.maakHengel(); hengel.g.visible = false;
const lijn = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V(0, 0, 0), V(0, 0, 0), V(0, 0, 0)]), new THREE.LineBasicMaterial({ color: "#f2f6f8", transparent: true, opacity: 0.8 })); lijn.frustumCulled = false; lijn.visible = false; scene.add(lijn);
function zetLijn(a, b, slap = 0) { const p = lijn.geometry.attributes.position, m = a.clone().lerp(b, 0.5); m.y -= slap; p.setXYZ(0, a.x, a.y, a.z); p.setXYZ(1, m.x, m.y, m.z); p.setXYZ(2, b.x, b.y, b.z); p.needsUpdate = true; lijn.visible = true; }
/** Peppie houdt de hengel vast: steil = hoe ver omhoog, bocht = hoe krom. Geeft de top terug. */
function houdHengel(yaw, steil, bocht) { const m = peppie.m, f = voor(yaw), buik = m.plek("DEF-spine001").clone().addScaledVector(f, 0.22), d = f.clone().multiplyScalar(Math.cos(steil)).setY(Math.sin(steil)), links = V(f.z, 0, -f.x);
  hengel.g.visible = true; hengel.buig(bocht); const top = hengel.leg(buik, d);
  m.arm("R", buik.clone().addScaledVector(d, 0.48), V(0, -1, 0).addScaledVector(links, -0.5)); m.arm("L", buik.clone().addScaledVector(d, 0.12), V(0, -1, 0).addScaledVector(links, 0.5)); return top; }
const dobber = new THREE.Group(); { const a = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: "#f24a2a" })); a.scale.y = 1.5; a.position.y = 0.08; const b = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 5), new THREE.MeshStandardMaterial({ color: "#fafafa" })); b.position.y = 0.26; dobber.add(a, b); dobber.visible = false; scene.add(dobber); }
const spetter = (p, n = 24, k = 1) => { for (let i = 0; i < n; i++) fx.deeltje(p.clone().add(V(tussen(-0.3, 0.3), 0.1, tussen(-0.3, 0.3))), { leven: tussen(0.4, 1), kleur: i % 3 ? "#eef7fa" : "#c5e2ea", r0: 0.1, r1: 0.45 * k, v: V(tussen(-2.5, 2.5) * k, tussen(2.5, 6.5) * k, tussen(-2.5, 2.5) * k), g: 9, a: 0.9 }); };

// ---------- missie 1: vissen vanaf de kant ----------
const kant = { fase: "loop", t: 0, wacht: 0, doel: V(0, 0, 0), vis: null, n: 0 };
function beginKant() { Object.assign(kant, { fase: "loop", n: 0 }); loop.pos.copy(W.steiger.midden); loop.yaw = huis.yaw; cam.yaw = huis.yaw + Math.PI; cam.afstand = 5; hud.missie.textContent = "Vang drie vissen vanaf de oever of de steiger"; }
function stapKant(dt) {
  const k = kant; k.t += dt; let top;
  if (k.fase === "loop") {
    stapLopen(dt); peppie.m.zet(loop.v > 0.3 ? "lopen" : "staan"); peppie.m.mixer.update(dt); top = houdHengel(loop.yaw, 1.15, 0.02); lijn.visible = false; dobber.visible = false;
    const doel = loop.pos.clone().addScaledVector(voor(loop.yaw), 17), kan = W.inWater(doel.x, doel.z) && W.diepte(doel.x, doel.z) > 0.8;
    knoppen({ A: kan ? "Werp" : null }); hud.tel.textContent = `${k.n} / 3`;
    if (kan && invoer.Atik) { k.fase = "worp"; k.t = 0; k.doel.copy(doel).setY(0); geluid.ruis({ duur: 0.3, freq: 3000, gain: 0.15 }); }
  } else if (k.fase === "worp") {
    peppie.m.zet("staan"); peppie.m.mixer.update(dt); const f = Math.min(1, k.t / 0.9); top = houdHengel(loop.yaw, 1.2 - Math.sin(f * Math.PI) * 0.7, 0.05);
    dobber.visible = true; dobber.position.lerpVectors(top, k.doel, f); dobber.position.y += Math.sin(f * Math.PI) * 4; zetLijn(top, dobber.position, 0.2);
    if (f >= 1) { k.fase = "wacht"; k.t = 0; k.wacht = tussen(4, 11); geluid.plons(0.4); spetter(k.doel, 10, 0.5); }
    knoppen({});
  } else if (k.fase === "wacht" || k.fase === "beet") {
    peppie.m.zet("staan"); peppie.m.mixer.update(dt); top = houdHengel(loop.yaw, 0.55, 0.02);
    const onder = k.fase === "beet"; dobber.position.copy(k.doel); dobber.position.y = onder ? -0.22 + Math.sin(k.t * 20) * 0.03 : Math.sin(k.t * 2.2) * 0.02; zetLijn(top, dobber.position, onder ? 0.05 : 0.6);
    knoppen({ A: onder ? "Sla aan!" : "Haal in" });
    if (!onder && k.t > k.wacht) { k.fase = "beet"; k.t = 0; geluid.piep(); spetter(k.doel, 6, 0.4); }
    else if (onder && invoer.Atik) { k.vis = nieuweVis(); k.fase = "dril"; beginDril(k.vis, loop.pos.distanceTo(k.doel)); }
    else if (onder && k.t > 1.6) { meld("Te laat… weg is hij"); k.fase = "loop"; }
    else if (!onder && invoer.Atik) k.fase = "loop";
  } else if (k.fase === "dril") {
    peppie.m.zet("vechtklaar", 0.6); peppie.m.mixer.update(dt); const uit = stapDril(dt, invoer.A);
    const ri = k.doel.clone().sub(loop.pos).setY(0).normalize(); k.doel.copy(loop.pos).addScaledVector(ri, dril.afstand).addScaledVector(V(ri.z, 0, -ri.x), Math.sin(k.t * 1.3) * 0.02 * dril.afstand).setY(0);
    top = houdHengel(Math.atan2(ri.x, ri.z), 1.0, 0.22 + dril.span * 0.18); dobber.visible = false; zetLijn(top, k.doel.clone().setY(-0.1));
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
const scopeTex = new THREE.CanvasTexture(hud.scope); scopeTex.colorSpace = THREE.SRGBColorSpace;
// ieder zijn eigen bellyboat: Paul en Bob zwart met de Garmin, Wim kaki, Dave gifgroen; wie niet vaart ligt aangemeerd bij de linker steiger
const BB = Object.fromEntries(["paul", "bob", "wim", "dave"].map((n) => { const b = maakBellyboat(n, { scherm: scopeTex }); b.g.visible = false; scene.add(b.g); return [n, b]; }));
let bb = BB.paul, boot = bb.g;
const aangemeerd = [["wim", 19.6, 2.9, 0.25], ["dave", 21.4, 3.3, -0.15], ["bob", 12.4, 3.0, 0.4], ["paul", 14.2, 3.1, -0.3]].map(([soort, lx, lz, r]) => { const b = maakBellyboat(soort).g, p = dom.wereld(lx, 0, dom.oeverZ(lx) + lz); b.position.set(p.x, 0.02, p.z); b.rotation.y = huis.yaw + Math.PI / 2 + r; scene.add(b); return { soort, b, f: Math.random() * 6 }; });
/** Kies wie je speelt. */
function kiesSpeler(naam) {
  peppie = C[naam]; cocks = C[["bob", "dave", "wim", "paul"].find((n) => n !== naam)]; rest = Object.values(C).filter((w) => w !== peppie && w !== cocks);
  rest.forEach((w, i) => plekken[i](w)); legCocks(false); for (const w of Object.values(C)) w.g.visible = true;
  for (const b of Object.values(BB)) b.g.visible = false; bb = BB[naam]; boot = bb.g; for (const a of aangemeerd) a.b.visible = a.soort !== naam;
  for (const k of document.querySelectorAll("#spelers button")) k.classList.toggle("aan", k.dataset.speler === naam); try { localStorage.setItem("peppie-speler", naam); } catch {}
}
const belly = { pos: V(0, 0, 0), yaw: 0, sonar: 0, aas: 1, tik: 0, vis: null, klok: 0, scopeT: 0, top: V(0, 0, 0) };
const scope = new Livescope(hud.scope);
function beginBelly() {
  belly.pos.copy(W.steiger.eind).addScaledVector(u, 32); belly.yaw = huis.yaw; belly.sonar = 0; belly.aas = 1; belly.vis = null; belly.v = 0; belly.w = 0; cam.yaw = huis.yaw + Math.PI; cam.afstand = 6.5; cam.pitch = 0.3; zetWeergave("varen");
  hud.missie.textContent = "Zoek een grote meerval op de livescope (dikke kop, dunne staart) en vang er een van 2 meter of meer"; hud.tel.textContent = "";
}
function stapBelly(dt) {
  const b = belly, s = stuur(), f = voor(b.yaw), rechts = V(-f.z, 0, f.x); b.klok += dt;
  // varen met de motor: gas geven en sturen, met wat traagheid zoals een bellyboat op een elektromotor
  if (!dril.aan) { b.v += (s.y * 1.5 - b.v) * Math.min(1, dt * 1.2); b.w += (-s.x * 0.85 - b.w) * Math.min(1, dt * 3); b.yaw += b.w * dt;
    const nx = b.pos.x + f.x * b.v * dt, nz = b.pos.z + f.z * b.v * dt; if (W.diepte(nx, nz) > 0.7) b.pos.set(nx, 0, nz); else b.v = 0; }
  const vaart = b.v;
  // de transducer draaien: vegen over het scherm (of Q/C)
  const kn = invoer.toets; b.sonar -= invoer.sonarSleep * 2.2; invoer.sonarSleep = 0; if (kn.KeyQ || kn.KeyZ) b.sonar += 1.4 * dt; if (kn.KeyC) b.sonar -= 1.4 * dt; b.sonar = klem(b.sonar, -2.6, 2.6);
  boot.visible = true; boot.position.set(b.pos.x, 0.0 + Math.sin(b.klok * 1.7) * 0.02, b.pos.z); boot.rotation.set(Math.sin(b.klok * 1.3) * 0.025, b.yaw, Math.sin(b.klok * 1.1) * 0.025); bb.stang.rotation.y = b.sonar; bb.schroef.rotation.z += dt * (Math.abs(vaart) * 30 + (dril.aan ? 4 : 0)); bb.motor.rotation.y = -s.x * 0.5;
  boot.updateMatrixWorld(true);
  peppie.m.zet("zitten"); peppie.m.mixer.update(dt); peppie.g.position.copy(boot.localToWorld(bb.zit.clone())).add(V(0, -peppie.m.zithoogte() + 0.02, 0)); peppie.g.rotation.set(0, b.yaw, 0);
  const bodem = W.diepte(b.pos.x, b.pos.z);
  // de bundel: vanaf de transducer rechts voorin, in de richting van de stang; ± 20 graden breed
  const bron = boot.localToWorld(V(0.6, 0, 0.66)), sy = b.yaw + b.sonar, fb = voor(sy), rb = V(-fb.z, 0, fb.x);
  const zie = (x, z) => { const rx = x - bron.x, rz = z - bron.z, v = rx * fb.x + rz * fb.z, lat = rx * rb.x + rz * rb.z; return Math.abs(lat) < 0.5 + Math.abs(v) * 0.2 ? v : null; };
  // de hengel recht vooruit, de top 1,3 m voor de boot; de lijn hangt recht omlaag
  const top = houdHengel(b.yaw, dril.aan ? 0.8 : 0.06, dril.aan ? 0.3 + dril.span * 0.2 : 0.02 + b.tik * 0.06); b.top.copy(top);
  const inBeeld = []; for (const v of vb.alle()) { const a = zie(v.x, v.z); if (a === null) continue; const d = v === b.vis ? klem(dril.afstand * 0.8, 0.6, W.diepte(v.x, v.z) - 0.2) : v.d; inBeeld.push({ v: a, d, lengte: v.lengte, hoek: v.h - sy, soort: v.soort, buig: Math.max(-1, Math.min(1, (v.draai ?? 0) * 2)), vis: v }); }
  if (!dril.aan) {
    if (invoer.neer) b.aas += 1.5 * dt; if (invoer.op) b.aas -= 1.5 * dt; b.aas = klem(b.aas, 0.3, Math.max(0.4, W.diepte(top.x, top.z) - 0.1));
    if (invoer.Atik) { b.tik = 1; geluid.toon({ freq: 180, duur: 0.05, gain: 0.03 }); } b.tik = Math.max(0, b.tik - dt * 1.4);
    // een vis die vlak bij het aas zwemt, wordt nieuwsgierig; tikken maakt hem gretig
    // vissen merken het aas op een paar meter afstand op; ze komen erheen, op dezelfde diepte, en cirkelen eromheen
    // (zoals de drie meervallen op Bobs opname). Tikken maakt ze gretig; een vis die vlak bij is en vol zin heeft, pakt het.
    for (const v of vb.alle()) { const afst = Math.hypot(v.x - top.x, v.z - top.z), dd = Math.abs(v.d - b.aas), bij = afst < 7 && dd < 4;
      if (bij) v.zin = Math.min(1.05, v.zin + dt * (0.035 + b.tik * 0.22) * (v.soort === "Meerval" ? 1.3 : 0.8) * (afst < 2.5 ? 1.6 : 1)); else v.zin = Math.max(0, v.zin - dt * 0.12);
      if (v.zin > 0.12) { v.lok = b.aas + Math.sin(v.staart * 0.2) * 0.4; v.fase = (v.fase ?? Math.random() * 6.28) + dt * (0.35 + v.zin * 0.3); const r = 0.5 + (1 - v.zin) * 2.8; v.tx = top.x + Math.cos(v.fase) * r; v.tz = top.z + Math.sin(v.fase) * r; v.straal = 0.3; v.x0 = v.tx; v.z0 = v.tz; }
      else if (v.lok != null) { v.lok = null; v.straal = v.soort === "Meerval" ? 8 : 14; }
      if (v.zin >= 1 && afst < 1.1) { b.vis = v; v.zin = 0; v.lok = null; v.vast = true; beginDril(v, v.d + 2 + v.lengte); meld("Beet! Houd de spanning in het groen", 3); geluid.piep(); spetter(top.clone().setY(0), 14, 0.6); break; } }
    if (belly.weergave !== "varen") knoppen({ A: "Tik", hoogte: true }); else knoppen({});
    zetLijn(top, V(top.x, -Math.min(b.aas, 2.5), top.z), 0);
  } else {
    // de dril: een grote meerval sleept de bellyboat mee
    const v = b.vis, uit = stapDril(dt, invoer.A), ren = dril.ren > 0, sleep = (0.15 + v.lengte * 0.45) * (ren ? 1 : 0.25);
    v.h += Math.sin(b.klok * 0.6) * 0.5 * dt; const nx = b.pos.x + Math.sin(v.h) * sleep * dt, nz = b.pos.z + Math.cos(v.h) * sleep * dt; if (W.diepte(nx, nz) > 1) b.pos.set(nx, 0, nz); else v.h += Math.PI * 0.6;
    v.x = b.pos.x + Math.sin(v.h) * Math.min(3, dril.afstand * 0.4); v.z = b.pos.z + Math.cos(v.h) * Math.min(3, dril.afstand * 0.4); let d = v.h - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 1.5);
    if (ren && Math.random() < dt * 6) spetter(b.pos.clone().addScaledVector(voor(v.h), 1.2), 4, 0.5);
    knoppen({ A: "Draai" }); zetLijn(top, V(v.x, -0.1, v.z), 0.1);
    if (uit !== "bezig") { b.vis = null;
      v.vast = false; if (uit === "binnen") { const tekst = vangst(v); vb.weg(v); spetter(b.pos.clone().addScaledVector(f, 0.9), 40, 1.2); if (v.soort === "Meerval" && v.lengte >= 2) einde(true, `${tekst}. Een echte reus!`); else meld(v.soort === "Meerval" ? `${tekst}. Nog geen twee meter…` : tekst, 4); }
      else { meld(uit === "breuk" ? "Lijnbreuk! Laat hem lopen als hij trekt." : "Los… houd de lijn strak.", 4); geluid.fout(); v.x0 += tussen(-6, 6); } }
  }
  // het scherm: tien keer per seconde een nieuw beeld, ook op het toestel op de arm
  if ((b.scopeT -= dt) <= 0) { b.scopeT = 0.1; const nu = new Date(), av = zie(top.x, top.z);
    scope.teken({ bodem: (v) => W.diepte(bron.x + fb.x * v, bron.z + fb.z * v), vissen: inBeeld, aas: dril.aan || av === null ? null : { v: av, d: b.aas - b.tik * 0.3 },
      school: vb.scholen.flatMap((q) => { const out = []; for (let i = 0; i < q.n; i++) { const o = vb.schoolPunt(q, i), v = zie(o.x, o.z); if (v !== null) out.push({ v, d: o.d }); } return out; }), planten: planten.inBundel(zie),
      richting: b.sonar, onder: W.diepte(bron.x, bron.z), snelheid: Math.abs(b.v) * 1.944, volt: 12.5, temp: 14.78 + Math.sin(b.klok * 0.4) * 0.02, tijd: `${String(nu.getHours()).padStart(2, "0")}:${String(nu.getMinutes()).padStart(2, "0")}` });
    scopeTex.needsUpdate = true; }
  hud.tel.textContent = `${bodem.toFixed(1)} m diep · aas ${b.aas.toFixed(1)} m`;
  // de camera volgt de boot vanzelf (tenzij je net zelf rondkeek); bij varen hoog achter de boot met zicht over de rivier
  cam.sleep = Math.max(0, cam.sleep - dt * 0.4); if (cam.sleep <= 0) { let d = b.yaw + Math.PI - cam.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); cam.yaw += d * Math.min(1, dt * 1.6); cam.pitch += ((belly.weergave !== "varen" ? 0.42 : 0.26) - cam.pitch) * Math.min(1, dt * 2); }
  cam.afstand += ((belly.weergave !== "varen" ? 3.4 : 6.5) - cam.afstand) * Math.min(1, dt * 2);
  volg(b.pos.clone().add(V(0, belly.weergave !== "varen" ? 0.8 : 1.6, 0)).addScaledVector(f, belly.weergave !== "varen" ? 0.4 : 3));
}
/** Varen (uitzicht over de rivier, geen scherm) of livescope (het hele scherm is de Garmin). */
function zetWeergave(w) { belly.weergave = w; $("#stick").classList.toggle("zacht", w !== "varen"); for (const k of document.querySelectorAll("#weergave button")) k.classList.toggle("aan", k.dataset.w === w); hud.scope.hidden = w === "varen"; plaatsScope(); }
function plaatsScope() { const sc = hud.scope, staand = innerHeight > innerWidth, vol = belly.weergave === "vol"; let b, h, l, tp;
  if (vol) { b = innerWidth; h = innerHeight; l = 0; tp = 0; }
  else if (staand) { b = innerWidth - 12; h = (b * 9) / 16; l = 6; tp = 96; }
  else { h = innerHeight - 64; b = (h * 16) / 9; const max = innerWidth - 250; if (b > max) { b = max; h = (b * 9) / 16; } l = 8; tp = Math.max(50, (innerHeight - h) / 2 + 20); }
  sc.style.left = `${l}px`; sc.style.top = `${tp}px`; sc.style.width = `${b}px`; sc.style.height = `${h}px`; sc.classList.toggle("vol", vol);
  // het canvas zelf in de juiste verhouding (scherp op het hele scherm)
  const k = Math.min(devicePixelRatio, 1.5), cw = vol ? Math.round(b * k) : 960, ch = vol ? Math.round(h * k) : 540; if (sc.width !== cw || sc.height !== ch) { sc.width = cw; sc.height = ch; } }
addEventListener("resize", () => { if (spel.modus === "belly") plaatsScope(); });

// ---------- missie 3: de drone en het glas water ----------
const drone = new THREE.Group(); const rotors = []; { const zwart = new THREE.MeshStandardMaterial({ color: "#1c1e22", roughness: 0.5 }), grijs = new THREE.MeshStandardMaterial({ color: "#c9ccd0", roughness: 0.4 });
  const romp = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.08, 0.3), grijs); drone.add(romp); const cam_ = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), zwart); cam_.position.set(0, -0.03, 0.16); drone.add(cam_);
  for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) { const a = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.02, 0.26), zwart); a.position.set(x * 0.13, 0, z * 0.13); a.rotation.y = Math.atan2(x, z); drone.add(a);
    const r = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.006, 14), new THREE.MeshStandardMaterial({ color: "#2a2d33", transparent: true, opacity: 0.45 })); r.position.set(x * 0.22, 0.035, z * 0.22); drone.add(r); rotors.push(r); }
  drone.traverse((o) => { if (o.isMesh) o.castShadow = true; }); drone.visible = false; scene.add(drone); }
const glas = new THREE.Group(); { const g = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.11, 12, 1, true), new THREE.MeshStandardMaterial({ color: "#dff1f6", transparent: true, opacity: 0.45, side: THREE.DoubleSide, roughness: 0.05 })); const w = new THREE.Mesh(new THREE.CylinderGeometry(0.034, 0.028, 0.085, 12), new THREE.MeshStandardMaterial({ color: "#58b8e0", transparent: true, opacity: 0.8 })); w.position.y = -0.008; glas.add(g, w); glas.visible = false; scene.add(glas); }
const dr = { pos: V(0, 0, 0), yaw: 0, v: V(0, 0, 0), glas: "hangt", gp: V(0, 0, 0), gv: 0, accu: 100, snurk: 0, over: 3 };
function beginDrone() { dr.pos.copy(W.tuin).setY(W.hoogte(W.tuin.x, W.tuin.z) + 1.3); dr.yaw = huis.yaw + Math.PI; dr.v.set(0, 0, 0); Object.assign(dr, { glas: "hangt", accu: 110, over: 3 }); cam.pitch = 0.18; legCocks(false);
  hud.missie.textContent = "Vlieg door het open slaapkamerraam en laat het glas water op de slapende Cocks vallen"; }
/** Botst een bol (in de wereld) tegen het huis, de grond of een ander huis? */
function droneBotst(p, r = 0.28) { if (p.y < Math.max(0, W.hoogte(p.x, p.z)) + r) return true; const l = huis.naarBinnen(p); for (const [x0, y0, z0, x1, y1, z1] of W.dozen) if (l.x > x0 - r && l.x < x1 + r && l.y > y0 - r && l.y < y1 + r && l.z > z0 - r && l.z < z1 + r) return true;
  if (Math.abs(l.x) > huis.BX / 2 + 1 || Math.abs(l.z) > huis.BZ / 2 + 1) { if (p.y < 9 && W.inHuis(p.x, p.z, r)) return true; } return false; }
function stapDrone(dt) {
  const s = stuur(); dr.yaw = cam.yaw + Math.PI; const f = voor(dr.yaw), rechts = V(-f.z, 0, f.x);
  const doel = f.clone().multiplyScalar(s.y * 3.6).addScaledVector(rechts, s.x * 2.6); doel.y = (invoer.op ? 2.2 : 0) - (invoer.neer ? 2.2 : 0); dr.v.lerp(doel, Math.min(1, dt * 3.5));
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
  boot.visible = drone.visible = glas.visible = net.visible = kooi.visible = dobber.visible = lijn.visible = hengel.g.visible = false; hud.scope.hidden = true; hud.span.hidden = hud.meter.hidden = true; dril.aan = false; peppie.g.visible = modus !== "drone"; if (modus !== "drone") legCocks(false); for (const r of rat.lijst) r.m.visible = false;
  hud.melding.hidden = true; meldT = 0; hud.missie.style.opacity = 1; clearTimeout(start.vervaag); start.vervaag = setTimeout(() => { hud.missie.style.opacity = 0; }, 6000);
  // met de livescope in beeld schuift het beeld naar rechtsonder, zodat de belly boat naast het scherm te zien is
  camera.clearViewOffset(); $("#stick").hidden = false; $("#weergave").hidden = modus !== "belly";
  MISSIES[modus][0](); }
function naarMenu() { camera.clearViewOffset(); spel.modus = "menu"; $("#menu").hidden = false; $("#uitslag").hidden = true; $("#hud").hidden = true; }
for (const k of document.querySelectorAll("#menu [data-missie]")) k.addEventListener("click", () => start(k.dataset.missie));
$("#opnieuw").addEventListener("click", () => start(spel.modus)); for (const k of document.querySelectorAll("#weergave button")) k.addEventListener("click", () => zetWeergave(k.dataset.w)); $("#terug").addEventListener("click", naarMenu); $("#stop").addEventListener("click", naarMenu);
const klok = new THREE.Clock(); let menuT = 0;
function lus() {
  const dt = Math.min(klok.getDelta(), 0.05); spel.t += dt;
  if (spel.modus === "menu") { // een rustig rondje boven de rivier
    menuT += dt * 0.06; const c = W.oeverPunt.clone().addScaledVector(u, 25); camera.position.set(c.x + Math.sin(menuT) * 70, 26, c.z + Math.cos(menuT) * 70); camera.lookAt(c.x, 2, c.z); zon.target.position.copy(c); zon.position.copy(c).add(V(40, 70, 25));
    peppie.g.position.copy(W.steiger.eind).addScaledVector(u, -1).setY(W.steiger.dek); peppie.g.rotation.set(0, huis.yaw, 0); peppie.m.zet("staan"); peppie.m.mixer.update(dt);
  } else if (spel.modus === "kijk") { /* camera van buitenaf (tools/kijk.cjs) */ } else if (!spel.klaar || spel.modus === "drone") MISSIES[spel.modus][1](dt);
  if (meldT > 0 && (meldT -= dt) <= 0) hud.melding.hidden = true;
  for (const a of aangemeerd) { a.f += dt; a.b.position.y = 0.02 + Math.sin(a.f * 1.5) * 0.015; }
  for (const w of rest) w.m.mixer.update(dt); for (const w of Object.values(C)) w.m.pet?.userData.pas?.();
  kippen.stap(dt, spel.modus === "kant" || spel.modus === "rat" ? { x: loop.pos.x, z: loop.pos.z, v: loop.v } : null);
  invoer.Atik = invoer.Btik = false; fx.stap(dt); bomen.stap(dt, camera); water.stap(dt); vb.stap(dt, spel.modus === "belly" ? belly.pos : spel.modus === "kant" || spel.modus === "rat" ? loop.pos.clone().addScaledVector(u, 20) : W.steiger.eind.clone().addScaledVector(u, 25), camera);
  renderer.render(scene, camera); requestAnimationFrame(lus);
}
for (const k of document.querySelectorAll("#spelers button")) k.addEventListener("click", () => kiesSpeler(k.dataset.speler));
kiesSpeler((() => { try { return localStorage.getItem("peppie-speler"); } catch { return null; } })() || "paul");
$("#laden").hidden = true; $("#menu").hidden = false;
window.__spel = { C, kiesSpeler, get dave() { return C.dave; }, get wim() { return C.wim; }, vb, kippen, zon, THREE, spel, W, start, belly, dr, rat, kant, loop, cam, invoer, dril, get peppie() { return peppie; }, get cocks() { return cocks; }, scope, camera, stapDril, MISSIES };
requestAnimationFrame(lus);
