// Het water van de Lot: helder, je ziet de bodem waar het ondiep is en het wordt groen en donker waar het diep is.
// Bovenop een echte spiegeling (bomen, huis, steigers en lucht), die bij een scheve blik sterker wordt (fresnel),
// kleine golfjes die de spiegeling laten trillen, en de glinstering van de zon.
import * as THREE from "three";

export function maakWater(renderer, scene, camera, W, { maat = 1080, telefoon = false } = {}) {
  // de diepte van de rivier als textuur (2 m per pixel, 0 – 12,75 m)
  const N = 540, dd = new Uint8Array(N * N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) { const x = -maat / 2 + (i + 0.5) * (maat / N), z = -maat / 2 + (j + 0.5) * (maat / N); dd[j * N + i] = Math.min(255, Math.max(0, -W.hoogte(x, z)) * 20); }
  const diepTex = new THREE.DataTexture(dd, N, N, THREE.RedFormat, THREE.UnsignedByteType); diepTex.magFilter = diepTex.minFilter = THREE.LinearFilter; diepTex.needsUpdate = true;

  // de spiegeling: een tweede camera onder het water (zoals THREE.Reflector), in een halve resolutie
  const schaal = telefoon ? 0.45 : 0.6, rt = new THREE.WebGLRenderTarget(16, 16, { samples: telefoon ? 0 : 4 });
  const spiegelCam = new THREE.PerspectiveCamera(), texMat = new THREE.Matrix4(), vlak = new THREE.Plane(), clip = new THREE.Vector4(), q = new THREE.Vector4();
  const maatRT = () => { const p = renderer.getPixelRatio(); rt.setSize(Math.round(innerWidth * p * schaal), Math.round(innerHeight * p * schaal)); }; maatRT(); addEventListener("resize", maatRT);

  const zon = new THREE.Vector3(0.45, 0.62, 0.3).normalize();
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: false,
    uniforms: { tRefl: { value: rt.texture }, tDiep: { value: diepTex }, uMaat: { value: maat }, uT: { value: 0 }, uTexMat: { value: texMat }, uZon: { value: zon }, uMist: { value: new THREE.Color("#c4d6e2") }, uMistBereik: { value: new THREE.Vector2(220, 700) }, uRust: { value: 1 } },
    vertexShader: `
      uniform mat4 uTexMat; varying vec4 vRefl; varying vec3 vWp;
      void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWp = wp.xyz; vRefl = uTexMat * wp; gl_Position = projectionMatrix * viewMatrix * wp; }`,
    fragmentShader: `
      uniform sampler2D tRefl, tDiep; uniform float uMaat, uT, uRust; uniform vec3 uZon, uMist; uniform vec2 uMistBereik; varying vec4 vRefl; varying vec3 vWp;
      vec2 golf(vec2 p, vec2 d, float k, float w, float a) { float f = dot(p, d) * k + uT * w; return d * cos(f) * a * k; }
      void main() {
        vec2 p = vWp.xz; float afst = distance(cameraPosition, vWp);
        // kalme rivier: een paar lange golfjes en fijne rimpels, in de verte vlakker
        vec2 g = golf(p, normalize(vec2(0.8, 0.6)), 0.55, 1.1, 0.020) + golf(p, normalize(vec2(-0.5, 0.86)), 0.9, 1.5, 0.012)
               + golf(p, normalize(vec2(0.2, -1.0)), 2.1, 2.3, 0.004) + golf(p, normalize(vec2(-0.9, -0.3)), 3.7, 3.1, 0.0022)
               + golf(p, normalize(vec2(0.6, -0.8)), 7.3, 4.2, 0.0009) + golf(p + 3.1, normalize(vec2(-0.3, 0.95)), 11.0, 5.0, 0.0005);
        g *= uRust * mix(1.0, 0.35, smoothstep(30.0, 250.0, afst));
        vec3 n = normalize(vec3(-g.x, 1.0, -g.y)), v = normalize(cameraPosition - vWp);
        float fres = 0.06 + 0.94 * pow(1.0 - max(dot(n, v), 0.0), 4.0);
        vec4 r = vRefl; r.xy += n.xz * 0.35 * r.w * 0.18; vec3 refl = texture2DProj(tRefl, r).rgb;
        // hoe ver kijk je door het water heen tot de bodem? hoe langer, hoe groener en donkerder
        float diep = texture2D(tDiep, (p + uMaat * 0.5) / uMaat).r * 12.75, pad = diep / max(v.y, 0.18);
        float weg = 1.0 - exp(-pad * 0.55); // de Lot: groengrijs, je ziet maar een meter of twee naar beneden
        vec3 kleur = mix(vec3(0.33, 0.37, 0.30), vec3(0.11, 0.14, 0.11), smoothstep(0.0, 1.0, weg));
        float a = clamp(weg * 1.05, 0.03, 0.94);
        vec3 c = mix(kleur, refl, fres); a = mix(a, 1.0, fres);
        float zon = pow(max(dot(reflect(-v, n), normalize(vec3(0.45, 0.62, 0.3))), 0.0), 380.0) * 3.0; c += vec3(1.0, 0.95, 0.85) * zon; a = max(a, min(1.0, zon));
        float m = smoothstep(uMistBereik.x, uMistBereik.y, afst); c = mix(c, uMist, m); a = mix(a, 1.0, m);
        gl_FragColor = vec4(c, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(maat, maat, 1, 1).rotateX(-Math.PI / 2), mat); mesh.renderOrder = 2; mesh.frustumCulled = false; scene.add(mesh);

  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), doel = new THREE.Vector3(), rot = new THREE.Matrix4(), bias = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
  let beurt = 0;
  /** Elk beeld (op de telefoon om het andere beeld) de spiegeling opnieuw renderen. verberg = dingen die niet gespiegeld hoeven. */
  function stap(dt, verberg = []) {
    mat.uniforms.uT.value += dt;
    if (telefoon && beurt++ % 2) return;
    const y = mesh.position.y; camera.updateMatrixWorld(); const cp = v1.setFromMatrixPosition(camera.matrixWorld);
    if (cp.y < y) return; // onder water: geen spiegeling
    rot.extractRotation(camera.matrixWorld); doel.set(0, 0, -1).applyMatrix4(rot).add(cp);
    spiegelCam.position.set(cp.x, 2 * y - cp.y, cp.z); spiegelCam.up.set(0, 1, 0).applyMatrix4(rot); spiegelCam.up.y *= -1; spiegelCam.lookAt(doel.x, 2 * y - doel.y, doel.z);
    spiegelCam.far = camera.far; spiegelCam.near = camera.near; spiegelCam.updateMatrixWorld(); spiegelCam.projectionMatrix.copy(camera.projectionMatrix);
    texMat.copy(bias).multiply(spiegelCam.projectionMatrix).multiply(spiegelCam.matrixWorldInverse);
    // schuin afsnijden bij het wateroppervlak, zodat alles onder water niet in de spiegeling komt
    vlak.setFromNormalAndCoplanarPoint(v2.set(0, 1, 0), v1.set(0, y, 0)); vlak.applyMatrix4(spiegelCam.matrixWorldInverse);
    clip.set(vlak.normal.x, vlak.normal.y, vlak.normal.z, vlak.constant); const pm = spiegelCam.projectionMatrix.elements;
    q.x = (Math.sign(clip.x) + pm[8]) / pm[0]; q.y = (Math.sign(clip.y) + pm[9]) / pm[5]; q.z = -1; q.w = (1 + pm[10]) / pm[14];
    clip.multiplyScalar(2 / clip.dot(q)); pm[2] = clip.x; pm[6] = clip.y; pm[10] = clip.z + 1 - 0.003; pm[14] = clip.w;
    mesh.visible = false; for (const o of verberg) o.userData.wasZichtbaar = o.visible, (o.visible = false);
    const oud = renderer.getRenderTarget(), schaduw = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
    renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, spiegelCam); renderer.setRenderTarget(oud); renderer.shadowMap.autoUpdate = schaduw;
    mesh.visible = true; for (const o of verberg) o.visible = o.userData.wasZichtbaar;
  }
  return { mesh, mat, stap };
}

/** Maak een materiaal "onder water": hoe dieper onder het oppervlak, hoe meer het opgaat in het groene water.
 *  Zulke dingen worden ná het water getekend, zodat je ze door het heldere water heen ziet. */
export function onderWater(mat) {
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying float vOnder;").replace("#include <fog_vertex>", "#include <fog_vertex>\n#ifdef USE_INSTANCING\nvOnder = -(modelMatrix * instanceMatrix * vec4(transformed, 1.0)).y;\n#else\nvOnder = -(modelMatrix * vec4(transformed, 1.0)).y;\n#endif");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", "#include <common>\nvarying float vOnder;").replace("#include <fog_fragment>", "{ float o = max(vOnder, 0.0), f = 1.0 - exp(-o * 0.42); gl_FragColor.rgb = mix(gl_FragColor.rgb * vec3(0.85, 0.97, 0.9), vec3(0.16, 0.28, 0.22), f); gl_FragColor.a *= exp(-o * 0.22); }\n#include <fog_fragment>"); };
  mat.transparent = true; mat.depthWrite = true; mat.customProgramCacheKey = () => "onderwater"; return mat;
}
