// Echte mensen: gemaakt met MakeHuman (CC0), bewegingen uit de Universal Animation Library van Quaternius (CC0).
// Zie tools/mensen/. Elke mens is één SkinnedMesh met één textuur, in een gedetailleerde en een lichte versie.
import * as THREE from "three";
import { GLTFLoader, SkeletonUtils } from "../lib/three-addons.js";
import { MeshoptDecoder } from "../lib/meshopt_decoder.mjs";

const ROLLEN = { visser: ["visser"], rooie: ["rooie"] };
// houding in het spel -> beweging uit de bibliotheek
const CLIP = {
  staan: "Idle_Loop", praten: "Idle_Talking_Loop", bellen: "Idle_TalkingPhone_Loop", armenOver: "Idle_FoldArms_Loop",
  // duwen (winkelwagen) = gewoon lopen; de handen gaan met armsturing naar de duwstang
  lopen: "Walk_Loop", rennen: "Jog_Fwd_Loop", sprinten: "Sprint_Loop", duwen: "Walk_Loop", dragen: "Walk_Loop",
  zitten: "Sitting_Idle_Loop", zittenPraten: "Sitting_Talking_Loop", fietsen: "Driving_Loop", achterop: "Sitting_Idle_Loop",
  schrik: "Hit_Chest", vliegen: "Jump_Loop", klap: "Hit_Knockback", liggen: "Death01", opstaan: "LayToIdle", boos: "Idle_No_Loop",
  hurken: "Crouch_Idle_Loop", richten: "Pistol_Aim_Neutral",
  stomp: "Punch_Cross", jab: "Punch_Jab", klapHoofd: "Hit_Head", vechtklaar: "Punch_Enter", zwaai: "Sword_Attack", knuppel: "Sword_Idle", gooien: "OverhandThrow", toverklaar: "Spell_Simple_Idle_Loop", toveren: "Spell_Simple_Shoot",
};
const EENMALIG = new Set(["Hit_Chest", "Death01", "LayToIdle", "Hit_Knockback", "Punch_Cross", "Punch_Jab", "Hit_Head", "Punch_Enter", "Sword_Attack", "OverhandThrow", "Spell_Simple_Shoot"]);

let modellen = {}, clips = {}, zithoogte = {};
/** Een beweging van buitenaf toevoegen (karate). */
export function registreerClip(naam, clip, eenmalig) { clips[naam] = clip; if (eenmalig) EENMALIG.add(naam); }
const KLEIN = matchMedia("(pointer: coarse)").matches;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3(), v4 = new THREE.Vector3(), v5 = new THREE.Vector3(),
  v6 = new THREE.Vector3(), v7 = new THREE.Vector3(), v8 = new THREE.Vector3(), q1 = new THREE.Quaternion(), q2 = new THREE.Quaternion();
/** Draai een bot (in de wereld) zo dat richting van -> naar wijst. */
function draaiBot(bot, van, naar) {
  const delta = q1.setFromUnitVectors(van.normalize(), naar.normalize());
  bot.getWorldQuaternion(q2).premultiply(delta);
  const ouder = bot.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
  bot.quaternion.copy(ouder.multiply(q2));
}
const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

/** Laadt één model (ook van buiten assets/mensen: de dieren van het kooigevecht) en maakt het klaar voor gebruik. */
export async function laadModel(n, pad = null) {
  const g = await loader.loadAsync(pad ?? `assets/mensen/${n}.glb?v=${window.VERSIE ?? ""}`);
  g.scene.traverse((o) => {
    if (!o.isMesh) return;
    const m = o.material;
    // de exporter zet het materiaal op mengen; wij knippen uit en schrijven diepte, anders vechten de vlakjes
    Object.assign(m, { transparent: false, depthWrite: true, alphaTest: 0.5, side: THREE.FrontSide, metalness: 0, roughness: 0.85 });
    // op de telefoon de textuur verkleinen (1024 -> 512): scheelt 4x geheugen, op afstand zie je het verschil niet
    if (KLEIN && m.map?.image && !m.map.userData.klein) {
      const c = document.createElement("canvas"); c.width = c.height = 512;
      c.getContext("2d").drawImage(m.map.image, 0, 0, 512, 512);
      m.map.image = c; m.map.userData.klein = true; m.map.needsUpdate = true;
    }
    o.frustumCulled = false;
  });
  modellen[n] = g.scene;
}
export async function laadMensen(voortgang) {
  const namen = Object.values(ROLLEN).flat();
  let klaar = 0;
  const bew = loader.loadAsync(`assets/mensen/bewegingen.glb?v=${window.VERSIE ?? ""}`).then((g) => {
    for (const c of g.animations) {
      // alleen draaiingen (en de heup op hoogte): de botten van elke mens staan op zijn eigen gewrichten
      c.tracks = c.tracks.filter((t) => t.name.endsWith(".quaternion") || /DEF-hips\.position$/.test(t.name));
      clips[c.name] = c;
    }
  });
  await Promise.all([bew, ...namen.map(async (n) => { await laadModel(n); voortgang?.(++klaar / namen.length); })]);
  // hoe hoog zit de heup bij het fietsen (om de berijder op het zadel te zetten)
  for (const n of namen) {
    const m = maakMens(n);
    m.zet("fietsen"); m.mixer.update(0.01); m.object.updateMatrixWorld(true);
    zithoogte[n] = m.heup.getWorldPosition(new THREE.Vector3()).y;
  }
}

/** Een nieuwe mens. rol = voetganger | fatbiker | schutter, of een vaste naam. */
export function maakMens(rol = "voetganger") {
  // fatbikers: de meesten in het zwart met een capuchon, zoals op straat
  const zwart = rol === "fatbiker" && Math.random() < 0.75;
  const naam = modellen[rol] ? rol : zwart ? "f_zwart" : ROLLEN[rol][(Math.random() * ROLLEN[rol].length) | 0];
  const object = SkeletonUtils.clone(modellen[naam]);
  let hoog = null, laag = null;
  object.traverse((o) => { if (o.isMesh) { if (o.name.includes("Laag")) laag = o; else hoog = o; } });
  const schaal = rol === "kind" ? 0.74 : rol === "tiener" ? 0.84 : rol === "schutter" || rol === "karateka" || rol === "heks" ? 1 : 0.94 + Math.random() * 0.12;
  object.scale.setScalar(schaal);
  if (rol === "kind") object.scale.set(schaal * 1.12, schaal * 0.95, schaal * 1.12); // een kind van acht: kleiner en steviger
  const mixer = new THREE.AnimationMixer(object);
  let heup = null;
  const bot = {};
  object.traverse((o) => { if (o.isBone) { bot[o.name] = o; if (/DEF-hips/.test(o.name)) heup = o; } });
  const m = {
    naam, object, mixer, hoog, laag, heup, schaal, huidig: null, actie: null,
    /** Speel een houding; overgang van 0,25 s. snelheid = afspeelsnelheid. */
    zet(soort, snelheid = 1, vanaf = null) {
      const cn = CLIP[soort] ?? soort;
      if (this.huidig === cn && vanaf === null) { if (this.actie) this.actie.timeScale = snelheid; return; }
      const c = clips[cn];
      if (!c) return;
      const a = mixer.clipAction(c);
      a.reset(); a.timeScale = snelheid;
      if (EENMALIG.has(cn)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      if (vanaf === "eind") a.time = c.duration - 0.01;
      else if (vanaf !== null) a.time = vanaf;
      else if (!EENMALIG.has(cn)) a.time = Math.random() * c.duration;
      a.play();
      if (this.actie && this.actie !== a) this.actie.crossFadeTo(a, vanaf === "eind" ? 0.05 : 0.25, false);
      this.actie = a; this.huidig = cn;
    },
    /** Gedetailleerd dichtbij (of in de kijker), licht ver weg. */
    detail(fijn, schaduw) {
      if (hoog) { hoog.visible = fijn; hoog.castShadow = fijn && schaduw; }
      if (laag) { laag.visible = !fijn; laag.castShadow = false; }
    },
    zithoogte: () => zithoogte[naam] ?? 0.55,
    /** Waar een bot nu in de wereld staat (na mixer.update en updateMatrixWorld). */
    plek: (n, uit = new THREE.Vector3()) => bot[n].getWorldPosition(uit),
    /** Draai een bot (in de wereld) zo dat de richting van naar naar wijst; alles eronder draait mee. */
    buig(n, van, naar) {
      const b = bot[n]; if (!b) return;
      const u = b.userData;
      u.voor = (u.voor ?? new THREE.Quaternion()).copy(b.quaternion);
      draaiBot(b, v7.copy(van), v8.copy(naar)); b.updateWorldMatrix(false, true);
      u.na = (u.na ?? new THREE.Quaternion()).copy(b.quaternion);
    },
    /** Maak een eerdere buig ongedaan. Nodig omdat de mixer een bot dat in de beweging stilstaat niet opnieuw zet. */
    los(n) { const b = bot[n], u = b?.userData; if (u?.na && b.quaternion.equals(u.na)) { b.quaternion.copy(u.voor); b.updateWorldMatrix(false, true); } if (u) u.na = null; },
    /**
     * Armsturing (twee botten): zet de hand (kant "L" of "R") op het punt doel (wereld).
     * buig = richting (wereld) waarheen de elleboog wijst. Roep aan na mixer.update().
     */
    arm(kant, doel, buig) {
      const A = bot[`DEF-upper_arm${kant}`], B = bot[`DEF-forearm${kant}`], C = bot[`DEF-hand${kant}`]; // three haalt de punt uit de naam
      if (!A || !B || !C) return;
      A.updateWorldMatrix(true, true);
      const a = A.getWorldPosition(v1), b = B.getWorldPosition(v2), c = C.getWorldPosition(v3);
      const la = a.distanceTo(b), lb = b.distanceTo(c);
      const naar = v4.copy(doel).sub(a);
      const d = THREE.MathUtils.clamp(naar.length(), Math.abs(la - lb) + 1e-3, la + lb - 1e-3);
      const n = naar.normalize();
      // waar de elleboog moet komen: wet van de cosinus, in het vlak van de buigrichting
      const p = v5.copy(buig).addScaledVector(n, -buig.dot(n)).normalize();
      const hoek = Math.acos(THREE.MathUtils.clamp((la * la + d * d - lb * lb) / (2 * la * d), -1, 1));
      const elleboog = v6.copy(a).addScaledVector(n, la * Math.cos(hoek)).addScaledVector(p, la * Math.sin(hoek));
      draaiBot(A, v7.copy(b).sub(a), v8.copy(elleboog).sub(a));
      A.updateWorldMatrix(false, true);
      B.getWorldPosition(b); C.getWorldPosition(c);
      draaiBot(B, v7.copy(c).sub(b), v8.copy(doel).sub(b));
      B.updateWorldMatrix(false, true);
    },
  };
  m.detail(false, false);
  if (rol === "handhaver" || rol === "agent") uniform(m, rol);
  if (rol === "karateka") band(m);
  if (rol === "heks") cape(m);
  if (rol === "kind") kuif(m);
  if (rol === "rooie") kuif(m, "#ab4419");
  if (rol === "tiener") pijpenkrullen(m);
  if (zwart) hoodie(m, Math.random() < 0.8);
  return m;
}
/** Zwarte hoodie: de capuchon op het hoofd (of afgezakt in de nek), en een dikke kraag. Beweegt mee met hoofd en romp. */
const STOF = new THREE.MeshStandardMaterial({ color: "#0c0c0e", roughness: 1, side: THREE.DoubleSide });
function hoodie(m, op) {
  const o = m.object; o.updateMatrixWorld(true);
  let hoofd = null, romp = null;
  o.traverse((b) => { if (b.isBone && b.name === "DEF-head") hoofd = b; if (b.isBone && b.name === "DEF-spine003") romp = b; });
  if (!hoofd || !romp) return;
  const s = m.schaal, top = new THREE.Box3().setFromObject(m.hoog ?? o).max.y, hp = hoofd.getWorldPosition(new THREE.Vector3());
  const zet = (bot, mesh, p) => { mesh.position.copy(p); mesh.castShadow = true; o.add(mesh); mesh.updateMatrixWorld(true); bot.attach(mesh); };
  if (op) {
    // om het hoofd, open aan de voorkant (+z): een bolschil van kruin tot nek
    const kap = new THREE.Mesh(new THREE.SphereGeometry(0.128 * s, 14, 10, Math.PI / 2 + 0.85, Math.PI * 2 - 1.7, 0, 2.35), STOF);
    kap.scale.set(1, 1.12, 1.1);
    zet(hoofd, kap, new THREE.Vector3(hp.x, top - 0.125 * s, hp.z - 0.012 * s));
  } else {
    // afgezakt: een prop stof in de nek
    const prop = new THREE.Mesh(new THREE.SphereGeometry(0.1 * s, 10, 8), STOF);
    prop.scale.set(1.25, 0.6, 0.8);
    zet(romp, prop, new THREE.Vector3(hp.x, top - 0.3 * s, hp.z - 0.1 * s));
  }
  const kraag = new THREE.Mesh(new THREE.TorusGeometry(0.075 * s, 0.035 * s, 6, 12), STOF);
  kraag.rotation.x = Math.PI / 2;
  zet(romp, kraag, new THREE.Vector3(hp.x, top - 0.275 * s, hp.z + 0.005 * s));
}
/** Een kuifje: een lok die voor op het hoofd omhoog staat (maten in de wereld, daarna aan het hoofd gehangen). */
function kuif(m, kleur = "#e6c66a") {
  const o = m.object; o.updateMatrixWorld(true);
  let hoofd = null; o.traverse((b) => { if (b.isBone && b.name === "DEF-head") hoofd = b; });
  if (!hoofd || !m.hoog) return;
  const s = m.schaal, top = new THREE.Box3().setFromObject(m.hoog).max.y, hp = hoofd.getWorldPosition(new THREE.Vector3());
  const lok = new THREE.Mesh(new THREE.ConeGeometry(0.045 * s, 0.13 * s, 7), new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.8 }));
  lok.position.set(hp.x, top - 0.002 * s, hp.z + 0.075 * s); lok.rotation.x = -0.6; lok.castShadow = true;
  lok.updateMatrixWorld(true); hoofd.attach(lok);
}
/** Pijpenkrullen: lange kurkentrekkers die rondom van het hoofd tot over de schouders hangen (ze zitten aan het hoofd vast). */
function pijpenkrullen(m, kleur = "#ab4419") {
  const o = m.object; o.updateMatrixWorld(true);
  let hoofd = null; o.traverse((b) => { if (b.isBone && b.name === "DEF-head") hoofd = b; });
  if (!hoofd || !m.hoog) return;
  const s = m.schaal, top = new THREE.Box3().setFromObject(m.hoog).max.y, hp = hoofd.getWorldPosition(new THREE.Vector3());
  const mat = new THREE.MeshStandardMaterial({ color: kleur, roughness: 0.6 }), groep = new THREE.Group();
  groep.position.set(hp.x, top - 0.1 * s, hp.z + 0.005 * s); // het midden van het hoofd
  const N = 15;
  for (let i = 0; i < N; i++) {
    // van de ene slaap via het achterhoofd naar de andere (0 = recht naar achteren); om en om een rij dichter op het hoofd
    const h = ((i / (N - 1)) * 2 - 1) * 2.15, binnen = i % 2, R = (binnen ? 0.085 : 0.108) * s, lang = (0.4 - Math.abs(h) * 0.035 + (binnen ? 0.03 : 0)) * s;
    const x0 = Math.sin(h) * R, z0 = -Math.cos(h) * R, y0 = (0.045 - Math.abs(h) * 0.012) * s, r = 0.024 * s, slagen = 7 + binnen, f = i * 1.7, punten = [];
    for (let k = 0; k <= slagen * 8; k++) {
      const t = k / (slagen * 8), a = f + t * slagen * 6.2832 * (i % 3 ? 1 : -1), rr = r * (0.55 + 0.45 * Math.min(1, t * 4)) * (1 - t * 0.25);
      punten.push(new THREE.Vector3(x0 + Math.cos(a) * rr + Math.sin(h) * t * 0.02 * s, y0 - t * lang, z0 + Math.sin(a) * rr - Math.cos(h) * t * 0.02 * s));
    }
    const krul = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(punten), slagen * 10, 0.012 * s, 5), mat); krul.castShadow = true; groep.add(krul);
  }
  groep.updateMatrixWorld(true); hoofd.attach(groep); // de maten hierboven zijn wereldmaten: zo blijven ze kloppen, hoe het model ook geschaald is
}
/** Laat de cape hangen en waaien: recht omlaag (ook als ze bukt of leunt), naar achteren bij vaart, met een lichte deining. */
const _cq = new THREE.Quaternion(), _ce = new THREE.Euler();
export function waaiCape(m, yaw, vaart, tijd) {
  const c = m.cape; if (!c) return;
  const wind = Math.min(1, vaart / 5.5), deining = Math.sin(tijd * 2.3) * (0.02 + wind * 0.05);
  _ce.set(0.03 + wind * 0.28 + deining, yaw, Math.sin(tijd * 1.7) * 0.02, "YXZ");
  c[0].parent.getWorldQuaternion(_cq); c[0].quaternion.copy(_cq.invert()).multiply(new THREE.Quaternion().setFromEuler(_ce));
  // de onderste stukken buigen verder door: zo krult de cape in de wind in plaats van als één plaat te scharnieren
  for (let i = 1; i < c.length; i++) c[i].rotation.x = wind * 0.3 + Math.sin(tijd * 2.3 - i * 0.9) * (0.03 + wind * 0.06);
}
/** De cape van de tovenares: paars, met een zwarte opstaande kraag, een zwarte zoom en een zwarte sluiting. Hangt aan de schouders. */
function cape(m) {
  const o = m.object; o.updateMatrixWorld(true);
  let romp = null; o.traverse((b) => { if (b.isBone && b.name === "DEF-spine003") romp = b; });
  if (!romp || !m.hoog) return;
  const s = m.schaal, top = new THREE.Box3().setFromObject(m.hoog).max.y, rp = romp.getWorldPosition(new THREE.Vector3());
  const paars = new THREE.MeshStandardMaterial({ color: "#5b2a86", roughness: 0.85, side: THREE.DoubleSide }), zwart = new THREE.MeshStandardMaterial({ color: "#0f0d12", roughness: 0.9, side: THREE.DoubleSide });
  const zet = (mesh, p) => { mesh.position.copy(p); mesh.castShadow = true; o.add(mesh); mesh.updateMatrixWorld(true); romp.attach(mesh); };
  // het doek: een lap die van de schouders over de rug hangt, smal boven en breder onder, met plooien. Hij bestaat uit drie
  // stukken die aan elkaar scharnieren (m.cape), zodat hij recht omlaag hangt en bij het lopen in een boog naar achteren waait.
  const yBoven = top - 0.275 * s, lengte = 0.98 * s, N = 16, R = 9, DEEL = 3, rij = lengte / R;
  const punt = (r, i, y0) => {
    const t = r / R, u = (i / N) * 2 - 1, breed = (0.36 + 0.3 * t) * s;
    return [u * breed / 2, -(r * rij) - y0, -(0.105 + 0.03 * t) * s - (1 - u * u) * 0.035 * s - Math.sin(i * 2.1) * 0.022 * t * s];
  };
  const stukken = []; let ouder = null;
  for (let d = 0; d < R / DEEL; d++) {
    const pos = [], idx = [], r0 = d * DEEL, y0 = -(r0 * rij); // het scharnier ligt op de bovenrand van dit stuk
    for (let r = r0; r <= r0 + DEEL; r++) for (let i = 0; i <= N; i++) { const q = punt(r, i, 0); pos.push(q[0], q[1] - y0, q[2]); }
    for (let r = 0; r < DEEL; r++) for (let i = 0; i < N; i++) { const a = r * (N + 1) + i, b2 = a + N + 1; idx.push(a, b2, a + 1, a + 1, b2, b2 + 1); }
    const maak = (van, tot, mat) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx.slice(van * N * 6, tot * N * 6)); g.computeVertexNormals(); const me = new THREE.Mesh(g, mat); me.castShadow = true; return me; };
    const stuk = new THREE.Group(), laatste = d === R / DEEL - 1;
    stuk.add(maak(0, laatste ? DEEL - 1 : DEEL, paars)); if (laatste) stuk.add(maak(DEEL - 1, DEEL, zwart)); // de onderste baan is de zwarte zoom
    if (ouder) { stuk.position.y = -(DEEL * rij); ouder.add(stuk); }
    stukken.push(stuk); ouder = stuk;
  }
  zet(stukken[0], new THREE.Vector3(rp.x, yBoven, rp.z)); m.cape = stukken;
  // opstaande kraag en de sluiting op de borst
  const kraag = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * s, 0.16 * s, 0.075 * s, 14, 1, true, Math.PI * 0.62, Math.PI * 1.76), zwart);
  zet(kraag, new THREE.Vector3(rp.x, yBoven - 0.03 * s, rp.z - 0.02 * s)); // onder de kin, open aan de voorkant
  zet(new THREE.Mesh(new THREE.SphereGeometry(0.022 * s, 8, 6), new THREE.MeshStandardMaterial({ color: "#c9a23a", metalness: 0.6, roughness: 0.3 })), new THREE.Vector3(rp.x, yBoven - 0.03 * s, rp.z + 0.15 * s));
}
/** De band om het karatepak: zwart, met een knoop en twee uiteinden aan de voorkant. */
const BAND = new THREE.MeshStandardMaterial({ color: "#111113", roughness: 0.9 });
function band(m) {
  const o = m.object; o.updateMatrixWorld(true);
  let heup = null;
  o.traverse((b) => { if (b.isBone && b.name === "DEF-hips") heup = b; });
  if (!heup || !m.hoog) return;
  const s = m.schaal, hp = heup.getWorldPosition(new THREE.Vector3()), y0 = hp.y + 0.07 * s, H = 0.048 * s;
  // de omtrek van het middel meten: per richting het verste punt van het pak op deze hoogte (armen tellen niet mee)
  const N = 28, straal = new Float32Array(N), v = new THREE.Vector3(), P = m.hoog.geometry.attributes.position;
  for (let i = 0; i < P.count; i++) {
    m.hoog.getVertexPosition(i, v).applyMatrix4(m.hoog.matrixWorld);
    if (Math.abs(v.y - y0) > 0.05 * s) continue;
    const dx = v.x - hp.x, dz = v.z - hp.z, r = Math.hypot(dx, dz);
    if (r > 0.26 * s) continue;
    const k = Math.round(((Math.atan2(dx, dz) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI * 2) * N) % N;
    if (r > straal[k]) straal[k] = r;
  }
  // gaten opvullen en gladstrijken, zodat de band strak om het lijf ligt
  const gem = straal.reduce((a, b) => a + b, 0) / Math.max(1, straal.filter((r) => r > 0).length) || 0.15 * s;
  for (let i = 0; i < N; i++) if (!straal[i]) straal[i] = gem;
  const glad = Float32Array.from(straal, (r, i) => Math.max(r, (straal[(i + N - 1) % N] + r * 2 + straal[(i + 1) % N]) / 4) + 0.008 * s);
  const pos = [], idx = [];
  for (let i = 0; i <= N; i++) { const h = (i / N) * Math.PI * 2, r = glad[i % N]; for (const dy of [-H / 2, H / 2]) pos.push(Math.sin(h) * r, dy, Math.cos(h) * r); }
  for (let i = 0; i < N; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const stof = BAND.clone(); stof.side = THREE.DoubleSide;
  const zet = (mesh, p) => { mesh.position.copy(p); mesh.castShadow = true; o.add(mesh); mesh.updateMatrixWorld(true); heup.attach(mesh); };
  zet(new THREE.Mesh(g, stof), new THREE.Vector3(hp.x, y0, hp.z));
  // de knoop voor op de buik, met twee afhangende uiteinden
  const voor = glad[0];
  zet(new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 0.05 * s, 0.03 * s), BAND), new THREE.Vector3(hp.x, y0, hp.z + voor + 0.008 * s));
  for (const k of [-1, 1]) { const e = new THREE.Mesh(new THREE.BoxGeometry(0.04 * s, 0.2 * s, 0.01 * s), BAND); e.rotation.z = k * 0.2; zet(e, new THREE.Vector3(hp.x + k * 0.035 * s, y0 - 0.11 * s, hp.z + voor + 0.012 * s)); }
}
/** Pet en hesje voor handhaving (geel hesje) en politie (donker vest met gele band); ze bewegen mee met hoofd en romp. */
function uniform(m, rol) {
  const o = m.object; o.updateMatrixWorld(true);
  const hoofd = [], romp = [];
  o.traverse((b) => { if (b.isBone && b.name === "DEF-head") hoofd.push(b); if (b.isBone && b.name === "DEF-spine003") romp.push(b); });
  if (!hoofd[0] || !romp[0]) return;
  const s = m.schaal, P = (b) => b.getWorldPosition(new THREE.Vector3());
  const hp = P(hoofd[0]), rp = P(romp[0]), heup = P(m.heup);
  const geel = new THREE.MeshStandardMaterial({ color: "#d9e636", roughness: 0.7, emissive: "#5a6010", emissiveIntensity: 0.5 });
  const donker = new THREE.MeshStandardMaterial({ color: rol === "agent" ? "#0d1428" : "#16324a", roughness: 0.8 });
  const wit = new THREE.MeshStandardMaterial({ color: "#f2f2ee", roughness: 0.6 });
  const zet = (bot, mesh, p) => { mesh.position.copy(p); o.add(mesh); mesh.updateMatrixWorld(true); bot.attach(mesh); };
  // hesje: een wijde koker om de romp, van de heup tot onder de nek
  const h = (hp.y - heup.y) * 0.8, vest = new THREE.Mesh(new THREE.CylinderGeometry(0.2 * s, 0.185 * s, h, 14, 1, true), rol === "agent" ? donker : geel);
  vest.scale.z = 0.78; vest.material.side = THREE.DoubleSide; vest.castShadow = true;
  zet(romp[0], vest, new THREE.Vector3(rp.x, heup.y + h * 0.56, rp.z));
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.204 * s, 0.2 * s, 0.07 * s, 14, 1, true), rol === "agent" ? geel : donker);
  band.scale.z = 0.78; band.material.side = THREE.DoubleSide;
  zet(romp[0], band, new THREE.Vector3(rp.x, heup.y + h * 0.62, rp.z));
  // pet: bol kapje met een klep naar voren (+z in rust)
  // de kruin: het hoogste punt van het model in rust
  const top = new THREE.Box3().setFromObject(m.hoog ?? o).max.y - 0.025 * s;
  const kap = new THREE.Mesh(new THREE.CylinderGeometry(0.098 * s, 0.108 * s, 0.075 * s, 12), donker);
  zet(hoofd[0], kap, new THREE.Vector3(hp.x, top, hp.z + 0.01 * s));
  const rand = new THREE.Mesh(new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.022 * s, 12), rol === "agent" ? wit : geel);
  zet(hoofd[0], rand, new THREE.Vector3(hp.x, top - 0.03 * s, hp.z + 0.01 * s));
  const klep = new THREE.Mesh(new THREE.BoxGeometry(0.15 * s, 0.012 * s, 0.09 * s), donker);
  zet(hoofd[0], klep, new THREE.Vector3(hp.x, top - 0.035 * s, hp.z + 0.125 * s));
}
export const mensenGeladen = () => Object.keys(modellen).length > 0;
