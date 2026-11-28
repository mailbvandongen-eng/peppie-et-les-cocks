# Meewerken aan Peppie et les Cocks

Fijn dat je meedoet! Zo houden we het overzichtelijk:

1. **Werk op een eigen tak**, niet direct op `main`. Vraag Claude bijvoorbeeld: "maak een nieuwe tak en ...".
2. **Maak een pull request** als je klaar bent. Bob (of zijn Claude) kijkt het na en zet het live. `main` is wat er op GitHub Pages staat.
3. **Lees eerst `PLAN.md`**: daar staat wat het spel moet worden en wat er al gebouwd is.
4. Testen: `node tools/test.cjs` speelt alle missies af in een browser zonder scherm. `node tools/kijk.cjs` en `node tools/portret.cjs` maken beelden.
5. De foto's en video's van ons staan niet in de repo (die is openbaar); alleen de getekende portretten in `assets/portret/` en de gezichten in de modellen.

Opbouw in het kort: `src/main.js` (missies, bediening), `src/domein.js` (huis, steigers, zwembad), `src/vissen.js`, `src/livescope.js` en `src/chirp.js` (Wims strepenkijker), `src/bellyboat.js`, `src/kippen.js`, `tools/mensen/` (de vier Cocks).
