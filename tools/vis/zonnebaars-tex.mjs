// node zonnebaars-tex.mjs in.glb kleur.png uit.glb — zet de omgeschilderde textuur in het model (ruw, mat, geen metaal)
import { NodeIO } from "@gltf-transform/core"; import { ALL_EXTENSIONS } from "@gltf-transform/extensions"; import { readFileSync } from "node:fs";
const [i, png, o] = process.argv.slice(2); const io = new NodeIO().registerExtensions(ALL_EXTENSIONS); const d = await io.read(i);
for (const m of d.getRoot().listMaterials()) { const t = m.getBaseColorTexture(); if (t) t.setImage(readFileSync(png)).setMimeType("image/png"); m.setMetallicFactor(0).setRoughnessFactor(0.55); m.setName("zonnebaars"); }
for (const e of d.getRoot().listExtensionsUsed()) if (e.extensionName === "KHR_materials_unlit") e.dispose();
await io.write(o, d); console.log("ok", o);
