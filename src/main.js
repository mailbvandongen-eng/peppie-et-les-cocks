// Peppie et les Cocks — vissen op de Lot bij Le Temple-sur-Lot. Eerste, grove versie.
// Vier missies: vissen vanaf de kant, met de belly boat en de livescope op meerval, met de drone een glas water
// op de slapende Cocks laten vallen, en beverratten scheppen vanaf de steiger.
import * as THREE from "three";
import { laadMensen, maakMens } from "./mensen.js";
import { Effecten } from "./effecten.js";
import { Livescope } from "./livescope.js";
import { bouwWereld } from "./wereld.js";
import { laadVisspullen } from "./hengel.js";
import { Kippen } from "./kippen.js";

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
const scene = new THREE.Scene(); scene.background = new THREE.Color("#a9cfe8"); scene.fog = new THREE.Fog("#b9d6e6", 180, 620);
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 900);
scene.add(new THREE.HemisphereLight("#dcefff", "#6f7a4e", 1.5));
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
// een lucht om in te spiegelen: de rivier en het zwembad weerkaatsen de hemel en de groene oevers
{ const lucht = new THREE.Scene(), g = new THREE.SphereGeometry(50, 32, 16), kl = [], c = new THREE.Color(), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i) / 50; if (y > 0.12) c.set("#e4eef4").lerp(new THREE.Color("#8fbde0"), Math.min(1, (y - 0.12) * 1.6)); else if (y > -0.02) c.set("#7f9a6a").lerp(new THREE.Color("#e4eef4"), (y + 0.02) / 0.14); else c.set("#4c6040"); kl.push(c.r, c.g, c.b); }
  g.setAttribute("color", new THREE.Float32BufferAttribute(kl, 3)); lucht.add(new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const env = new THREE.PMREMGenerator(renderer).fromScene(lucht, 0.01).texture;
  Object.assign(W.water.material, { envMap: env, envMapIntensity: 0.5, color: new THREE.Color("#4d6852"), metalness: 0.3, roughness: 0.09, opacity: 0.93 }); W.water.material.needsUpdate = true;
  W.domein.groep.traverse((o) => { if (o.isMesh && o.material.transparent && o.material.color?.getHexString() === "5fd0f2") { o.material.envMap = env; o.material.needsUpdate = true; } }); }
await laadMensen((v) => $("#laden").style.setProperty("--v", v));
const spul = await laadVisspullen(scene);
const fx = new Effecten(scene);
const mens = (rol) => { const m = maakMens(rol), g = new THREE.Group(); m.object.position.set(0, 0, 0); m.object.rotation.set(0, 0, 0); m.object.visible = true; g.add(m.object); scene.add(g); m.detail(true, true); return { m, g }; };
const peppie = mens("rooie"), cocks = mens("visser");
{ const s = cocks.m.object.scale; s.set(s.x * 1.2, s.y, s.z * 1.28); }
const huis = W.huis, u = huis.u, t = huis.t; // u = naar de rivier, t = langs de oever
// de kippen lopen over het gras tussen het huis en de oever, en soms over de steigers
const dom = W.domein;
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
const invoer = { x: 0, y: 0, A: false, Atik: false, B: false, Btik: false, op: false, neer: false, toets: {} };
const cam = { yaw: huis.yaw + Math.PI, pitch: 0.28, afstand: 5 };
{ const stick = $("#stick"), dop = $("#stick i"); let sid = null, kid = null, sx = 0, sy = 0, lx = 0, ly = 0;
  const vlak = renderer.domElement;
  vlak.addEventListener("pointerdown", (e) => { geluid.start();
    if (e.clientX < innerWidth * 0.42 && sid === null && spel.modus !== "menu") { sid = e.pointerId; sx = e.clientX; sy = e.clientY; stick.style.left = `${sx - 60}px`; stick.style.top = `${sy - 60}px`; stick.hidden = false; }
    else if (kid === null) { kid = e.pointerId; lx = e.clientX; ly = e.clientY; } vlak.setPointerCapture(e.pointerId); });
  vlak.addEventListener("pointermove", (e) => {
    if (e.pointerId === sid) { const dx = klem((e.clientX - sx) / 50, -1, 1), dy = klem((e.clientY - sy) / 50, -1, 1); invoer.x = dx; invoer.y = -dy; dop.style.transform = `translate(${dx * 34}px,${dy * 34}px)`; }
    else if (e.pointerId === kid) { cam.yaw -= (e.clientX - lx) * 0.0055; cam.pitch = klem(cam.pitch + (e.clientY - ly) * 0.004, -0.5, 1.2); lx = e.clientX; ly = e.clientY; } });
  const los = (e) => { if (e.pointerId === sid) { sid = null; invoer.x = invoer.y = 0; stick.hidden = true; dop.style.transform = ""; } if (e.pointerId === kid) kid = null; };
  vlak.addEventListener("pointerup", los); vlak.addEventListener("pointercancel", los);
  for (const [id, naam] of [["#knopA", "A"], ["#knopB", "B"], ["#knopOp", "op"], ["#knopNeer", "neer"]]) { const k = $(id);
    k.addEventListener("pointerdown", (e) => { e.preventDefault(); geluid.start(); invoer[naam] = true; if (naam === "A") invoer.Atik = true; if (naam === "B") invoer.Btik = true; k.classList.add("in"); });
    for (const ev of ["pointerup", "pointercancel", "pointerleave"]) k.addEventListener(ev, () => { invoer[naam] = false; k.classList.remove("in"); }); }
  const T = { Space: "A", KeyE: "B", KeyR: "op", KeyF: "neer" };
  addEventListener("keydown", (e) => { invoer.toets[e.code] = true; const n = T[e.code]; if (n && !e.repeat) { invoer[n] = true; if (n === "A") invoer.Atik = true; if (n === "B") invoer.Btik = true; e.preventDefault(); } });
  addEventListener("keyup", (e) => { invoer.toets[e.code] = false; const n = T[e.code]; if (n) invoer[n] = false; }); }
/** De stick (of WASD) als richting. */
function stuur() { const k = invoer.toets, x = invoer.x + (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0), y = invoer.y + (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0); return { x: klem(x, -1, 1), y: klem(y, -1, 1) }; }

// ---------- het spel ----------
const spel = { modus: "menu", t: 0, klaar: false, vangsten: [] };
const hud = { missie: $("#missie"), tel: $("#tel"), A: $("#knopA"), B: $("#knopB"), op: $("#knopOp"), neer: $("#knopNeer"), span: $("#span"), spanI: $("#span i"), meter: $("#meter"), melding: $("#melding"), scope: $("#scope") };
function knoppen({ A = null, B = null, hoogte = false }) { hud.A.hidden = !A; hud.B.hidden = !B; if (A) hud.A.textContent = A; if (B) hud.B.textContent = B; hud.op.hidden = hud.neer.hidden = !hoogte; }
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

// ---------- missie 2: de belly boat met livescope ----------
const boot = new THREE.Group(); { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.24, 10, 22, 5.2).rotateX(Math.PI / 2).rotateY(Math.PI * 1.33), new THREE.MeshStandardMaterial({ color: "#2f5f6f", roughness: 0.6 })); ring.position.y = 0.12; ring.castShadow = true;
  const rug = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.55, 0.12), new THREE.MeshStandardMaterial({ color: "#1f2a30", roughness: 0.8 })); rug.position.set(0, 0.5, -0.5); rug.rotation.x = -0.2;
  const zit = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.06, 0.6), rug.material); zit.position.set(0, 0.02, -0.1);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 6), new THREE.MeshStandardMaterial({ color: "#222" })); arm.position.set(0.55, 0.45, 0.35);
  const scherm = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.03), new THREE.MeshStandardMaterial({ color: "#0a1a40", emissive: "#1030a0", emissiveIntensity: 0.8 })); scherm.position.set(0.55, 0.72, 0.35); scherm.rotation.set(-0.3, -0.5, 0);
  boot.add(ring, rug, zit, arm, scherm); boot.visible = false; scene.add(boot); }
const belly = { pos: V(0, 0, 0), yaw: 0, aas: 2, tik: 0, vissen: [], school: [], vis: null, klok: 0, scopeT: 0 };
const scope = new Livescope(hud.scope);
function beginBelly() {
  belly.pos.copy(W.steiger.eind).addScaledVector(u, 3); belly.yaw = huis.yaw; belly.aas = 2; belly.vis = null; cam.yaw = huis.yaw + Math.PI; cam.afstand = 4.2; cam.pitch = 0.42;
  // meervallen: in elke diepe kolk één echte reus, en kleinere verspreid over de rivier
  belly.vissen = []; const zet = (x, z, lengte, straal) => belly.vissen.push({ soort: "Meerval", x, z, tx: x, tz: z, x0: x, z0: z, straal, lengte, h: Math.random() * 6, boven: tussen(0.3, 1.1), zin: 0 });
  for (const [x, z, r] of W.kolken) zet(x + tussen(-4, 4), z + tussen(-4, 4), tussen(2.04, 2.45), r * 0.45);
  for (let i = 0; i < 22; i++) { const p = belly.pos.clone().addScaledVector(u, tussen(5, 150)).addScaledVector(t, tussen(-190, 190)); if (W.diepte(p.x, p.z) > 3) zet(p.x, p.z, tussen(0.85, 1.85), 18); }
  belly.school = []; for (let s = 0; s < 14; s++) { const p = belly.pos.clone().addScaledVector(u, tussen(0, 150)).addScaledVector(t, tussen(-180, 180)), d = tussen(1.5, 3.5); for (let i = 0; i < 9; i++) belly.school.push({ x: p.x + tussen(-1.2, 1.2), z: p.z + tussen(-1.2, 1.2), d: d + tussen(-0.5, 0.5) }); }
  hud.missie.textContent = "Vang een meerval van 2 meter of meer. Zoek de diepe kolken op de livescope."; hud.scope.hidden = false; hud.tel.textContent = "";
}
function stapBelly(dt) {
  const b = belly, s = stuur(), f = voor(b.yaw), rechts = V(-f.z, 0, f.x); b.klok += dt;
  if (!dril.aan) { b.yaw -= s.x * 1.3 * dt; const nx = b.pos.x + f.x * s.y * 1.25 * dt, nz = b.pos.z + f.z * s.y * 1.25 * dt; if (W.diepte(nx, nz) > 0.7) b.pos.set(nx, 0, nz); }
  boot.visible = true; boot.position.set(b.pos.x, 0.04 + Math.sin(b.klok * 1.7) * 0.025, b.pos.z); boot.rotation.set(Math.sin(b.klok * 1.3) * 0.03, b.yaw, Math.sin(b.klok * 1.1) * 0.03);
  peppie.m.zet("zitten"); peppie.m.mixer.update(dt); peppie.g.position.copy(boot.position).add(V(0, 0.08 - peppie.m.zithoogte(), 0)).addScaledVector(f, -0.12); peppie.g.rotation.set(0, b.yaw, 0);
  const bodem = W.diepte(b.pos.x, b.pos.z);
  // de meervallen zwemmen traag rond boven de bodem
  for (const v of b.vissen) { if (v === b.vis) continue; if (Math.hypot(v.tx - v.x, v.tz - v.z) < 1) { const a = Math.random() * 6.28, r = Math.random() * v.straal; v.tx = v.x0 + Math.cos(a) * r; v.tz = v.z0 + Math.sin(a) * r; }
    const dx = v.tx - v.x, dz = v.tz - v.z, l = Math.hypot(dx, dz) || 1, sn = 0.25 + (v.zin > 0 ? 0.5 : 0); v.x += (dx / l) * sn * dt; v.z += (dz / l) * sn * dt; v.h = Math.atan2(dx, dz); }
  // wat de livescope ziet: alles binnen de bundel voor je
  const zie = (x, z) => { const rx = x - b.pos.x, rz = z - b.pos.z, v = rx * f.x + rz * f.z, lat = rx * rechts.x + rz * rechts.z; return Math.abs(lat) < 1.5 + Math.abs(v) * 0.14 ? v : null; };
  const inBeeld = []; for (const v of b.vissen) { const a = zie(v.x, v.z); if (a === null) continue; const d = v === b.vis ? klem(dril.afstand * 0.8, 0.6, W.diepte(v.x, v.z) - 0.2) : W.diepte(v.x, v.z) - v.boven - v.zin * (W.diepte(v.x, v.z) - v.boven - b.aas) * 0.9; inBeeld.push({ v: a, d, lengte: v.lengte, hoek: v.h - b.yaw, vis: v }); }
  if (!dril.aan) {
    // het aas: omlaag en omhoog, en tikken om de vis te lokken
    if (invoer.neer) b.aas += 1.6 * dt; if (invoer.op) b.aas -= 1.6 * dt; b.aas = klem(b.aas, 0.4, Math.max(0.5, bodem - 0.15));
    if (invoer.Atik) { b.tik = 1; geluid.toon({ freq: 180, duur: 0.05, gain: 0.03 }); } b.tik = Math.max(0, b.tik - dt * 1.4);
    for (const e of inBeeld) { const v = e.vis, dicht = Math.abs(e.v - 0.25) < 1.5; if (dicht && Math.abs(e.d - b.aas) < 1.3 + v.zin * 3) { v.zin = Math.min(1.05, v.zin + dt * (0.08 + b.tik * 0.55)); v.tx = b.pos.x + f.x * 0.25; v.tz = b.pos.z + f.z * 0.25; } else v.zin = Math.max(0, v.zin - dt * 0.2);
      if (v.zin >= 1 && Math.abs(e.v - 0.25) < 0.9) { b.vis = v; v.zin = 0; beginDril(v, e.d + 3); meld("Beet! Houd de spanning in het groen", 3); geluid.piep(); spetter(b.pos.clone().addScaledVector(f, 0.8), 14, 0.6); } }
    knoppen({ A: "Tik", hoogte: true });
  } else {
    // de dril: een grote meerval sleept de belly boat mee
    const v = b.vis, uit = stapDril(dt, invoer.A), ren = dril.ren > 0, sleep = (0.2 + v.lengte * 0.45) * (ren ? 1 : 0.25);
    v.h += Math.sin(b.klok * 0.6) * 0.5 * dt; const nx = b.pos.x + Math.sin(v.h) * sleep * dt, nz = b.pos.z + Math.cos(v.h) * sleep * dt; if (W.diepte(nx, nz) > 1) b.pos.set(nx, 0, nz); else v.h += Math.PI * 0.6;
    v.x = b.pos.x + Math.sin(v.h) * Math.min(3, dril.afstand * 0.4); v.z = b.pos.z + Math.cos(v.h) * Math.min(3, dril.afstand * 0.4); let d = v.h - b.yaw; d = Math.atan2(Math.sin(d), Math.cos(d)); b.yaw += d * Math.min(1, dt * 1.5);
    if (ren && Math.random() < dt * 6) spetter(b.pos.clone().addScaledVector(voor(v.h), 1.2), 4, 0.5);
    knoppen({ A: "Draai" });
    if (uit !== "bezig") { b.vis = null;
      if (uit === "binnen") { const tekst = vangst(v); b.vissen.splice(b.vissen.indexOf(v), 1); spetter(b.pos.clone().addScaledVector(f, 0.9), 40, 1.2); if (v.lengte >= 2) einde(true, `${tekst}. Een echte reus!`); else meld(`${tekst}. Nog geen twee meter…`, 4); }
      else { meld(uit === "breuk" ? "Lijnbreuk! Laat hem lopen als hij trekt." : "Los… houd de lijn strak.", 4); geluid.fout(); v.x0 += tussen(-6, 6); } }
  }
  // de hengel: kort over de rand, de lijn recht omlaag
  const top = houdHengel(b.yaw, dril.aan ? 0.75 : 0.3, dril.aan ? 0.3 + dril.span * 0.2 : 0.03 + b.tik * 0.08); zetLijn(top, b.pos.clone().addScaledVector(f, dril.aan ? 1.6 : 1.0).setY(-0.05));
  // het scherm: tien keer per seconde een nieuw beeld
  if ((b.scopeT -= dt) <= 0) { b.scopeT = 0.1; const nu = new Date();
    scope.teken({ bodem: (v) => W.diepte(b.pos.x + f.x * v, b.pos.z + f.z * v), vissen: inBeeld, aas: dril.aan ? null : { d: b.aas - b.tik * 0.3 }, school: b.school.map((q) => { const a = zie(q.x, q.z); return a === null ? null : { v: a, d: q.d }; }).filter(Boolean), temp: 27.46 + Math.sin(b.klok * 0.4) * 0.012, tijd: `${String(nu.getHours()).padStart(2, "0")}:${String(nu.getMinutes()).padStart(2, "0")}` }); }
  hud.tel.textContent = `diepte ${bodem.toFixed(1)} m · aas ${b.aas.toFixed(1)} m`;
  volg(b.pos.clone().add(V(0, 0.9, 0)));
}

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
function nieuweRat(r = {}) { const kant_ = Math.random() < 0.5 ? 1 : -1; Object.assign(r, { langs: -kant_ * tussen(22, 40), uit: tussen(0.8, 10.5), v: kant_ * tussen(0.7, 1.5), duik: 0, f: Math.random() * 6 }); r.m ??= maakRat(); r.m.visible = true; return r; }
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
  hud.melding.hidden = true; meldT = 0;
  // met de livescope in beeld schuift het beeld naar rechtsonder, zodat de belly boat naast het scherm te zien is
  if (modus === "belly") camera.setViewOffset(innerWidth, innerHeight, -innerWidth * 0.2, -innerHeight * 0.14, innerWidth, innerHeight); else camera.clearViewOffset();
  MISSIES[modus][0](); }
function naarMenu() { camera.clearViewOffset(); spel.modus = "menu"; $("#menu").hidden = false; $("#uitslag").hidden = true; $("#hud").hidden = true; }
for (const k of document.querySelectorAll("#menu [data-missie]")) k.addEventListener("click", () => start(k.dataset.missie));
$("#opnieuw").addEventListener("click", () => start(spel.modus)); $("#terug").addEventListener("click", naarMenu); $("#stop").addEventListener("click", naarMenu);
const klok = new THREE.Clock(); let menuT = 0;
function lus() {
  const dt = Math.min(klok.getDelta(), 0.05); spel.t += dt;
  if (spel.modus === "menu") { // een rustig rondje boven de rivier
    menuT += dt * 0.06; const c = W.oeverPunt.clone().addScaledVector(u, 25); camera.position.set(c.x + Math.sin(menuT) * 70, 26, c.z + Math.cos(menuT) * 70); camera.lookAt(c.x, 2, c.z); zon.target.position.copy(c); zon.position.copy(c).add(V(40, 70, 25));
    peppie.g.position.copy(W.steiger.eind).addScaledVector(u, -1).setY(W.steiger.dek); peppie.g.rotation.set(0, huis.yaw, 0); peppie.m.zet("staan"); peppie.m.mixer.update(dt);
  } else if (spel.modus === "kijk") { /* camera van buitenaf (tools/kijk.cjs) */ } else if (!spel.klaar || spel.modus === "drone") MISSIES[spel.modus][1](dt);
  if (meldT > 0 && (meldT -= dt) <= 0) hud.melding.hidden = true;
  kippen.stap(dt, spel.modus === "kant" || spel.modus === "rat" ? { x: loop.pos.x, z: loop.pos.z, v: loop.v } : null);
  invoer.Atik = invoer.Btik = false; fx.stap(dt); W.water.position.y = Math.sin(spel.t * 0.6) * 0.012;
  renderer.render(scene, camera); requestAnimationFrame(lus);
}
$("#laden").hidden = true; $("#menu").hidden = false;
window.__spel = { kippen, zon, THREE, spel, W, start, belly, dr, rat, kant, loop, cam, invoer, dril, peppie, cocks, scope, camera, stapDril, MISSIES };
requestAnimationFrame(lus);
