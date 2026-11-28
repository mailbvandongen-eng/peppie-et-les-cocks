# Peppie et les Cocks

Een visspel op de Lot bij Le Temple-sur-Lot (Frankrijk), in de browser (three.js). Dit is een eerste, grove versie.

## Missies
- **De reus van de Lot** — in de belly boat met een livescope. Zoek op het sonarbeeld een grote meerval (de reuzen liggen in de diepe kolken, 9 m en dieper), vaar er recht boven, laat je aas zakken (▼/▲) en tik tot hij bijt. Daarna de dril: houd de spanning in het groen; een grote vis sleept je mee. Doel: 2 meter of meer.
- **Vanaf de kant** — werp in vanaf de oever of de steiger, sla aan als de dobber onder gaat, en vang drie vissen.
- **Wakker worden!** — vlieg met de drone door het open slaapkamerraam en laat een glas water op de slapende Cocks vallen.
- **Beverratten** — schep er vijf vanaf de steiger. Loop rustig: wie rent, jaagt ze onder water.

Bediening: links op het scherm slepen = sturen, rechts slepen = rondkijken, knoppen rechtsonder. Toetsenbord: WASD, spatie (actie), R/F (omhoog/omlaag).

## Opbouw
- `src/wereld.js` — de rivier (170 m breed), oevers, bos en heggen, de huizen van het dorp, het huis aan de oever met slaapkamer, en de steiger. De rivierbodem is een hoogteveld met diepe kolken (`W.kolken`), zodat de livescope echte dieptes toont.
- `src/livescope.js` — het sonarbeeld, nagebouwd naar een opname van een Garmin LiveScope: blauw water met ruis, de bodem als rood-gele band, vissen als langgerekte vlekken, het aas als stipjes, de zwarte wig buiten de bundel, raster, temperatuur en tijd.
- `src/main.js` — de vier missies, de dril (`stapDril`), bediening en camera.
- `src/hengel.js`, `src/mensen.js`, `src/effecten.js` — overgenomen uit Fatbike Sniper.
- `tools/bouw.py` — maakt `data/lot.json` uit IGN BD TOPO. `tools/versie.mjs` — versienummer. `tools/test.cjs` — speelt elke missie af in headless Chromium.

## Bronnen
- Kaart: IGN BD TOPO® (gebouwen, water, wegen, vegetatie), licence ouverte Etalab 2.0.
- Mensen: MakeHuman (CC0), bewegingen Quaternius Universal Animation Library (CC0).
- Modellen via Sketchfab (CC BY 4.0): hengel “Fishing Rod” (emelyarules), molen “Spinning Reel” (SiBeRiEIIIkA), stoel “Camping Chair” (lpfeffer), blikje “Beer can” (Arte Hexe), krat “Beer crate” (3DDomino), karper “Carp Fish” (huykhoi2407).
- Bomen via Sketchfab (CC BY 4.0): “Realistic HD Lombardy poplar (16/75)” (PlantCatalog), “Maple trees pack (lowpoly, game ready, LODs)” (lolipop_1707), “Willow” (evolveduk); verkleind voor de telefoon.
- Drone: “DJI 3 mini Pro” (wishmaster88, Sketchfab, CC BY 4.0), vereenvoudigd; staat in het spel voor Pauls DJI Mini 2.
- Vissen via Sketchfab (CC BY 4.0): “Wels catfish” (faerbogdan99), “Bream (Abramis Brama)” en “Zander (Sander lucioperca)” (Nullifiedit), “Common Roach” (robert.meier.art); verkleind.
- Lucht en texturen van Poly Haven (CC0): HDRI *Kloofendal 48d Partly Cloudy (Pure Sky)*, texturen *sparse_grass*, *river_small_rocks*, *brown_mud_rocks_01*.
- three.js (MIT).

Zelf gebouwd en nog grof: de belly boat, de drone, de beverratten, het schepnet, het huis en de bomen.
