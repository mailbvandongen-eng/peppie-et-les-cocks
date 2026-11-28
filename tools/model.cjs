// node tools/model.cjs <glb> [regex] [uit.png]
const { chromium } = require("/root/tools/pw/node_modules/playwright-core"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".gltf": "model/gltf+json", ".bin": "application/octet-stream", ".png": "image/png" };
(async () => { const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 900, height: 700 } });
  await p.route("http://m.test/**", (r) => { const f = path.join(ROOT, new URL(r.request().url()).pathname); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
  p.on("pageerror", (e) => console.log("FOUT", e.message));
  await p.goto(`http://m.test/tools/model.html?m=../${process.argv[2]}&n=${encodeURIComponent(process.argv[3] || "")}&zij=${process.env.ZIJ || ""}&lak=${encodeURIComponent(process.env.LAK || "")}&kleur=${encodeURIComponent(process.env.KLEUR || "")}`); await p.waitForFunction(() => window.KLAAR, null, { timeout: 120000 });
  console.log(await p.evaluate(() => window.KLAAR)); await p.screenshot({ path: process.argv[4] || "/tmp/lot/model.png" }); await b.close(); })();
