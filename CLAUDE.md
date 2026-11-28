# Werkwijze voor dit spel (geldt voor iedereen die eraan werkt, ook Claude)

Altijd uitgaan van de beste oplossing:

1. **Beste bron eerst.** Zoek per onderdeel eerst het beste echte, vrij bruikbare materiaal: modellen (Sketchfab CC0/CC-BY, Poly Haven, Kenney, Quaternius), texturen (Poly Haven, ambientCG), open data (IGN-luchtfoto's en hoogtemodel), geluid (Freesound, Sonniss GDC-bundel, Pixabay, Kenney). Zelf bouwen pas als laatste — dan naar de foto's, met echte texturen, nooit blokjes. Vermeld bronnen en licenties in de README.
2. **Mensen zijn cartoonpersonages** in één vaste getekende stijl, herkenbaar aan haar, baard, bril, pet, postuur en kleding (korte broek, T-shirt, sneakers). Geen foto's op 3D-hoofden plakken.
3. **Alleen echte geluiden.** Geen zelf gegenereerde piepjes of ruis. Achtergrondgeluid hoort erbij.
4. **Zelf de kwaliteit controleren.** Leg elk resultaat naast de referentiefoto's, bekijk het van dichtbij en op telefoonformaat, en keur zelf af wat niet klopt. Testen betekent: het werkt (`node tools/test.cjs`) én het ziet er goed uit (`tools/kijk.cjs`, `tools/portret.cjs`, `tools/telefoon.cjs`).
5. **Bij twijfel de mooiste, meest uitgebreide optie.**
6. **Altijd werken vanuit de assets-pagina.** Elk model, elke textuur en elk geluid komt eerst in `assets/bronnen.json` (naam, bron, maker, licentie) en wordt dan met `node tools/assets.cjs` in de catalogus gezet (`assets.html`: voorbeeld, grootte, driehoeken, texturen, bron, licentie, nieuw). Pas daarna gebruiken in het spel. Kijk eerst in de catalogus of iets er al is.
7. Foto's en verhalen van de Cocks zijn context om beelden te verbeteren; nieuwe missies of onderdelen alleen bouwen als dat gevraagd wordt.

Zie ook `PLAN.md` (wat het spel moet worden) en `CONTRIBUTING.md` (eigen tak + pull request).
