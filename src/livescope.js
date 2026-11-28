// De livescope op de bellyboat: nagebouwd naar Bobs eigen opname van zijn Garmin LiveScope (ref/livescope-echt.mp4).
// Vooruitkijkend: bovenaan de afstand (4 m achter je tot ± 12 m voor je), links de diepte. Het water is effen
// koningsblauw met een fijne korrel; vlak bij de transducer een waaier van lichtblauwe spikkels. De bodem is een dikke
// rood-oranje band met geel-groene randen en schuine strepen, met daaronder schuine lichtblauwe vegen. Vissen zijn
// liggende vlekken: rode kern, geel-groene rand, lichtblauwe gloed; kleine visjes lichtblauwe stipjes.
// Linksboven groot de diepte onder de boot, daaronder watertemperatuur, snelheid (knopen), accuspanning en tijd.
// Het bereik schaalt mee met de diepte (Auto): bij 8 m bodem 12 m, zoals op de opname; bij 10 m bodem 14 m.

/** De kleuren: blauw (3,12,198) → lichtblauw → cyaan → groen → geel → oranje → rood → donkerrood (gemeten op de opname). */
const KLEUR = (() => { const t = new Uint8Array(256 * 3), stop = [[0, 3, 12, 198], [0.18, 0, 40, 225], [0.34, 0, 150, 235], [0.46, 0, 210, 215], [0.56, 100, 238, 123], [0.66, 206, 234, 34], [0.78, 254, 160, 0], [0.88, 250, 70, 0], [1, 170, 0, 0]];
  for (let i = 0; i < 256; i++) { const v = i / 255; let k = 0; while (k < stop.length - 2 && v > stop[k + 1][0]) k++; const a = stop[k], b = stop[k + 1], f = Math.min(1, Math.max(0, (v - a[0]) / (b[0] - a[0]))); for (let c = 0; c < 3; c++) t[i * 3 + c] = a[c + 1] + (b[c + 1] - a[c + 1]) * f; }
  return t; })();
const h2 = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };
const wolk = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), u = x - xi, v = y - yi, a = h2(xi, yi), b = h2(xi + 1, yi), c = h2(xi, yi + 1), d = h2(xi + 1, yi + 1), su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v); return a + (b - a) * su + (c - a) * sv + (a - b - c + d) * su * sv; };
const BW = 384; // breedte van het sonarbeeld in pixels (wordt uitgerekt naar het scherm)
const FONT = '"Helvetica Neue", Arial, sans-serif';

export class Livescope {
  constructor(canvas) { this.c = canvas; this.x = canvas.getContext("2d"); this.klein = document.createElement("canvas"); this.kx = this.klein.getContext("2d"); this.t = 0; this.diepte = 12; this.vooruit = 12; this.gain = 68; this.pauze = false; this.knoppen = []; }
  /** Een tik op het scherm (in canvas-pixels): de knoppen van het toestel werken. Geeft true als er een knop geraakt is. */
  tik(px, py) { const STAP = [8, 12, 16, 20, 28, 36]; for (const k of this.knoppen) { if (px < k.x0 || px > k.x1 || py < k.y0 || py > k.y1) continue;
      if (k.id === "bereik-") this.vooruit = Math.max(4, this.vooruit - 1); if (k.id === "bereik+") this.vooruit = Math.min(40, this.vooruit + 1); // per meter, zoals op het toestel
      if (k.id === "ver-") this.gain = Math.max(0, this.gain - 2); if (k.id === "ver+") this.gain = Math.min(100, this.gain + 2); if (k.id === "pauze") this.pauze = !this.pauze; if (k.id === "diep-" || k.id === "diep+" || k.id === "auto") this.autoUit = k.id !== "auto";
      if (k.id === "diep-") this.diepte = Math.max(4, this.diepte - 1); if (k.id === "diep+") this.diepte = Math.min(40, this.diepte + 1); return true; } return false; }
  /**
   * bodem(v) = diepte op v meter voor de transducer (negatief = erachter); vissen = [{ v, d, lengte, hoek, soort }];
   * school = [{ v, d }]; planten = [{ v, bodem, top }]; aas = { v, d } of null; onder = diepte onder de boot; richting = stand van de transducer.
   */
  teken({ bodem, vissen = [], aas = null, school = [], planten = [], takken = [], temp = 14.8, snelheid = 0, volt = 12.5, tijd = "12:50", richting = null, onder = null }) {
    this.t += 1; const t = this.t, c = this.c, W = c.width, H = c.height, F = Math.min(H, (W * 9) / 16);
    // het bereik (Auto): bodem + ruim 3,5 m op hele meters; vooruit even ver, achteruit 0,385 daarvan;
    // de diepte-as heeft dezelfde verhouding meters per pixel als op de opname
    if (this.pauze) return; // stilgezet met de pauzeknop
    // vooruit: het bereik dat je zelf instelt (− en +); diepte: Auto, de bodem in beeld plus wat ruimte, in stappen van 6 m (12, 18, 24)
    const ref = onder ?? bodem(0); let maxB = ref; for (let v = 0; v <= this.vooruit; v += this.vooruit / 12) maxB = Math.max(maxB, bodem(v));
    if (!this.autoUit) this.diepte = Math.min(36, Math.max(6, Math.ceil((maxB + 2.5) / 6) * 6));
    const R = this.vooruit, DA = this.diepte, D1 = DA * 0.94 * Math.max(1, (H / W) * (16 / 9) * 0.85), X1 = R * 0.985, X0 = -0.4 * D1 * Math.min(1, (W / H) * (9 / 16));
    const versterk = Math.max(0.15, this.gain / 68) ** 0.8;
    const BH = Math.max(80, Math.round((BW * H) / W)); if (this.klein.width !== BW || this.klein.height !== BH) { this.klein.width = BW; this.klein.height = BH; this.beeld = this.kx.createImageData(BW, BH); }
    const px = this.beeld.data, bod = new Float32Array(BW); for (let i = 0; i < BW; i++) bod[i] = bodem(X0 + ((i + 0.5) / BW) * (X1 - X0));
    const wig = (-0.55 * D1) / X0; // de zwarte wig linksboven komt halverwege links uit, zoals op de opnamen
    for (let j = 0; j < BH; j++) { const d = ((j + 0.5) / BH) * D1;
      for (let i = 0; i < BW; i++) { const v = X0 + ((i + 0.5) / BW) * (X1 - X0), b = bod[i], o = (j * BW + i) * 4;
        if (v < 0 && d < -v * wig) { px[o] = px[o + 1] = px[o + 2] = 6; px[o + 3] = 255; continue; } // buiten de bundel: zwart
        const korrel = h2(i + t * 7.3, j - t * 3.1); let s = 0.01 + korrel * 0.035;
        if (d < b - 0.15) {
          // het water: effen blauw met een fijne korrel; af en toe een lichter spikkeltje; bij de transducer de waaier
          const r = Math.hypot(v, d * 0.9);
          if (korrel > 0.9985) s += 0.16; s += (wolk(i * 0.08 + t * 0.01, j * 0.1) - 0.5) * 0.04;
          if (r < 3.0 && v > -0.15) { const a = Math.atan2(d, v), st = h2(Math.round(a * 140), Math.floor(r * 3 + h2(Math.round(a * 140), 5) * 3) + (t >> 2)); if (st > 0.82 && a < 1.45) s += (0.32 + korrel * 0.15) * (1 - r / 3.0) ** 0.7 + 0.06; }
        } else if (d < b + 1.05) {
          // de bodem: rood-oranje kern, geel-groene randen, schuine strepen
          const x_ = (d - b + 0.15) / 1.2, kern = Math.sin(Math.min(1, x_ * 1.15) * Math.PI) ** 0.8, streep = wolk((i * 0.9 - j * 1.6) * 0.09, (i * 0.3 + j * 0.9) * 0.6) * 0.6 + wolk(i * 0.05 + 7, j * 0.12) * 0.4, fijn = wolk((i * 1.4 - j * 2.2) * 0.25, (i + j) * 0.9);
          const dikte = (0.65 + wolk(i * 0.018 + 3, 1.7) * 0.55) * (1 - Math.max(0, v) / 50); s = 0.36 + kern * 0.52 * dikte + (streep - 0.5) * 0.36 + (fijn - 0.5) * 0.16 + (korrel - 0.5) * 0.08 - (1 - kern) * 0.12;
        } else {
          // onder de bodem: donkerblauw met schuine lichtblauwe vegen
          const veeg = wolk((i * 0.35 + j * 0.15) * 0.12, (j * 0.35 - i * 0.12) * 0.05) * wolk(i * 0.6 - j * 0.3, j * 0.25), diep = d - b - 1.05;
          s = 0.03 + Math.max(0, veeg - 0.3) * 1.3 * Math.max(0.25, 1 - diep / 4) + korrel * 0.04;
        }
        if (s > 0.08) s *= versterk; const k = Math.max(0, Math.min(255, (s * 255) | 0)) * 3; px[o] = KLEUR[k]; px[o + 1] = KLEUR[k + 1]; px[o + 2] = KLEUR[k + 2]; px[o + 3] = 255; } }
    this.kx.putImageData(this.beeld, 0, 0);
    // vissen, visjes, planten en het aas: lichtgevende vlekken die optellen
    const X = (v) => ((v - X0) / (X1 - X0)) * BW, Y = (d) => (d / D1) * BH, k = this.kx, ppm = BW / (X1 - X0), ppmY = BH / D1; k.globalCompositeOperation = "source-over";
    const vlek = (cx, cy, rx, ry, sterk) => { k.save(); k.translate(cx, cy); k.scale(1, ry / rx); const g = k.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, `rgba(235,25,0,${Math.min(1, 1.0 * sterk)})`); g.addColorStop(0.28, `rgba(254,140,0,${Math.min(1, 0.95 * sterk)})`); g.addColorStop(0.5, `rgba(206,234,34,${0.85 * sterk})`); g.addColorStop(0.7, `rgba(100,238,123,${0.6 * sterk})`); g.addColorStop(0.86, `rgba(0,200,225,${0.35 * sterk})`); g.addColorStop(1, "rgba(0,40,225,0)"); k.fillStyle = g; k.beginPath(); k.arc(0, 0, rx, 0, 6.3); k.fill(); k.restore(); };
    const stip = (cx, cy, r, sterk) => { const g = k.createRadialGradient(cx, cy, 0, cx, cy, r); g.addColorStop(0, `rgba(120,255,230,${sterk})`); g.addColorStop(0.5, `rgba(0,200,235,${sterk * 0.6})`); g.addColorStop(1, "rgba(0,60,230,0)"); k.fillStyle = g; k.beginPath(); k.arc(cx, cy, r, 0, 6.3); k.fill(); };
    for (const p of planten) { if (p.v < X0 || p.v > X1) continue; for (let d = p.bodem; d > p.top; d -= 0.22) stip(X(p.v) + Math.sin(d * 5 + p.v) * 1.1, Y(d), 1.8, 0.45 * (0.4 + 0.6 * (d - p.top) / (p.bodem - p.top + 0.01))); }
    // takken: een dunne, felle lijn (hout geeft een harde echo)
    for (const tk of takken) { const n = 14; for (let i = 0; i <= n; i++) { const f = i / n, v = tk.v0 + (tk.v1 - tk.v0) * f, d = tk.d0 + (tk.d1 - tk.d0) * f; if (v < X0 || v > X1) continue; vlek(X(v), Y(d), 1.6, 1.1, 0.75); } }
    for (const s of school) { if (s.v < X0 || s.v > X1) continue; stip(X(s.v) + Math.sin(t * 0.7 + s.d * 9) * 0.8, Y(s.d) + Math.cos(t * 0.5 + s.v * 7) * 0.5, 2.0, 0.7); }
    // de vorm verraadt de soort: een meerval is een kikkervisje (dikke kop, pens, dunne staart), een karper bol en hoog
    for (const f of vissen) { if (f.v < X0 || f.v > X1 || f.d > D1) continue;
      const ver = Math.max(0, f.v) / 30, cs = Math.cos(f.hoek ?? 0), kop = cs >= 0 ? 1 : -1, L = f.lengte * ppm * (0.45 + 0.55 * Math.abs(cs)) + ver * 6, hY = f.lengte * ppmY, cx = X(f.v), cy = Y(f.d), wieg = Math.sin(t * 0.25 + f.v * 3) * 0.5, z = (f.sterk ?? 1) * (1 - ver * 0.45) * Math.min(1.3, versterk); // verder weg: groter, vager
      if (f.lengte < 0.3) { stip(cx, cy, 2.6, 0.85); continue; }
      const dik = Math.max(2.4, ppmY * (0.14 + f.lengte * 0.1)) + ver * 3; // de echo is dikker dan de vis
      if (f.soort === "Meerval") {
        // zoals op Bobs opname: een lange dunne echo; voorin dik en rood (kop en pens), daarachter een lange dunne staart die meebuigt
        const LM = f.lengte * ppm * 1.1 * (0.35 + 0.65 * Math.abs(cs)), buig = (f.buig ?? 0) * dik * 3;
        const r0 = Math.sin(t * 0.7 + f.v * 4) * 0.25;
        vlek(cx + kop * LM * 0.28, cy - dik * 0.1, Math.max(3.2, LM * 0.24), dik * (1.05 + r0 * 0.2), z); vlek(cx + kop * LM * 0.08, cy + dik * 0.12, Math.max(3, LM * 0.24), dik * 1.1, z); vlek(cx + kop * LM * 0.38, cy + dik * 0.25 * r0, Math.max(2, LM * 0.12), dik * 0.7, z * 0.8);
        for (let i = 0; i < 14; i++) { const a = (i + 1) / 14; vlek(cx - kop * LM * (0.05 + a * 0.55), cy + buig * 0.5 * a * a + wieg * a * 0.4, Math.max(2, LM * (0.13 - a * 0.06)), dik * (0.6 - a * 0.32), z * (0.75 - a * 0.4)); }
      } else if (f.soort === "Karper" || f.soort === "Brasem") { vlek(cx + kop * L * 0.04, cy, Math.max(3, L * 0.42), dik * 1.5, z); vlek(cx - kop * L * 0.45, cy + wieg * 0.3, Math.max(1.4, L * 0.13), dik * 0.7, z * 0.7); }
      else { vlek(cx + kop * L * 0.05, cy, Math.max(2.6, L * 0.45), dik, z); vlek(cx - kop * L * 0.42, cy, Math.max(1.4, L * 0.2), dik * 0.6, z * 0.6); }
      // rafels en het spoor erachter, zoals op de opname
      for (let i = 0; i < 3; i++) { const q = Math.sin(t * 0.9 + i * 2.3 + f.v * 5); vlek(cx + (i - 1) * L * 0.3 + q * 1.2, cy + q * dik * 0.4, Math.max(1.4, L * 0.12), dik * 0.45, 0.5 * z); }
      if (f.soort !== "Meerval") vlek(cx - kop * L * 0.85, cy, Math.max(2, L * 0.55), dik * 0.4, 0.3 * z); }
    if (aas && aas.v != null) { // het aas: een klein lichtblauw streepje rechtop, met een vage lijn naar boven (zoals op de opname)
      const ax = X(aas.v), ay = Y(aas.d); for (let i = 0; i < 4; i++) stip(ax, ay - i * ppmY * 0.08, 1.6, 0.9 - i * 0.12); for (let d = aas.d - 0.4; d > 0.4; d -= 0.35) if (h2(d * 10, t >> 2) > 0.45) stip(ax + Math.sin(d * 3) * 0.3, Y(d), 0.9, 0.25); }
    k.globalCompositeOperation = "source-over";

    // ---- uitvergroten naar het scherm, met raster, cijfers en knoppen erover ----
    const x = this.x; x.imageSmoothingEnabled = true; x.imageSmoothingQuality = "high"; x.drawImage(this.klein, 0, 0, W, H);
    const sx = (v) => ((v - X0) / (X1 - X0)) * W, sy = (d) => (d / D1) * H, lijn = Math.max(1, F / 600), pxM = Math.min(W / (X1 - X0), H / D1), stapM = pxM < F * 0.075 ? 2 : 1, stapD = stapM; // worden de hokjes van 1 bij 1 m te klein, dan worden ze 2 bij 2 m (zoals op de livescope zelf)
    x.strokeStyle = "rgba(255,255,255,0.33)"; x.lineWidth = lijn; x.fillStyle = "#fff";
    // bovenaan de afstand achter (links van 0) en voor de transducer, links de diepte
    x.font = `${Math.round(F * 0.034)}px ${FONT}`; x.textAlign = "center"; x.textBaseline = "top";
    for (let v = Math.ceil(X0 / stapM) * stapM; v <= X1; v += stapM) { x.beginPath(); x.moveTo(sx(v), 0); x.lineTo(sx(v), H); x.stroke(); x.fillText(String(Math.abs(v)), sx(v), F * 0.004); }
    x.textAlign = "left"; x.textBaseline = "middle"; for (let d = stapD; d < D1; d += stapD) { x.beginPath(); x.moveTo(0, sy(d)); x.lineTo(W, sy(d)); x.stroke(); x.fillText(String(d), F * 0.006, sy(d)); }
    // de rand van de bundel en het oppervlak
    x.strokeStyle = "#fff"; x.lineWidth = lijn * 2; x.beginPath(); x.moveTo(sx(X0), sy(-X0 * wig)); x.lineTo(sx(0), sy(0.02)); x.lineTo(sx(X1 * 0.3), 0); x.stroke();
    // de grote diepte en de regels eronder
    const L0 = F * 0.08; x.textBaseline = "alphabetic"; x.shadowColor = "rgba(0,0,0,0.5)"; x.shadowBlur = F * 0.01;
    if (onder != null) { x.font = `bold ${Math.round(F * 0.19)}px ${FONT}`; const tk = onder.toFixed(1); x.fillText(tk, L0, F * 0.175); const bw = x.measureText(tk).width; x.font = `bold ${Math.round(F * 0.1)}px ${FONT}`; x.fillText("m", L0 + bw + F * 0.005, F * 0.175); }
    [[temp.toFixed(2), "°", "C"], [snelheid.toFixed(2), "k", "t"], [volt.toFixed(1), "", "V"], [tijd, "", ""]].forEach(([w, e1, e2], i) => { const y = F * (0.226 + i * 0.0445); x.font = `${Math.round(F * 0.056)}px ${FONT}`; x.fillText(w, L0, y); const bw = x.measureText(w).width; x.font = `${Math.round(F * 0.027)}px ${FONT}`; if (e1) x.fillText(e1, L0 + bw + 2, y - F * 0.022); if (e2) x.fillText(e2, L0 + bw + 2, y - (e1 ? 0 : F * 0.002)); });
    x.shadowBlur = 0;
    // waar kijkt de transducer heen? (een bellyboat van boven met de bundel; niet van Garmin, maar handig in het spel)
    if (richting !== null) { const r = F * 0.09, cx = W - F * 0.2, cy = F * 0.2; x.save(); x.fillStyle = "rgba(10,14,30,0.55)"; x.beginPath(); x.arc(cx, cy, r * 1.25, 0, 6.3); x.fill();
      x.fillStyle = "rgba(255,230,60,0.6)"; x.beginPath(); x.moveTo(cx + r * 0.25, cy - r * 0.3); x.arc(cx + r * 0.25, cy - r * 0.3, r * 1.05, -Math.PI / 2 - richting - 0.2, -Math.PI / 2 - richting + 0.2); x.closePath(); x.fill();
      x.strokeStyle = "#fff"; x.lineWidth = 2; x.beginPath(); x.moveTo(cx - r * 0.3, cy - r * 0.5); x.lineTo(cx - r * 0.3, cy + r * 0.3); x.quadraticCurveTo(cx, cy + r * 0.65, cx + r * 0.3, cy + r * 0.3); x.lineTo(cx + r * 0.3, cy - r * 0.5); x.stroke(); x.restore(); }
    // de knoppen van het toestel, zoals op de opname
    const U = (F * 16) / 9; // breedte van een 16:9-scherm met deze hoogte: de knoppen staan op dezelfde plek als op de opname
    this.knoppen = [];
    const knop = (kx_, ky, tekst, klein, b, h, id) => { const bw = U * b, bh = F * h; x.fillStyle = "rgba(58,62,70,0.85)"; x.fillRect(kx_ - bw / 2, ky - bh / 2, bw, bh); this.knoppen.push({ id, x0: kx_ - bw / 2, x1: kx_ + bw / 2, y0: ky - bh / 2, y1: ky + bh / 2 });
      x.fillStyle = "#fff"; x.textAlign = "center"; x.textBaseline = "middle"; const rg = tekst.split("\n"); x.font = `${Math.round(F * (klein ? 0.026 : 0.05))}px ${FONT}`; rg.forEach((r_, i) => x.fillText(r_, kx_, ky + (i - (rg.length - 1) / 2) * F * 0.03)); };
    const by = H - F * 0.086; knop(U * 0.08, by, "II", false, 0.074, 0.09, "pauze");
    for (const [px_, tk, kl, id] of [[0.257, "–", false, "bereik-"], [0.342, `${R}m`, true, "bereik"], [0.427, "+", false, "bereik+"]]) knop(U * px_, by, tk, kl, 0.074, 0.09, id);
    for (const [px_, tk, kl, id] of [[0.794, "+", false, "ver+"], [0.709, `Ver.\n${this.gain}%`, true, "ver"], [0.624, "–", false, "ver-"]]) knop(W - U * (1 - px_), by, tk, kl, 0.074, 0.09, id);
    const rx = W - U * 0.034; knop(rx, H - F * 0.355, "–", false, 0.05, 0.12, "diep-"); knop(rx, H - F * 0.222, this.autoUit ? `${DA}m` : `Auto\n${DA}m`, true, 0.05, 0.12, "auto"); knop(rx, H - F * 0.095, "+", false, 0.05, 0.12, "diep+");
    x.textAlign = "left"; x.textBaseline = "middle"; x.font = `${Math.round(F * 0.025)}px ${FONT}`; x.fillStyle = "#fff"; x.fillText("GLS10", U * 0.045, H - F * 0.145);
  }
}
