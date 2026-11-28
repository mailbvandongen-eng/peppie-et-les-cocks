// De "strepenkijker" van Wim: een gewone 2D CHIRP-sonar (zoals de traditionele sonarweergave op een Garmin Striker/ECHOMAP).
// De transducer kijkt recht omlaag in een kegel. Het beeld schuift van rechts naar links: rechts is nu, links is wat
// geweest is. Vaar je over een vis, dan wordt hij een boogje (aan de rand van de kegel is hij verder weg, dus dieper);
// lig je stil of hangt hij onder je, dan wordt hij een streep. Een school is een wolk stipjes, de bodem een dikke band
// met een zwakke tweede echo op dubbele diepte. Rechts de diepteschaal en een smalle balk met de echo van dit moment.

const KLEUR = (() => { const t = new Uint8Array(256 * 3), stop = [[0, 6, 22, 92], [0.16, 10, 50, 170], [0.32, 40, 140, 240], [0.46, 60, 220, 200], [0.58, 140, 240, 70], [0.7, 250, 240, 40], [0.82, 255, 150, 0], [0.92, 240, 50, 10], [1, 160, 0, 0]];
  for (let i = 0; i < 256; i++) { const v = i / 255; let k = 0; while (k < stop.length - 2 && v > stop[k + 1][0]) k++; const a = stop[k], b = stop[k + 1], f = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0]))); for (let c = 0; c < 3; c++) t[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f; }
  return t; })();
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const FONT = '"Helvetica Neue", Arial, sans-serif';
const KOLOMMEN = 420, RIJEN = 300, KEGEL = Math.tan((40 / 2) * Math.PI / 180) * 1.3; // ± 40° kegel (CHIRP midden)

export class Chirp {
  constructor(canvas) { this.c = canvas; this.x = canvas.getContext("2d"); this.hist = document.createElement("canvas"); this.hist.width = KOLOMMEN; this.hist.height = RIJEN; this.hx = this.hist.getContext("2d"); this.hx.fillStyle = "rgb(6,22,92)"; this.hx.fillRect(0, 0, KOLOMMEN, RIJEN);
    this.kol = this.hx.createImageData(1, RIJEN); this.pos = 0; this.vol = false; this.t = 0; this.bereik = 12; this.gain = 50; this.pauze = false; this.knoppen = []; this.wacht = 0; this.laatste = new Float32Array(RIJEN); }
  tik(px, py) { for (const k of this.knoppen) { if (px < k.x0 || px > k.x1 || py < k.y0 || py > k.y1) continue; if (k.id === "pauze") this.pauze = !this.pauze; if (k.id === "z-") this.zoomUit = !this.zoomUit; if (k.id === "g-") this.gain = Math.max(20, this.gain - 10); if (k.id === "g+") this.gain = Math.min(100, this.gain + 10); return true; } return false; }
  /**
   * Eén stap. onder = diepte onder de transducer; vissen = [{ r (afstand opzij in m), d (diepte), lengte }]; school = [{ r, d }];
   * aas = { r, d } of null; vaart in m/s (hoe snel het beeld doorschuift hangt bij Garmin niet van je vaart af: we schuiven vast).
   */
  stap(dt, { onder, vissen = [], school = [], aas = null, temp = 14.8, tijd = "12:50", snelheid = 0 }) {
    this.t += dt; if (this.pauze) return this.tekenScherm({ onder, temp, tijd, snelheid });
    // bereik (Auto): de bodem op ± 3/4 van de hoogte
    const doel = Math.max(4, Math.ceil((onder * 1.3 + 1) / 2) * 2); if (Math.abs(doel - this.bereik) >= 2) this.bereik = doel;
    // nieuwe kolommen: ± 18 per seconde
    this.wacht += dt * 18; const n = Math.floor(this.wacht); this.wacht -= n;
    if (!this.vol) { this.vol = true; for (let s = 0; s < KOLOMMEN; s++) { this.t += 0.055; this.kolom({ onder, vissen, school, aas }); } }
    for (let s = 0; s < n; s++) this.kolom({ onder, vissen, school, aas });
    this.tekenScherm({ onder, temp, tijd, snelheid });
  }
  kolom({ onder, vissen, school, aas }) {
    const R = this.bereik, v = new Float32Array(RIJEN), rij = (d) => (d / R) * RIJEN, g = (this.gain / 50) ** 0.8, t = this.t * 50 + Math.random() * 9;
    const zet = (d, sterk, dik = 1) => { const r0 = rij(d); for (let i = Math.floor(r0 - dik); i <= Math.ceil(r0 + dik); i++) if (i >= 0 && i < RIJEN) v[i] = Math.max(v[i], sterk * Math.max(0, 1 - Math.abs(i - r0) / (dik + 0.6))); };
    // ruis en het oppervlak (de bovenste halve meter is rommelig)
    for (let i = 0; i < RIJEN; i++) { const d = (i / RIJEN) * R; v[i] = 0.04 + h2(i, t) * 0.06 + (d < 0.5 ? (1 - d / 0.5) * (0.5 + h2(i * 3, t) * 0.4) : 0); if (h2(i + 7, t * 1.3) > 0.996) v[i] += 0.25; }
    // vissen in de kegel: hoe verder opzij, hoe zwakker en hoe dieper (zo ontstaat de boog)
    for (const f of vissen) { const kr = Math.max(0.6, f.d * KEGEL); if (f.r > kr) continue; const sterk = (1 - (f.r / kr) ** 2) * (0.55 + Math.min(0.45, f.lengte * 0.35)); zet(Math.hypot(f.d, f.r * 0.6), Math.min(1, sterk * 1.6 + 0.15), 0.8 + f.lengte * 2.4); }
    for (const q of school) { const kr = Math.max(0.6, q.d * KEGEL); if (q.r > kr) continue; zet(Math.hypot(q.d, q.r * 0.6), (1 - q.r / kr) * 0.45, 0.5); }
    if (aas) { const kr = Math.max(0.6, aas.d * KEGEL); if (aas.r < kr) zet(Math.hypot(aas.d, aas.r * 0.6), 0.5 * (1 - aas.r / kr), 0.4); }
    // de bodem: harde rand, dan langzaam zwakker; tweede echo op dubbele diepte
    const b = rij(onder); for (let i = Math.floor(b) - 1; i < RIJEN; i++) { if (i < 0) continue; const x = (i - b) / RIJEN * R; let s = x < 0 ? 0.6 * (1 + x * 4) : x < 0.25 ? 1 : x < 1.4 ? 0.95 - (x - 0.25) * 0.4 : Math.max(0.1, 0.5 - (x - 1.4) * 0.25); v[i] = Math.max(v[i], s * (0.9 + h2(i, t) * 0.15)); }
    const b2 = rij(onder * 2); for (let i = Math.floor(b2); i < Math.min(RIJEN, b2 + rij(0.6)); i++) if (i >= 0) v[i] = Math.max(v[i], 0.32 + h2(i, t * 2) * 0.1);
    // in de kolom zetten en het beeld een pixel naar links schuiven
    const px = this.kol.data; for (let i = 0; i < RIJEN; i++) { const k = Math.max(0, Math.min(255, (Math.min(1, v[i] * g) * 255) | 0)) * 3; px[i * 4] = KLEUR[k]; px[i * 4 + 1] = KLEUR[k + 1]; px[i * 4 + 2] = KLEUR[k + 2]; px[i * 4 + 3] = 255; }
    this.hx.putImageData(this.kol, this.pos, 0); this.pos = (this.pos + 1) % KOLOMMEN; this.laatste = v; // ringbuffer: de oudste kolom wordt overschreven
  }
  tekenScherm({ onder, temp, tijd, snelheid }) {
    const c = this.c, x = this.x, W = c.width, H = c.height, F = Math.min(H, (W * 9) / 16), R = this.bereik, ab = F * 0.07; // ab = breedte van de balk rechts
    x.imageSmoothingEnabled = true; const bw0 = W - ab, a = KOLOMMEN - this.pos; // eerst het oudste stuk (vanaf pos), dan het nieuwste
    x.drawImage(this.hist, this.pos, 0, a, RIJEN, 0, 0, (bw0 * a) / KOLOMMEN, H); if (this.pos > 0) x.drawImage(this.hist, 0, 0, this.pos, RIJEN, (bw0 * a) / KOLOMMEN, 0, (bw0 * this.pos) / KOLOMMEN, H);
    // de balk met de echo van nu (A-scope)
    x.fillStyle = "rgb(6,22,92)"; x.fillRect(W - ab, 0, ab, H);
    for (let i = 0; i < RIJEN; i++) { const s = this.laatste[i]; if (s < 0.12) continue; const k = Math.max(0, Math.min(255, (s * 255) | 0)) * 3; x.fillStyle = `rgb(${KLEUR[k]},${KLEUR[k + 1]},${KLEUR[k + 2]})`; x.fillRect(W - ab, (i / RIJEN) * H, ab * Math.min(1, s), H / RIJEN + 1); }
    x.fillStyle = "rgba(255,255,255,0.5)"; x.fillRect(W - ab - 1, 0, 2, H);
    // diepteschaal rechts, met lijnen
    x.strokeStyle = "rgba(255,255,255,0.25)"; x.lineWidth = Math.max(1, F / 700); x.fillStyle = "#fff"; x.font = `bold ${Math.round(F * 0.045)}px ${FONT}`; x.textAlign = "right"; x.textBaseline = "middle";
    const stap = R > 20 ? 5 : R > 10 ? 2 : 1;
    for (let d = stap; d < R; d += stap) { const y = (d / R) * H; x.setLineDash([F * 0.01, F * 0.012]); x.beginPath(); x.moveTo(0, y); x.lineTo(W - ab, y); x.stroke(); x.setLineDash([]); x.shadowColor = "#000"; x.shadowBlur = 3; x.fillText(`${d}`, W - ab - F * 0.012, y); x.shadowBlur = 0; }
    // linksboven: diepte, temperatuur, snelheid, frequentie, tijd
    x.textAlign = "left"; x.textBaseline = "alphabetic"; x.shadowColor = "rgba(0,0,0,0.6)"; x.shadowBlur = F * 0.01;
    x.font = `bold ${Math.round(F * 0.15)}px ${FONT}`; const tk = onder.toFixed(1); x.fillText(tk, F * 0.04, F * 0.15); const bw = x.measureText(tk).width; x.font = `bold ${Math.round(F * 0.07)}px ${FONT}`; x.fillText("m", F * 0.04 + bw + 4, F * 0.15);
    x.font = `${Math.round(F * 0.048)}px ${FONT}`; [[`${temp.toFixed(1)}°C`], [`${snelheid.toFixed(1)} kt`], ["Midden CHIRP"], [tijd]].forEach(([w], i) => x.fillText(w, F * 0.04, F * (0.215 + i * 0.058)));
    x.shadowBlur = 0;
    // knoppen onderaan (zoals op het toestel): pauze, gevoeligheid
    this.knoppen = []; const knop = (kx_, tekst, id, b = 0.16) => { const bw = F * b, bh = F * 0.1, ky = H - F * 0.075; x.fillStyle = "rgba(40,44,52,0.85)"; x.fillRect(kx_ - bw / 2, ky - bh / 2, bw, bh); x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = `${Math.round(F * 0.042)}px ${FONT}`; x.fillText(tekst, kx_, ky); this.knoppen.push({ id, x0: kx_ - bw / 2, x1: kx_ + bw / 2, y0: ky - bh / 2, y1: ky + bh / 2 }); };
    knop(F * 0.12, this.pauze ? "▶" : "II", "pauze", 0.12); knop(W - ab - F * 0.42, "–", "g-", 0.1); knop(W - ab - F * 0.28, `Gain ${this.gain}%`, "g", 0.17); knop(W - ab - F * 0.14, "+", "g+", 0.1);
    x.textAlign = "left";
  }
}
