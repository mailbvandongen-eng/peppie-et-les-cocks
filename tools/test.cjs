// node tools/test.cjs — laadt het spel in headless Chromium, speelt elke missie kort (versneld waar dat kan) en maakt beelden in /tmp/lot/test.
const { chromium } = require("/root/tools/pw/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), UIT = "/tmp/lot/test"; fs.mkdirSync(UIT, { recursive: true });
const T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".jpg": "image/jpeg", ".webp": "image/webp" };
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true });
  await p.route("http://spel.test/**", (r) => { let f = new URL(r.request().url()).pathname; if (f.endsWith("/")) f += "index.html"; f = path.join(ROOT, f); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
  const fout = []; p.on("pageerror", (e) => { fout.push(e.message); console.log("FOUT", e.message); }); p.on("console", (m) => { if (m.type() === "error") console.log("C", m.text().slice(0, 200)); });
  await p.goto("http://spel.test/"); await p.waitForSelector("#menu:not([hidden])", { timeout: 240000 });
  const beeld = async (n, wacht = 2500) => { await p.waitForTimeout(wacht); await p.screenshot({ path: `${UIT}/${n}.png` }); };
  await beeld("0-menu");
  console.log("spelers:", await p.evaluate(() => { const s = window.__spel, uit = []; for (const n of ["dave", "wim", "bob", "paul"]) { s.kiesSpeler(n); uit.push(n + ":" + (s.peppie === s.C[n]) + "/" + s.cocks.m.naam); } return uit.join(" "); }));
  console.log("wereld:", await p.evaluate(() => { const s = window.__spel, W = s.W; return JSON.stringify({ huis: W.huis.pos.toArray().map((v) => +v.toFixed(1)), steiger: W.steiger.eind.toArray().map((v) => +v.toFixed(1)), diepSteiger: +W.diepte(W.steiger.eind.x, W.steiger.eind.z).toFixed(1), breed: (() => { let a = 0; while (a < 400 && W.inWater(W.oeverPunt.x + W.huis.u.x * (a + 2), W.oeverPunt.z + W.huis.u.z * (a + 2))) a += 1; return a; })(), bomen: W.bomen.length }); }));
  // sandbox: vrij rondlopen, instappen, uitstappen, vissen op de steiger en weer stoppen
  console.log("sandbox:", await p.evaluate(() => { const s = window.__spel, uit = [], st = () => s.MISSIES[s.spel.modus][1](0.05); s.start("vrij"); st(); uit.push(s.spel.modus);
    const eb = s.eigenBoot(); s.loop.pos.set(eb.b.position.x - 1, 0, eb.b.position.z); s.invoer.Atik = true; st(); s.invoer.Atik = false; uit.push(s.spel.modus);
    for (let i = 0; i < 5; i++) st(); s.invoer.Btik = true; st(); s.invoer.Btik = false; uit.push(s.spel.modus + (s.spel.modus === "vrij" ? "@" + (s.W.oever(s.loop.pos.x, s.loop.pos.z) < 0 ? "land" : "steiger") : ""));
    s.loop.pos.copy(s.W.steiger.midden); st(); s.invoer.Btik = true; st(); s.invoer.Btik = false; uit.push(s.spel.modus); st(); s.invoer.Btik = true; st(); s.invoer.Btik = false; uit.push(s.spel.modus); return uit.join(" → "); }));
  await beeld("0b-vrij", 1500);
  await p.evaluate(() => window.__spel.start("belly"));
  // belly boat: zet een reus recht onder de boot en kijk of de dril en de vangst werken
  await beeld("1-belly");
  console.log("belly:", await p.evaluate(() => { const s = window.__spel, b = s.belly, W = s.W, reuzen = s.vb.reuzen.length; const k = W.kolken[0]; b.pos.set(k[0], 0, k[1]); b.yaw = 0.5; return JSON.stringify({ vissen: s.vb.lijst.length, scholen: s.vb.scholen.length, reuzen, diepteKolk: +W.diepte(k[0], k[1]).toFixed(1) }); }));
  await beeld("2-scope", 3500);
  console.log("  beet:", await p.evaluate(() => { const s = window.__spel, b = s.belly, st = s.MISSIES.belly[1]; st(0.05); const v = s.vb.reuzen[0]; s.aasgedrag.aan = 300;
    const zetVis = () => { v.x = b.top.x + 0.8; v.z = b.top.z; v.d = b.aas; }; b.aas = 4; let t = 0;
    while (!s.drilB && t < 40) { if (!v.nieuws) zetVis(); s.invoer.Atik = !!s.aasgedrag.pakt; st(0.05); s.invoer.Atik = false; t += 0.05; }
    return `dril ${!!s.drilB} na ${t.toFixed(1)} s, vis ${s.drilB?.vis.soort} ${s.drilB?.vis.lengte.toFixed(2)} m, bodycam ${s.bodycam.aan}`; }));
  await beeld("3-dril"); await p.evaluate(() => { const s = window.__spel; s.drilB.fase = "duik"; s.drilB.faseT = 5; s.invoer.A = true; for (let i = 0; i < 20; i++) s.MISSIES.belly[1](0.05); s.invoer.A = false; }); await beeld("3b-duik", 800);
  console.log("  dril:", await p.evaluate(() => { const s = window.__spel, st = s.MISSIES.belly[1]; let t = 0, af = 0, duik = 0; while (s.drilB && t < 900) { const d = s.drilB; s.invoer.A = true; s.invoer.op = d.fase === "rust" && (t % 2) < 0.7; s.invoer.neer = !s.invoer.op && (t % 2) < 1.2; st(0.05); t += 0.05; if (s.drilB?.af > 0) af += 0.05; if (s.drilB?.fase === "duik") duik += 0.05; } s.invoer.A = s.invoer.op = s.invoer.neer = false;
    return `klaar na ${t.toFixed(0)} s (lijn eraf ${af.toFixed(0)} s, duiken ${duik.toFixed(0)} s): ${document.querySelector("#melding").textContent} | missie klaar: ${s.spel.klaar}`; }));
  await beeld("4-binnen", 2500);
  // vanaf de kant
  await p.evaluate(() => window.__spel.start("kant")); await beeld("5-kant");
  console.log("kant:", await p.evaluate(() => { const s = window.__spel, st = s.MISSIES.kant[1], k = s.kant; s.loop.pos.copy(s.W.steiger.eind).addScaledVector(s.W.huis.u, -1.5); let log = [];
    for (let n = 0; n < 3 && !s.spel.klaar; n++) { let t = 0; st(0.05); s.invoer.Atik = true; st(0.05); s.invoer.Atik = false; while (k.fase !== "beet" && t < 40) { st(0.05); t += 0.05; } s.invoer.Atik = true; st(0.05); s.invoer.Atik = false; t = 0; while (k.fase === "dril" && t < 300) { s.invoer.A = s.dril.span < 0.7; st(0.05); t += 0.05; } s.invoer.A = false; log.push(document.querySelector("#melding").textContent); }
    return log.join(" | ") + " | klaar: " + s.spel.klaar; }));
  await beeld("6-kant-na");
  // drone
  await p.evaluate(() => window.__spel.start("drone")); await beeld("7-drone");
  console.log("drone:", await p.evaluate(() => { const s = window.__spel, W = s.W, d = s.dr, st = s.MISSIES.drone[1]; s.piloot.nuchter = true; s.piloot.valT = 999; const buiten = W.huis.raam.clone().addScaledVector(W.huis.u, 3); d.pos.copy(buiten); s.cam.yaw = W.huis.yaw; s.cam.pitch = 0.1; let t = 0;
    s.invoer.y = 1; while (t < 6 && d.pos.distanceTo(W.huis.bed) > 0.9) { st(0.05); t += 0.05; if (Math.abs(d.pos.x - W.huis.bed.x) < 0.5 && Math.abs(d.pos.z - W.huis.bed.z) < 0.5) break; } s.invoer.y = 0;
    const l = W.huis.naarBinnen(d.pos); return JSON.stringify({ binnen: Math.abs(l.z) < W.huis.BZ / 2 && Math.abs(l.x) < W.huis.BX / 2, sec: +t.toFixed(1), totBed: +Math.hypot(d.pos.x - W.huis.bed.x, d.pos.z - W.huis.bed.z).toFixed(2), hoogte: +(d.pos.y - W.huis.bed.y).toFixed(2) }); }));
  await beeld("8-drone-binnen", 3000);
  console.log("  piloten:", await p.evaluate(() => { const s = window.__spel, st = s.MISSIES.drone[1]; s.piloot.nuchter = false; s.piloot.valT = 0.01; for (let t = 0; t < 3; t += 0.05) st(0.05); return s.piloot.lijst.map((q) => (q.w === s.C.paul ? "Paul" : "Bob") + (q === s.piloot.heeft ? "(ab)" : "") + (q.val > 0 ? " ligt" : " staat")).join(", "); }));
  console.log("  glas:", await p.evaluate(() => { const s = window.__spel, st = s.MISSIES.drone[1]; s.piloot.nuchter = true; s.piloot.lijst.forEach((q) => q.val = 0); s.piloot.valT = 999; s.dr.pos.x = s.W.huis.bed.x; s.dr.pos.z = s.W.huis.bed.z; s.invoer.Atik = true; st(0.02); s.invoer.Atik = false; for (let t = 0; t < 2; t += 0.02) st(0.02); return `wakker: ${s.cocks.wakker}, klaar: ${s.spel.klaar}`; }));
  await beeld("9-wakker", 3000);
  // beverratten
  await p.evaluate(() => window.__spel.start("rat")); await beeld("10-rat");
  console.log("rat:", await p.evaluate(() => { const s = window.__spel, st = s.MISSIES.rat[1], W = s.W, r = s.rat; s.loop.pos.copy(W.steiger.midden); s.loop.yaw = W.huis.yaw; let t = 0;
    while (r.n < 5 && t < 119) { const f = { x: Math.sin(s.loop.yaw), z: Math.cos(s.loop.yaw) }, nx = s.loop.pos.x + f.x * 2.5, nz = s.loop.pos.z + f.z * 2.5; s.invoer.Atik = r.lijst.some((q) => q.duik <= 0 && Math.hypot(q.m.position.x - nx, q.m.position.z - nz) < 1.4); st(0.05); s.invoer.Atik = false; t += 0.05; if (t % 20 < 0.05) s.loop.yaw = W.huis.yaw + (Math.random() - 0.5); }
    return `${r.n} gevangen in ${t.toFixed(0)} s, klaar: ${s.spel.klaar}`; }));
  await beeld("11-rat-na");
  console.log(fout.join("\n") || "geen fouten");
  await b.close();
})();
