// node zonnebaars-dump.mjs stap1.glb map/ — schrijft posities, uv's, driehoeken (binair) en de kleurtextuur, voor zonnebaars-kleur.py
import { NodeIO } from "@gltf-transform/core"; import { ALL_EXTENSIONS } from "@gltf-transform/extensions"; import { writeFileSync, mkdirSync } from "node:fs";
const [i, o] = process.argv.slice(2); mkdirSync(o, { recursive: true });
const d = await new NodeIO().registerExtensions(ALL_EXTENSIONS).read(i);
const ps = d.getRoot().listMeshes().flatMap((m) => m.listPrimitives()); if (ps.length !== 1) console.log("let op:", ps.length, "primitieven");
const p = ps[0]; const mat = p.getMaterial(); const t = mat.getBaseColorTexture();
writeFileSync(o + "/pos.f32", Buffer.from(p.getAttribute("POSITION").getArray().buffer));
writeFileSync(o + "/uv.f32", Buffer.from(new Float32Array(p.getAttribute("TEXCOORD_0").getArray()).buffer));
writeFileSync(o + "/idx.u32", Buffer.from(new Uint32Array(p.getIndices().getArray()).buffer));
writeFileSync(o + "/tex." + (t.getMimeType() === "image/png" ? "png" : "jpg"), t.getImage());
console.log("ok", p.getAttribute("POSITION").getCount(), "punten", t.getMimeType(), t.getSize());
