// node tools/assets.cjs — de assets-catalogus: een voorbeeldplaatje per asset (assets/_voorbeeld/), assets/catalogus.json en assets.html.
// Per asset: naam, map, grootte, driehoeken, texturen (max px), bron, licentie, en "nieuw" als het minder dan 3 dagen oud is.
const { chromium } = require(process.env.PW_CORE ?? "/root/tools/pw/node_modules/playwright-core"); const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, ".."), A = path.join(ROOT, "assets"), VB = path.join(A, "_voorbeeld"); fs.mkdirSync(VB, { recursive: true });
const bronnen = JSON.parse(fs.readFileSync(path.join(A, "bronnen.json"), "utf8"));
const alle = []; (function loop(d) { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); if (f.startsWith("_") || f === "bronnen.json" || f === "catalogus.json") continue; if (fs.statSync(p).isDirectory()) loop(p); else alle.push(path.relative(A, p).split(path.sep).join("/")); } })(A);
const T = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".glb": "model/gltf-binary", ".png": "image/png", ".jpg": "image/jpeg" };
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM ?? "/usr/bin/chromium", args: ["--no-sandbox", "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const p = await b.newPage({ viewport: { width: 320, height: 240 } });
  await p.route("http://a.test/**", (r) => { const f = path.join(ROOT, decodeURIComponent(new URL(r.request().url()).pathname)); r.fulfill(fs.existsSync(f) ? { body: fs.readFileSync(f), contentType: T[path.extname(f)] ?? "application/octet-stream" } : { status: 404 }); });
  const lijst = [];
  for (const rel of alle.sort()) { const ext = path.extname(rel), st = fs.statSync(path.join(A, rel)), info = bronnen[rel] ?? {}, rij = { bestand: rel, map: rel.includes("/") ? rel.split("/")[0] : "texturen", naam: info.naam ?? rel, bron: info.bron ?? "?", licentie: info.licentie ?? "?", kb: Math.round(st.size / 1024), nieuw: Date.now() - st.mtimeMs < 3 * 864e5, oud: !!info.oud };
    if (ext === ".glb") { await p.goto(`http://a.test/tools/model.html?m=../assets/${rel}&zij=${rel.startsWith("boten") || rel.startsWith("vis") ? "1" : ""}`); await p.waitForFunction(() => window.KLAAR, null, { timeout: 120000 });
      Object.assign(rij, await p.evaluate(() => { let tri = 0, maxpx = 0, tex = new Set(); window.SCENE?.traverse((o) => { if (o.isMesh) { const g = o.geometry; tri += (g.index ? g.index.count : g.attributes.position.count) / 3; for (const k of ["map", "normalMap"]) { const t = o.material?.[k]; if (t?.image) { tex.add(t.uuid); maxpx = Math.max(maxpx, t.image.width || 0); } } } }); return { driehoeken: Math.round(tri), texturen: tex.size, maxpx }; }));
      await p.screenshot({ path: path.join(VB, rel.replace(/\//g, "_") + ".jpg"), type: "jpeg", quality: 80 }); rij.voorbeeld = "assets/_voorbeeld/" + rel.replace(/\//g, "_") + ".jpg"; }
    else if ([".jpg", ".png"].includes(ext)) rij.voorbeeld = "assets/" + rel;
    else if (ext === ".mp3") rij.geluid = "assets/" + rel;
    lijst.push(rij); console.log(rel); }
  await b.close();
  fs.writeFileSync(path.join(A, "catalogus.json"), JSON.stringify(lijst, null, 1));
  const kaart = (r) => `<div class="kaart${r.oud ? " oud" : ""}">${r.voorbeeld ? `<img src="${r.voorbeeld}" loading="lazy">` : r.geluid ? `<div class="snd">♪</div>` : ""}${r.nieuw ? '<span class="nieuw">nieuw</span>' : ""}<b>${r.bestand.split("/").pop()}</b><small>${r.naam}</small><small>${r.kb >= 1024 ? (r.kb / 1024).toFixed(1) + " MB" : r.kb + " kB"}${r.driehoeken ? " · " + r.driehoeken.toLocaleString("nl") + " driehoeken" : ""}${r.texturen ? ` · ${r.texturen} texturen (max ${r.maxpx} px)` : ""}</small>${r.geluid ? `<audio controls preload="none" src="${r.geluid}"></audio>` : ""}<small class="bron">${r.bron}; ${r.licentie}</small></div>`;
  const mappen = [...new Set(lijst.map((r) => r.map))];
  fs.writeFileSync(path.join(ROOT, "assets.html"), `<!doctype html><html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Assets — Peppie et les Cocks</title><style>
body{margin:0;font-family:system-ui,sans-serif;background:#16302c;color:#fff;padding:14px}h1{margin:4px 0 4px}h2{margin:22px 0 8px;color:#f2c230;text-transform:capitalize}p{opacity:.8;margin:0 0 10px}
.rij{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:12px}.kaart{position:relative;background:#f4f2ec;color:#1a1a1a;border-radius:14px;padding:10px;border:3px solid #3e8a4e;display:flex;flex-direction:column;gap:4px}.kaart.oud{opacity:.55;border-color:#999}
.kaart img{width:100%;aspect-ratio:4/3;object-fit:contain;background:#dfe6ea;border-radius:8px}.snd{font-size:60px;text-align:center;background:#dfe6ea;border-radius:8px;aspect-ratio:4/3;display:grid;place-items:center}.kaart b{font-size:17px}.kaart small{opacity:.75}.bron{font-size:12px}
.nieuw{position:absolute;left:18px;top:18px;background:#3e8a4e;color:#fff;border-radius:14px;padding:3px 10px;font-weight:700}audio{width:100%}</style></head><body>
<h1>Assets</h1><p>${lijst.length} bestanden. Gemaakt met <code>node tools/assets.cjs</code>; bron en licentie in <code>assets/bronnen.json</code>.</p>
${mappen.map((m) => `<h2>${m}</h2><div class="rij">${lijst.filter((r) => r.map === m).map(kaart).join("")}</div>`).join("\n")}
</body></html>`);
  console.log("klaar:", lijst.length, "assets; zonder bron:", lijst.filter((r) => r.bron === "?").map((r) => r.bestand).join(", ") || "geen");
})();
