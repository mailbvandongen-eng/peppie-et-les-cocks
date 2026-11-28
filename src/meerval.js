// Aasgedrag en de dril met een meerval, naar wat Bob vertelt en laat zien (ref/livescope-echt.mp4, ref/dril-meter.mp4).
//
// AASGEDRAG — niet elke vis die langs zwemt wil je aas. Komt een vis binnen een paar meter, dan beslist hij één keer of hij
// nieuwsgierig is (kleine meervallen bijna altijd, grote minder). Is hij dat, dan komt hij naar het aas, op dezelfde diepte,
// en draait er rondjes omheen. Dan:
//   - meerval rond 80 cm: pakt bijna meteen;
//   - rond 150 cm: draait vaak een tijd rond en gaat dan weer weg;
//   - 200 cm en meer: moet je lokken — optillen, laten zakken en dan stil houden. Dat stilhouden na een beweging is het moment.
//   - soms gaan ze "aan": dan pakt elke vis meteen (een paar minuten lang).
//   - kleine vis (30-40 cm) die op de bodem ligt, komt op je aas af als het op de bodem ligt, en plukt aan je wormen.
// Pakt een vis, dan heb je een korte tijd om aan te slaan (de rode knop). Te laat: hij laat los.
//
// DE DRIL — de hengel staat meteen krom. Een meerval vecht op zijn eigen manier: hij komt omhoog en duikt dan hard naar beneden.
// Je drilt door de hengel op te trekken (▲), snel te laten zakken (▼) en ondertussen in te draaien (de rode knop vasthouden).
// Trekt hij harder dan je slip, dan loopt de lijn eraf (en gilt de reel). Met 50-80 ponds lijn kan de slip bijna op slot.
// Duur in het spel: 80 cm ± 20 s, 120 cm ± 1 min, 150 cm ± 1,5 min, 200 cm ± 3,5 min, de grootste ± 5 min.

const tussen = (a, b) => a + Math.random() * (b - a);
const klem = (x, a, b) => Math.min(b, Math.max(a, x));

export class Aasgedrag {
  constructor() { this.aanT = tussen(180, 360); this.aan = 0; this.vorigAas = 0; this.beweging = 0; this.stil = 0; this.pakt = null; this.paktT = 0; this.pluk = 0; }
  /**
   * Eén stap. vissen = alle vissen; top = {x, z} waar het aas hangt; aas = diepte van het aas; bodem = diepte daar.
   * Geeft { pakt: vis die het aas nu vasthoudt of null, pluk: 0..1 (kleine visjes die aan de wormen plukken) }.
   */
  stap(dt, vissen, top, aas, bodem) {
    // het "aan"-moment: een paar minuten pakt alles
    if (this.aan > 0) this.aan -= dt; else if ((this.aanT -= dt) <= 0) { this.aan = tussen(60, 110); this.aanT = tussen(240, 480); }
    const aanBij = this.aan > 0;
    // beweegt het aas (optillen/zakken), of hangt het stil na een beweging? Dat laatste lokt de grote.
    const v = Math.abs(aas - this.vorigAas) / Math.max(dt, 1e-3); this.vorigAas = aas;
    if (v > 0.2) { this.beweging = Math.min(3, this.beweging + dt * 1.5); this.stil = 0; } else { this.stil += dt; this.beweging = Math.max(0, this.beweging - dt * 0.4); }
    const lokt = this.stil > 0.15 && this.stil < 2.5 && this.beweging > 0.6; // net opgetild en gezakt, nu stil
    const opBodem = bodem - aas < 0.7;
    let n = 0, pluk = 0;
    for (const f of vissen) {
      if (f.vast) continue;
      const afst = Math.hypot(f.x - top.x, f.z - top.z), dd = Math.abs(f.d - aas), klein = f.soort !== "Meerval" || f.lengte < 1.1;
      // één keer beslissen: wil hij of niet?
      if (!f.nieuws && !(f.negeer > 0) && afst < 6 && dd < 3.5) {
        const kans = f.soort === "Meerval" ? (f.lengte < 1.1 ? 0.8 : f.lengte < 1.7 ? 0.5 : 0.35) : f.soort === "Brasem" ? (opBodem ? 0.7 : 0.15) : f.soort === "Karper" ? 0.08 : 0.25;
        if (Math.random() < (aanBij ? 0.95 : kans)) { f.nieuws = true; f.zin = 0; f.rondT = 0; f.geduld = f.soort === "Meerval" ? (f.lengte < 1.1 ? 30 : f.lengte < 1.7 ? tussen(12, 30) : tussen(40, 90)) : tussen(10, 25); f.fase ??= Math.random() * 6.28; }
        else f.negeer = tussen(25, 60);
      }
      if (f.negeer > 0) f.negeer -= dt;
      if (!f.nieuws) continue;
      if (++n > 4 || afst > 12) { this.laatGaan(f); continue; } // nooit meer dan een paar tegelijk
      // naar het aas toe, op dezelfde diepte, en dan rondjes (steeds kleiner als hij zin krijgt)
      f.rondT += dt; f.fase += dt * (0.3 + f.zin * 0.5) / Math.max(0.6, f.lengte * 0.7);
      const r = f.soort === "Brasem" ? 0.35 + (1 - f.zin) * 0.8 : 0.6 + (1 - f.zin) * 2.6;
      f.tx = top.x + Math.cos(f.fase) * r; f.tz = top.z + Math.sin(f.fase) * r; f.x0 = f.tx; f.z0 = f.tz; f.straal = 0.2; f.lok = aas + Math.sin(f.fase * 0.7) * (0.25 + (1 - f.zin) * 0.4);
      // zin opbouwen
      let groei;
      if (f.soort === "Meerval") groei = f.lengte < 1.1 ? 0.45 : f.lengte < 1.7 ? 0.07 + (lokt ? 0.25 : 0) - (this.beweging > 2 ? 0.08 : 0) : 0.01 + (lokt ? 0.2 : 0) - (this.beweging > 1.5 ? 0.06 : 0);
      else if (f.soort === "Brasem") groei = opBodem ? 0.25 : 0.04; else groei = 0.05;
      if (aanBij) groei = Math.max(groei, 0.6);
      if (afst < r + 1.5) f.zin = klem(f.zin + groei * dt, 0, 1.05);
      if (f.soort === "Brasem" && afst < 1.2 && opBodem) pluk = Math.max(pluk, 0.5 + Math.sin(f.fase * 6) * 0.5); // aan de wormen plukken
      if (f.rondT > f.geduld && !aanBij) { this.laatGaan(f); continue; }
      // pakken: alleen als er niet al iemand aan hangt
      if (f.zin >= 1 && afst < r + 0.6 && !this.pakt && (f.soort !== "Brasem" || Math.random() < dt * 0.5)) { this.pakt = f; this.paktT = f.soort === "Meerval" ? tussen(0.9, 1.6) : 0.6; }
    }
    this.pluk = pluk;
    if (this.pakt) { if ((this.paktT -= dt) <= 0) { const f = this.pakt; this.pakt = null; f.zin = 0.4; } } // te laat: hij laat los
    return { pakt: this.pakt, pluk, aan: aanBij };
  }
  laatGaan(f) { f.nieuws = false; f.lok = null; f.zin = 0; f.straal = f.soort === "Meerval" ? 8 : 14; f.negeer = tussen(30, 90); f.x0 = f.x + tussen(-8, 8); f.z0 = f.z + tussen(-8, 8); }
  /** Aanslaan op niets: het aas springt omhoog en de vissen in de buurt schrikken. */
  mis(vissen, top) { for (const f of vissen) if (f.nieuws && Math.hypot(f.x - top.x, f.z - top.z) < 4) { f.zin = Math.max(0, f.zin - 0.5); if (Math.random() < 0.4) this.laatGaan(f); } }
}

export class Dril {
  /** vis = { lengte, d }; diep = hoe ver de vis onder de top zit. */
  constructor(vis, diep) {
    const L = vis.lengte; this.vis = vis; this.L = L;
    this.duur = 20 * (L / 0.8) ** 2.4;                // beoogde duur in seconden
    this.kracht = 0.35 + L * 0.55;                     // hoe hard hij trekt (in "slip-eenheden": slip 1 = 1)
    this.uithoudings = 1; this.lijn = diep + 0.6; this.fase = "rust"; this.faseT = 0.8; this.trek = 0; this.slap = 0; this.t = 0; this.op = 0; this.pomp = 0; this.af = 0;
  }
  /**
   * draait = rode knop ingedrukt; op/neer = hengel opheffen/laten zakken; slip 0..1. Geeft "bezig", "binnen", "los" of "breuk".
   * Na afloop: this.trek (0..1+), this.af (m/s lijn eraf), this.fase ("rust" | "omhoog" | "duik"), this.op (stand van de hengel 0..1).
   */
  stap(dt, { draait, op, neer, slip }) {
    this.t += dt; const S = this.uithoudings, F = this.kracht * (0.35 + 0.65 * S);
    // de vis wisselt: rustig trekken, omhoog komen, en hard naar beneden duiken (vaker en langer naarmate hij groter en frisser is)
    if ((this.faseT -= dt) <= 0) {
      const r = Math.random(), duikKans = 0.3 + this.L * 0.18 * S;
      if (this.fase !== "rust") { this.fase = "rust"; this.faseT = tussen(0.8, 2.2); }
      else if (r < duikKans) { this.fase = "duik"; this.faseT = tussen(1.2, 2.2 + this.L * 1.5) * (0.5 + S * 0.5); }
      else { this.fase = "omhoog"; this.faseT = tussen(1, 2.5); } }
    const P = this.fase === "duik" ? F * tussen(1.1, 1.5) : this.fase === "omhoog" ? 0 : F * 0.45; // wat hij nu trekt
    // de hengel: ▲ heft hem op (dat wint lijn), ▼ laat hem zakken
    const opOud = this.op; if (op) this.op = Math.min(1, this.op + dt * 1.6); if (neer) this.op = Math.max(0, this.op - dt * 2.5); if (!op && !neer) this.op += (0.35 - this.op) * dt * 0.6;
    const pompWinst = Math.max(0, this.op - opOud) * 1.1; // optillen trekt de vis een stuk naar je toe
    // de slip: trekt hij harder dan de slip, dan loopt de lijn eraf
    const D = 0.25 + slip * 1.6; this.af = 0;
    if (P > D) { this.af = (P - D) * 1.6; this.lijn += this.af * dt; }
    else { if (draait) this.lijn -= (0.55 + (1 - P / D) * 0.6) * dt * (this.fase === "duik" ? 0.15 : 1); this.lijn -= pompWinst * (this.fase === "duik" ? 0.2 : 1); }
    // slap: hij komt omhoog en jij draait niet in
    if (this.fase === "omhoog" && !draait && this.op < 0.6) this.slap += dt; else this.slap = Math.max(0, this.slap - dt * 2);
    // vermoeien: vooral door druk (slip strak, pompen, indraaien), langzaam vanzelf
    const druk = Math.min(1, D / Math.max(0.3, this.kracht)) * (draait ? 1 : 0.5) + (pompWinst > 0 ? 0.5 : 0);
    this.uithoudings = Math.max(0, S - dt / this.duur * (0.4 + druk * 0.5));
    this.trek = Math.min(1.3, (P > D ? D : Math.max(P, draait ? D * 0.55 : P * 0.8)) / 1.4 + (this.fase === "duik" ? 0.25 : 0));
    this.lijn = Math.max(0, this.lijn);
    // afloop
    if (this.slap > 2.6) return "los";
    if (slip > 0.97 && this.fase === "duik" && P > 1.9 && Math.random() < dt * 0.15) return "breuk"; // slip echt op slot bij een reus
    if (this.lijn < 1.2 && this.uithoudings < 0.25) return "binnen";
    if (this.lijn < 1.2) this.lijn = 1.2; // hij is er nog niet aan toe: hij duikt weer weg
    return "bezig";
  }
}
