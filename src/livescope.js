// De livescope op de belly boat: een nagebouwd sonarbeeld (vooruitkijkend, 10 m bereik).
// Zoals op de opname: blauw water met ruis, de bodem als dikke rood-gele band, vissen als langgerekte rood-gele vlekken,
// je kunstaas als een groepje stipjes, een zwarte wig linksboven (buiten de bundel), een raster in meters, temperatuur en tijd.
const BW0 = 256, BH0 = 144;        // het sonarbeeld zelf wordt klein getekend en uitgerekt: dat geeft de wazige korrel
const X0 = -5, X1 = 13.5, D1 = 13; // wat er in beeld is: van 5 m achter je tot 13,5 m voor je, tot 13 m diep (de Lot is overal ± 10 m)

/** De kleuren van het scherm: donkerblauw → blauw → cyaan → groen → geel → rood → donkerrood. */
const KLEUR = (() => { const t = new Uint8Array(256 * 3), stop = [[0, 0, 0, 110], [0.22, 0, 20, 235], [0.42, 0, 190, 255], [0.55, 60, 255, 170], [0.68, 255, 240, 0], [0.84, 255, 40, 0], [1, 120, 0, 0]];
  for (let i = 0; i < 256; i++) { const v = i / 255; let k = 0; while (k < stop.length - 2 && v > stop[k + 1][0]) k++; const a = stop[k], b = stop[k + 1], f = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0]))); for (let c = 0; c < 3; c++) t[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f; }
  return t; })();
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
/** Zachte ruis (voor de structuur van de bodem en de wolken in het water). */
const wolk = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; };

export class Livescope {
  constructor(canvas) {
    this.c = canvas; this.x = canvas.getContext("2d");
    this.klein = document.createElement("canvas"); this.klein.width = BW0; this.klein.height = BH0; this.kx = this.klein.getContext("2d"); this.beeld = this.kx.createImageData(BW0, BH0);
    this.t = 0;
  }
  /**
   * Teken één beeld. bodem(v) = diepte op v meter voor je (negatief = achter je); vissen = [{ v, d, lengte, hoek }];
   * aas = { v, d } (waar je aas hangt: v meter voor de transducer, d diep) of null; school = [{ v, d }] (kleine visjes).
   * vissen: soort Meerval / Karper / anders; hoek = zwemrichting ten opzichte van de bundel.
   */
  teken({ bodem, vissen = [], aas = null, school = [], planten = [], temp = 27.4, tijd = "10:23", richting = null }) {
    // het sonarbeeld krijgt dezelfde verhouding als het scherm (liggend of staand op het hele scherm)
    { const bh = Math.max(60, Math.round((BW0 * this.c.height) / this.c.width)); if (bh !== this.klein.height) { this.klein.height = bh; this.beeld = this.kx.createImageData(BW0, bh); } }
    const BW = BW0, BH = this.klein.height;
    this.t += 1; const px = this.beeld.data, t = this.t;
    const bod = new Float32Array(BW); for (let i = 0; i < BW; i++) bod[i] = bodem(X0 + ((i + 0.5) / BW) * (X1 - X0));
    for (let j = 0; j < BH; j++) {
      const d = (j / BH) * D1;
      for (let i = 0; i < BW; i++) {
        const v = X0 + ((i + 0.5) / BW) * (X1 - X0), b = bod[i]; let s;
        if (v < 0 && d < -v * 1.32 - 0.05) { px.set([0, 0, 0, 255], (j * BW + i) * 4); continue; } // buiten de bundel: zwart
        const korrel = h2(i + t * 7.3, j - t * 3.1);
        if (d < b - 0.25) {
          // open water: donkerblauw met korrel en vage wolken; bovenin de rommel van het oppervlak
          s = 0.1 + korrel * 0.1 + wolk(i * 0.06 + 3, j * 0.09 + t * 0.02) * 0.1;
          if (v > 5.5) s += wolk(i * 0.03, j * 0.05) * 0.12 * Math.min(1, (v - 5.5) / 2); // verder weg wordt het lichter
          if (d < 0.75 && v > 3.6) s += Math.max(0, wolk(i * 0.22 + t * 0.05, 5) - 0.35) * 1.1 * (1 - d / 0.75) + korrel * 0.12;
          if (d < 0.18 && v > 0 && v < 3.4) s += 0.25 * korrel;
        } else if (d < b + 0.95) {
          // de bodem: een dikke harde band, rood met gele vlekken, met een gele rand erboven
          const in_ = (d - b + 0.25) / 1.2, kern = Math.sin(Math.min(1, in_ * 1.25) * Math.PI);
          s = 0.52 + kern * 0.42 + (wolk(i * 0.5 + 9, j * 0.9) - 0.5) * 0.26 + (korrel - 0.5) * 0.12;
        } else {
          // onder de bodem: de nagalm, blauw-cyaan met vegen
          const diep = d - b - 0.95; s = 0.42 - Math.min(0.22, diep * 0.09) + (wolk(i * 0.12 + j * 0.05, j * 0.2 - i * 0.03) - 0.5) * 0.3 + (korrel - 0.5) * 0.14;
        }
        const k = Math.max(0, Math.min(255, (s * 255) | 0)) * 3; px.set([KLEUR[k], KLEUR[k + 1], KLEUR[k + 2], 255], (j * BW + i) * 4);
      }
    }
    this.kx.putImageData(this.beeld, 0, 0);
    // vissen, aas en visjes: lichtgevende vlekken die optellen bij het beeld
    const X = (v) => ((v - X0) / (X1 - X0)) * BW, Y = (d) => (d / D1) * BH, k = this.kx; k.globalCompositeOperation = "lighter";
    const vlek = (cx, cy, rx, ry, hoek, sterk) => { k.save(); k.translate(cx, cy); k.rotate(hoek); k.scale(1, ry / rx); const g = k.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, `rgba(255,${(90 * sterk) | 0},0,${0.95 * sterk})`); g.addColorStop(0.45, `rgba(255,220,0,${0.8 * sterk})`); g.addColorStop(0.8, `rgba(0,255,190,${0.45 * sterk})`); g.addColorStop(1, "rgba(0,120,255,0)"); k.fillStyle = g; k.beginPath(); k.arc(0, 0, rx, 0, 6.3); k.fill(); k.restore(); };
    // de vorm verraadt de soort: een meerval is een kikkervisje (dikke kop, pens, dunne staart), een karper is bol en hoog
    for (const f of vissen) { if (f.v < X0 || f.v > X1 || f.d > D1) continue;
      const c = Math.cos(f.hoek ?? 0), kop = c >= 0 ? 1 : -1, L = (f.lengte / (X1 - X0)) * BW * (0.4 + 0.6 * Math.abs(c)), hY = (f.lengte * BH) / D1, cx = X(f.v), cy = Y(f.d), wieg = Math.sin(t * 0.25 + f.v * 3) * 0.6, sterk = f.sterk ?? 1;
      if (f.soort === "Meerval") {
        vlek(cx + kop * L * 0.3, cy, Math.max(2.2, L * 0.2), Math.max(1.6, hY * 0.12), 0, sterk); // de kop
        vlek(cx + kop * L * 0.08, cy + hY * 0.02, Math.max(2, L * 0.2), Math.max(1.5, hY * 0.11), 0, sterk); // de pens
        for (let i = 0; i < 4; i++) { const a = 0.12 + i * 0.13; vlek(cx - kop * L * a, cy + wieg * i * 0.4, Math.max(1.2, L * (0.12 - i * 0.022)), Math.max(0.9, hY * (0.065 - i * 0.012)), 0, sterk * (0.9 - i * 0.1)); } // de staart
      } else if (f.soort === "Karper" || f.soort === "Brasem") {
        vlek(cx + kop * L * 0.05, cy, Math.max(2.4, L * 0.36), Math.max(2, hY * 0.2), 0, sterk); vlek(cx - kop * L * 0.4, cy + wieg * 0.3, Math.max(1.2, L * 0.1), Math.max(1, hY * 0.1), 0, sterk * 0.8);
      } else vlek(cx, cy, Math.max(1.8, L * 0.3), Math.max(1.2, hY * 0.12), 0, sterk * 0.85); }
    // waterplanten: pluimen van de bodem omhoog
    for (const p of planten) { if (p.v < X0 || p.v > X1) continue; for (let d = p.bodem; d > p.top; d -= 0.28) vlek(X(p.v) + Math.sin(d * 5 + p.v) * 0.8, Y(d), 1.5, 1.4, 0, 0.55 * (0.5 + 0.5 * (d - p.top) / (p.bodem - p.top + 0.01))); }
    for (const s of school) { if (s.v < X0 || s.v > X1) continue; vlek(X(s.v) + Math.sin(t * 0.7 + s.d * 9) * 1.2, Y(s.d) + Math.cos(t * 0.5 + s.v * 7) * 0.8, 1.9, 1.3, 0, 0.75); }
    if (aas && aas.v != null) { vlek(X(aas.v), Y(aas.d), 2.4, 1.6, 0, 0.95); for (let i = 1; i < 5; i++) if (aas.d - i * 0.6 > 0.3) vlek(X(aas.v) - 0.2 + Math.sin(i * 2.1) * 0.8, Y(aas.d - i * 0.6), 1.1, 0.9, 0, 0.4); }
    k.globalCompositeOperation = "source-over";
    // uitvergroten naar het scherm, met het raster en de cijfers erover
    const c = this.c, x = this.x, W = c.width, H = c.height, F = Math.min(H, (W * 9) / 16); x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(this.klein, 0, 0, W, H);
    const sx = (v) => ((v - X0) / (X1 - X0)) * W, sy = (d) => (d / D1) * H;
    x.strokeStyle = "rgba(255,255,255,0.16)"; x.lineWidth = 1; x.fillStyle = "#fff"; x.font = `${Math.round(F * 0.036)}px sans-serif`; x.textAlign = "center"; x.textBaseline = "top";
    for (let v = Math.ceil(X0); v <= Math.floor(X1); v++) { x.beginPath(); x.moveTo(sx(v), 0); x.lineTo(sx(v), H); x.stroke(); x.fillText(String(Math.abs(v)), sx(v), 2); }
    x.textAlign = "left"; x.textBaseline = "middle"; for (let d = 1; d < D1; d++) { x.beginPath(); x.moveTo(0, sy(d)); x.lineTo(W, sy(d)); x.stroke(); x.fillText(String(d), 3, sy(d)); }
    x.strokeStyle = "#fff"; x.lineWidth = 1.5; x.beginPath(); x.moveTo(sx(X0), sy(-X0 * 1.32)); x.lineTo(sx(0), sy(0.12)); x.lineTo(sx(3.3), 0); x.stroke(); // de rand van de bundel
    x.font = `bold ${Math.round(F * 0.058)}px sans-serif`; x.textBaseline = "top"; x.fillText(`${temp.toFixed(2)}°c`, W * 0.045, H * 0.03); x.fillText(tijd, W * 0.045, H * 0.085);
    // waar kijkt de transducer heen? Een bellyboat van boven met de bundel
    if (richting !== null) { const r = F * 0.11, cx = W - F * 0.2, cy = F * 0.24; x.save(); x.fillStyle = "rgba(10,14,20,0.65)"; x.beginPath(); x.arc(cx, cy, r * 1.25, 0, 6.3); x.fill();
      x.fillStyle = "rgba(255,230,60,0.55)"; x.beginPath(); x.moveTo(cx + r * 0.25, cy - r * 0.3); x.arc(cx + r * 0.25, cy - r * 0.3, r * 1.05, -Math.PI / 2 - richting - 0.2, -Math.PI / 2 - richting + 0.2); x.closePath(); x.fill();
      x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - r * 0.3, cy - r * 0.5); x.lineTo(cx - r * 0.3, cy + r * 0.3); x.quadraticCurveTo(cx, cy + r * 0.65, cx + r * 0.3, cy + r * 0.3); x.lineTo(cx + r * 0.3, cy - r * 0.5); x.stroke(); x.restore(); }
    // de knoppen van het toestel (alleen voor het beeld)
    x.font = `${Math.round(F * 0.05)}px sans-serif`; x.textAlign = "center"; x.textBaseline = "middle";
    const knop = (kx_, ky, tekst, klein) => { const bw = F * 0.11, bh = F * 0.085; x.fillStyle = "rgba(70,78,90,0.82)"; x.fillRect(kx_ - bw / 2, ky - bh / 2, bw, bh); x.fillStyle = "#fff"; if (klein) { x.font = `${Math.round(F * 0.026)}px sans-serif`; } x.fillText(tekst, kx_, ky); x.font = `${Math.round(F * 0.05)}px sans-serif`; };
    const by = H * 0.925; knop(W * 0.08, by, "II"); knop(W * 0.255, by, "–"); knop(W * 0.34, by, "13m", true); knop(W * 0.425, by, "+"); knop(W * 0.625, by, "–"); knop(W * 0.71, by, "Gain 78%", true); knop(W * 0.795, by, "+");
    knop(W * 0.967, H * 0.65, "–"); knop(W * 0.967, H * 0.78, "Auto 13m", true); knop(W * 0.967, H * 0.915, "+");
  }
}
