// node tools/haal.mjs <sketchfab-uid> <doel.glb> — downloadt een Sketchfab-model als .glb en toont auteur en licentie.
// De sleutel staat buiten de repo: in SKETCHFAB_TOKEN of in ~/.sketchfab-token (Sketchfab → Settings → Password & API).
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os"; import path from "node:path";
const [uid, doel] = process.argv.slice(2);
if (!uid || !doel) { console.log("gebruik: node tools/haal.mjs <uid> <doel.glb>"); process.exit(1); }
const token = process.env.SKETCHFAB_TOKEN ?? readFileSync(path.join(homedir(), ".sketchfab-token"), "utf8").trim();
const info = await (await fetch(`https://api.sketchfab.com/v3/models/${uid}`)).json();
const r = await fetch(`https://api.sketchfab.com/v3/models/${uid}/download`, { headers: { Authorization: `Token ${token}` } });
if (!r.ok) { console.log("download geweigerd:", r.status, await r.text()); process.exit(1); }
const d = await r.json(); if (!d.glb) { console.log("geen .glb beschikbaar, wel:", Object.keys(d).join(", ")); process.exit(1); }
const glb = Buffer.from(await (await fetch(d.glb.url)).arrayBuffer());
mkdirSync(path.dirname(doel), { recursive: true }); writeFileSync(doel, glb);
console.log(`${doel}: “${info.name}” — ${info.user?.username}, ${info.license?.label} (${(glb.length / 1048576).toFixed(1)} MB)`);
