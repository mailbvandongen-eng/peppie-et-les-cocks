// Stof, rubber, vuur en rook. Eén pool met sprites en één pool met brokjes.
import * as THREE from "three";

function zachteVlek() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const x = c.getContext("2d");
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(255,255,255,1)"); g.addColorStop(0.4, "rgba(255,255,255,.55)"); g.addColorStop(1, "rgba(255,255,255,0)");
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export class Effecten {
  constructor(scene) {
    this.scene = scene;
    const tex = zachteVlek();
    this.sprites = [];
    for (let i = 0; i < 220; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      s.visible = false; scene.add(s);
      this.sprites.push({ s, leven: 0 });
    }
    const brokGeo = new THREE.BoxGeometry(1, 1, 1);
    this.brokken = [];
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(brokGeo, new THREE.MeshStandardMaterial({ color: "#222", roughness: 0.8 }));
      m.visible = false; m.castShadow = true; scene.add(m);
      this.brokken.push({ m, leven: 0, v: new THREE.Vector3(), w: new THREE.Vector3() });
    }
    this.bronnen = []; // blijvend vuur/rook
  }
  deeltje(pos, o) {
    const p = this.sprites.find((x) => x.leven <= 0) ?? this.sprites[0];
    Object.assign(p, { leven: o.leven, max: o.leven, v: o.v ?? new THREE.Vector3(), g: o.g ?? 0, r0: o.r0, r1: o.r1, a: o.a ?? 1 });
    p.s.position.copy(pos);
    p.s.material.color.set(o.kleur);
    p.s.material.blending = o.licht ? THREE.AdditiveBlending : THREE.NormalBlending;
    p.s.material.rotation = Math.random() * 6;
    p.s.visible = true;
  }
  brok(pos, kleur, grootte, v) {
    const b = this.brokken.find((x) => x.leven <= 0) ?? this.brokken[0];
    b.leven = 3 + Math.random() * 2;
    b.m.position.copy(pos); b.m.scale.setScalar(grootte);
    b.m.material.color.set(kleur);
    b.v.copy(v); b.w.set(Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10);
    b.m.visible = true;
  }
  /** Inslag op muur of straat. */
  inslag(pos, kleur = "#b9b2a6") {
    for (let i = 0; i < 6; i++) this.deeltje(pos, { leven: 0.6 + Math.random() * 0.5, kleur, r0: 0.1, r1: 0.7, v: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 2, (Math.random() - 0.5) * 2), a: 0.7 });
    for (let i = 0; i < 3; i++) this.brok(pos, kleur, 0.04, new THREE.Vector3((Math.random() - 0.5) * 3, 2 + Math.random() * 2, (Math.random() - 0.5) * 3));
  }
  /** Knetteren van klein vuurwerk: felle vonkjes en een pufje rook. */
  vonken(pos) {
    for (let i = 0; i < 5; i++) this.brok(pos, ["#fff3b0", "#ffd24a", "#ff9a2e", "#ffffff"][i % 4], 0.025, new THREE.Vector3((Math.random() - 0.5) * 5, 1.5 + Math.random() * 3.5, (Math.random() - 0.5) * 5));
    this.deeltje(pos, { leven: 0.7 + Math.random() * 0.5, kleur: "#d9d6cf", r0: 0.08, r1: 0.6, v: new THREE.Vector3((Math.random() - 0.5) * 0.8, 0.6 + Math.random(), (Math.random() - 0.5) * 0.8) });
  }
  /** Band klapt: rubber en stof. */
  klap(pos) {
    for (let i = 0; i < 10; i++) this.deeltje(pos, { leven: 0.8 + Math.random() * 0.6, kleur: "#c9c1b2", r0: 0.15, r1: 1.2, v: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 1.5, (Math.random() - 0.5) * 3), a: 0.8 });
    for (let i = 0; i < 8; i++) this.brok(pos, "#141414", 0.05 + Math.random() * 0.05, new THREE.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6));
  }
  /** Accu ontploft. */
  ontploffing(pos) {
    for (let i = 0; i < 26; i++) this.deeltje(pos, { leven: 0.5 + Math.random() * 0.5, kleur: i % 3 ? "#ffb03a" : "#ff5a1f", licht: true, r0: 0.4, r1: 3.2, v: new THREE.Vector3((Math.random() - 0.5) * 7, Math.random() * 6, (Math.random() - 0.5) * 7) });
    for (let i = 0; i < 18; i++) this.deeltje(pos, { leven: 2 + Math.random() * 2, kleur: "#3a3632", r0: 0.6, r1: 4.5, v: new THREE.Vector3((Math.random() - 0.5) * 3, 1.5 + Math.random() * 2.5, (Math.random() - 0.5) * 3), a: 0.75 });
    for (let i = 0; i < 16; i++) this.brok(pos, i % 2 ? "#1a1a1a" : "#3d3d3d", 0.06 + Math.random() * 0.1, new THREE.Vector3((Math.random() - 0.5) * 12, 4 + Math.random() * 8, (Math.random() - 0.5) * 12));
  }
  /** Iets blijft branden (volgt een object). */
  brand(obj, duur = 9) { this.bronnen.push({ obj, duur, t: 0 }); }
  stap(dt) {
    for (const p of this.sprites) {
      if (p.leven <= 0) continue;
      p.leven -= dt;
      if (p.leven <= 0) { p.s.visible = false; continue; }
      const f = 1 - p.leven / p.max;
      p.v.y -= p.g * dt;
      p.s.position.addScaledVector(p.v, dt);
      p.v.multiplyScalar(1 - dt * 1.5);
      p.s.scale.setScalar(p.r0 + (p.r1 - p.r0) * Math.sqrt(f));
      p.s.material.opacity = p.a * (1 - f) * Math.min(1, f * 8);
    }
    for (const b of this.brokken) {
      if (b.leven <= 0) continue;
      b.leven -= dt;
      if (b.leven <= 0) { b.m.visible = false; continue; }
      b.v.y -= 9.8 * dt;
      b.m.position.addScaledVector(b.v, dt);
      if (b.m.position.y < b.m.scale.x / 2) { b.m.position.y = b.m.scale.x / 2; b.v.y *= -0.3; b.v.x *= 0.6; b.v.z *= 0.6; b.w.multiplyScalar(0.6); }
      b.m.rotation.x += b.w.x * dt; b.m.rotation.y += b.w.y * dt; b.m.rotation.z += b.w.z * dt;
    }
    const p = new THREE.Vector3();
    this.bronnen = this.bronnen.filter((b) => {
      b.t += dt;
      if (b.t > b.duur) return false;
      b.obj.getWorldPosition(p); p.y += 0.4;
      const kracht = 1 - b.t / b.duur;
      if (Math.random() < dt * 30 * kracht) this.deeltje(p, { leven: 0.5, kleur: Math.random() < 0.5 ? "#ff9a2e" : "#ffd04a", licht: true, r0: 0.3, r1: 0.9 * kracht + 0.2, v: new THREE.Vector3((Math.random() - 0.5) * 0.6, 1.8, (Math.random() - 0.5) * 0.6) });
      if (Math.random() < dt * 8) this.deeltje(p.clone().setY(p.y + 0.6), { leven: 3, kleur: "#2e2b28", r0: 0.4, r1: 3, v: new THREE.Vector3(0.6, 1.6, 0.2), a: 0.6 });
      return true;
    });
  }
}
