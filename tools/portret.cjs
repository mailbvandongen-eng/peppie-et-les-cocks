// node tools/portret.cjs — de vier Cocks naast elkaar, van voren en hun hoofden van dichtbij, in /tmp/lot/portret.png
const { chromium } = require("/root/tools/pw/node_modules/playwright-core"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".jpg": "image/jpeg" };
(async () => { const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 1100, height: 700 } });
  await p.route("http://spel.test/**", (r) => { let f = new URL(r.request().url()).pathname; if (f.endsWith("/")) f += "index.html"; f = path.join(ROOT, f); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
  p.on("pageerror", (e) => console.log("FOUT", e.message));
  await p.goto("http://spel.test/"); await p.waitForSelector("#menu:not([hidden])", { timeout: 300000 });
  for (const [naam, hoogte, afst] of [["portret", 1.0, 4.2], ["koppen", 1.62, 1.6]]) {
    await p.evaluate(([hoogte, afst]) => { const s = window.__spel, d = s.W.domein, V = (x, y, z) => new s.THREE.Vector3(x, y, z); document.querySelector("#menu").hidden = true; s.spel.modus = "kijk";
      const rij = [s.peppie, s.dave, s.cocks, s.wim]; rij.forEach((w, i) => { const q = d.wereld(-6 + i * 0.9, 0, 9); w.g.position.set(q.x, s.W.hoogte(q.x, q.z), q.z); w.g.rotation.set(0, d.yaw, 0); w.m.zet("staan", 0.001, 0); w.m.mixer.update(1); w.g.visible = true; w.m.pet?.userData.pas?.(); });
      const m = d.wereld(-4.65, 0, 9), c = d.wereld(-4.65, 0, 9 + afst), y = s.W.hoogte(m.x, m.z); s.camera.position.set(c.x, y + hoogte, c.z); s.camera.lookAt(m.x, y + hoogte, m.z); s.zon.target.position.copy(m); s.zon.position.copy(m).add(V(20, 40, 35)); }, [hoogte, afst]);
    await p.waitForTimeout(1500); await p.screenshot({ path: `/tmp/lot/${naam}.png` }); }
  await b.close(); })();
