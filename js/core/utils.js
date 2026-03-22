// ==========================================================
// utils.js — Funzioni generiche di utilità per PI.Onion
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Contenere funzioni di supporto completamente standalone,
//   riutilizzabili ovunque e senza dipendenze da componenti
//   del gioco (pure functions).
//
// • Attualmente include:
//      - clamp(v, min, max)
//      - distance(x1, y1, x2, y2)
//
// • Le utility NON contengono logica di gioco.
//   Sono funzioni piccole, pure, e affidabili.
//
// NOTE:
// ----------------------------------------------------------
// • Questo file è intenzionalmente minimale per evitare
//   proliferazione di micro-utility che frammentano il progetto.
// • In futuro potremmo estenderlo con:
//      - randomInt()
//      - lerp()
//      - angleBetween()
//      - normalizeVector()
//      - seeded RNG (per livelli deterministici)
//
// ==========================================================


// ----------------------------------------------------------
// clamp(v, min, max)
// ----------------------------------------------------------
// Limita il valore v nel range [min, max].
//
// Usato in molte parti del gioco:
//   - contenimento del player nei bordi del mondo
//   - normalizzazione valori fisici
//   - normalizzazione valori fisici
//
// Funzione pura e sicura.
// ----------------------------------------------------------
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}


// ----------------------------------------------------------
// distance(x1, y1, x2, y2)
// ----------------------------------------------------------
// Restituisce la distanza euclidea tra due punti.
//
// Usata per:
//   - AI chase delle Onion (calcolare distanza dal player)
//   - Sistemi futuri (collisioni, effetti)
//
// Funzione pura e centrale nel calcolo geometrico 2D.
// ----------------------------------------------------------
export function distance(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}
