// node tools/scope.cjs — tekent de livescope naast Bobs echte opname (ref/), in /tmp/lot/scope.png
const { chromium } = require("/root/tools/pw/node_modules/playwright-core"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), T = { ".html": "text/html", ".js": "text/javascript" };
(async () => { const b = await chromium.launch({ executablePath: "/usr/bin/chromium", args: ["--no-sandbox"] }); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.route("http://s.test/**", (r) => { const f = path.join(ROOT, new URL(r.request().url()).pathname); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] } : { status: 404 }); });
  p.on("pageerror", (e) => console.log("FOUT", e.message)); await p.goto("http://s.test/tools/scope.html"); await p.waitForFunction(() => window.KLAAR); await p.screenshot({ path: "/tmp/lot/scope.png" }); await b.close(); })();
