// node tools/kijk.cjs [naam...] — beelden van het landgoed vanuit vaste standpunten (domein-assen: x west, z naar de rivier), in /tmp/lot/kijk.
const { chromium } = require("/root/tools/pw/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), UIT = "/tmp/lot/kijk"; fs.mkdirSync(UIT, { recursive: true });
const T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".jpg": "image/jpeg", ".webp": "image/webp" };
// [naam, oog (x, y, z), doel (x, y, z)] — y boven de grond/water
const STANDPUNTEN = [
  ["water-huis", [8, 1.2, 48], [8, 3, 0]],
  ["boven", [2, 70, 14], [2, 0, 13.9]],
  ["linker-steiger-water", [16, 1.0, 30], [16, 1.5, 16]],
  ["middel-steiger-kant", [-1, 2.6, 10], [-1, 0.5, 22]],
  ["rechter-steiger-water", [-21, 1.2, 33], [-21, 1.2, 20]],
  ["zwembad", [12, 1.7, 17], [11, 2, -2]],
  ["kippen", [4, 1.4, 12], [2, 0.3, 6]],
  ["boot", [19, 1.6, 22], [16, 0.3, 19]],
  ["bellyboten", [17.5, 1.3, 27.5], [20.5, 0.2, 24.3]],
  ["bellyboten2", [24, 1.8, 22.6], [20.5, 0.1, 24.3]],
];
(async () => {
  const kies = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 620 } });
  await p.route("http://spel.test/**", (r) => { let f = new URL(r.request().url()).pathname; if (f.endsWith("/")) f += "index.html"; f = path.join(ROOT, f); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
  p.on("pageerror", (e) => console.log("FOUT", e.message)); p.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log("C", m.text().slice(0, 400)); });
  await p.goto("http://spel.test/"); await p.waitForSelector("#menu:not([hidden])", { timeout: 240000 });
  await p.evaluate(() => { document.querySelector("#menu").hidden = true; window.__spel.spel.modus = "kijk"; });
  for (const [naam, oog, doel] of STANDPUNTEN) { if (kies.length && !kies.includes(naam)) continue;
    await p.evaluate(([oog, doel]) => { const s = window.__spel, d = s.W.domein, V = (a) => { const w = d.wereld(a[0], 0, a[2]); w.y = Math.max(0, s.W.hoogte(w.x, w.z)) + a[1]; return w; };
      const o = V(oog), t = V(doel); s.camera.position.copy(o); s.camera.lookAt(t); s.zon.target.position.copy(t); s.zon.position.copy(t).add(new s.THREE.Vector3(40, 70, 25)); }, [oog, doel]);
    await p.waitForTimeout(1500); await p.screenshot({ path: `${UIT}/${naam}.png` }); console.log(naam); }
  console.log(await p.evaluate(() => { const d = window.__spel.W.domein; return JSON.stringify({ oever: [16.5, -1.7, -21, 11].map((x) => +d.oeverZ(x).toFixed(1)), zwembad: d.zwembad }); }));
  await b.close();
})();
