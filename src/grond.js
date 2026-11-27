// De grond met echte texturen (Poly Haven, CC0): gras (als detail over de kleur van het gazon), modder en stenen aan de oever,
// en de kiezelbodem van de rivier, die je door het heldere water ziet. Attribuut "nat": 0 = land, 1 = waterlijn, 2 = rivierbodem.
import * as THREE from "three";
const L = new THREE.TextureLoader(), T = {};
const tex = (n, kleur = true) => (T[n] ??= (() => { const t = L.load(`assets/${n}.jpg?v=${window.VERSIE ?? ""}`); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = kleur ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; })());
/** nat-waarde uit de afstand tot de oever (positief = in het water). */
export const natUit = (s) => (s > 0 ? 1 + Math.min(1, s / 1.5) : Math.max(0, 1 + s / 0.8));
/** Het materiaal; knip = { O, t, u, rects: [[x0, z0, x1, z1]] } in domein-assen: daar wordt niets getekend. */
export function grondMat(knip = null) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96 }); m.customProgramCacheKey = () => (knip ? "grond-knip" : "grond");
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { tGras: { value: tex("gras", false) }, tBodem: { value: tex("bodem") }, tOever: { value: tex("oever") } });
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nattribute float nat; varying float vNat; varying vec3 vWg;").replace("#include <fog_vertex>", "#include <fog_vertex>\nvNat = nat; vWg = (modelMatrix * vec4(transformed, 1.0)).xyz;");
    let kop = "#include <common>\nuniform sampler2D tGras, tBodem, tOever; varying float vNat; varying vec3 vWg;", knipCode = "";
    if (knip) { Object.assign(sh.uniforms, { uO: { value: new THREE.Vector2(knip.O.x, knip.O.z) }, uT: { value: new THREE.Vector2(knip.t.x, knip.t.z) }, uU: { value: new THREE.Vector2(knip.u.x, knip.u.z) }, uKnip: { value: knip.rects.map((r) => new THREE.Vector4(...r)) } });
      kop += `\nuniform vec2 uO, uT, uU; uniform vec4 uKnip[${knip.rects.length}];`;
      knipCode = `{ vec2 d = vWg.xz - uO; float lx = -dot(d, uT), lz = dot(d, uU); for (int i = 0; i < ${knip.rects.length}; i++) { vec4 r = uKnip[i]; if (lx > r.x && lx < r.z && lz > r.y && lz < r.w) discard; } }`; }
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", kop).replace("void main() {", "void main() {\n" + knipCode).replace("#include <color_fragment>", `#include <color_fragment>
      { vec2 w = vWg.xz; float d1 = texture2D(tGras, w * 0.42).r, d2 = texture2D(tGras, w * 0.071 + 0.3).r;
        vec3 gras = diffuseColor.rgb * (0.3 + d1 * 1.15) * (0.7 + d2 * 0.6);
        vec3 oever = texture2D(tOever, w * 0.33).rgb * 0.85, bodem = texture2D(tBodem, w * 0.22).rgb * vec3(0.78, 0.8, 0.68);
        diffuseColor.rgb = vNat < 1.0 ? mix(gras, oever, smoothstep(0.35, 1.0, vNat)) : mix(oever, bodem, vNat - 1.0); }`);
  };
  return m;
}
