// Geeft het spel een versienummer (hash van alle spelbestanden) en zet ?v=<versie> op elk bestand.  node tools/versie.mjs
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
const bestanden = [...readdirSync("src").map((f) => `src/${f}`), "data/lot.json", ...readdirSync("lib").filter((f) => /\.m?js$/.test(f)).map((f) => `lib/${f}`),
  ...["mensen", "vis"].flatMap((m) => readdirSync(`assets/${m}`).map((f) => `assets/${m}/${f}`))].sort();
const h = createHash("sha1"); for (const f of bestanden) h.update(f).update(readFileSync(f));
const html = readFileSync("index.html", "utf8"); h.update(html.replace(/<!-- versie -->[\s\S]*?<!-- \/versie -->/, ""));
const v = h.digest("hex").slice(0, 10), nu = new Date().toLocaleString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" });
if (html.match(/window\.VERSIE = "([^"]+)"/)?.[1] === v) { console.log(`versie ongewijzigd: ${v}`); process.exit(0); }
const imports = { three: `./lib/three.module.js?v=${v}`, "./lib/three.module.js": `./lib/three.module.js?v=${v}` };
for (const f of readdirSync("lib").filter((f) => /\.m?js$/.test(f) && f !== "three.module.js")) imports[`./lib/${f}`] = `./lib/${f}?v=${v}`;
for (const f of readdirSync("src")) imports[`./src/${f}`] = `./src/${f}?v=${v}`;
writeFileSync("index.html", html.replace(/<!-- versie -->[\s\S]*?<!-- \/versie -->/, `<!-- versie -->
<script>window.VERSIE = "${v}"; window.VERSIE_DATUM = "${nu}"; document.getElementById("versie").textContent = "versie ${nu}";</script>
<script type="importmap">${JSON.stringify({ imports })}</script>
<script type="module" src="./src/main.js?v=${v}"></script>
<!-- /versie -->`));
writeFileSync("versie.json", JSON.stringify({ versie: v, datum: nu }) + "\n"); console.log(`nieuwe versie: ${v} (${nu})`);
