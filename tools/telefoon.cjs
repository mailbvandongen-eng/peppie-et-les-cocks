// node tools/telefoon.cjs — de bellyboat-missie op een iPhone (liggend en staand), varen en livescope; beelden in /tmp/lot/tel.
const { chromium, devices } = require("/root/tools/pw/node_modules/playwright-core");
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), UIT = "/tmp/lot/tel"; fs.mkdirSync(UIT, { recursive: true });
const T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json", ".glb": "model/gltf-binary", ".jpg": "image/jpeg", ".webp": "image/webp", ".webp": "image/webp", ".jpg": "image/jpeg", ".hdr": "application/octet-stream" };
(async () => {
  const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  for (const [naam, vp] of [["liggend", { width: 844, height: 390 }], ["staand", { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    await p.route("http://spel.test/**", (r) => { let f = new URL(r.request().url()).pathname; if (f.endsWith("/")) f += "index.html"; f = path.join(ROOT, f); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
    p.on("pageerror", (e) => console.log("FOUT", e.message));
    await p.goto("http://spel.test/"); await p.waitForSelector("#menu:not([hidden])", { timeout: 300000 });
    if (process.argv[2] === "menu") { await p.waitForTimeout(3000); await p.screenshot({ path: `${UIT}/${naam}-menu.png` }); }
    if (process.argv[2] === "wim") await p.evaluate(() => window.__spel.kiesSpeler("wim")); await p.tap("[data-missie=belly]"); await p.waitForTimeout(800);
    // even varen
    await p.evaluate(() => { const s = window.__spel; s.invoer.y = 0.8; s.invoer.x = 0.2; }); await p.waitForTimeout(2500); await p.evaluate(() => { const s = window.__spel; s.invoer.y = 0; s.invoer.x = 0; });
    await p.waitForTimeout(1500); await p.screenshot({ path: `${UIT}/${naam}-varen.png` });
    if (process.argv[2] === "wim") await p.evaluate(() => { const s = window.__spel, b = s.belly; s.vb.lijst.slice(0, 4).forEach((v, i) => { v.x = b.pos.x + (i - 1.5) * 0.8; v.z = b.pos.z + 0.6; v.tx = v.x; v.tz = v.z; v.x0 = v.x; v.z0 = v.z; v.straal = 0.2; v.boven = 2 + i * 1.6; }); });
    for (const w of ["scope", "vol"]) { await p.evaluate((w) => document.querySelector(`#weergave [data-w=${w}]`).click(), w); await p.waitForTimeout(process.argv[2] === "wim" ? 9000 : 2500); await p.screenshot({ path: `${UIT}/${naam}-${w}.png` }); }
    console.log(naam, await p.evaluate(() => { const s = window.__spel; return JSON.stringify({ diepte: +s.W.diepte(s.belly.pos.x, s.belly.pos.z).toFixed(1), weergave: s.belly.weergave, vissen: s.vb.lijst.length, scholen: s.vb.scholen.length }); }));
    await p.close();
  }
  await b.close();
})();
