// ==========================================================
// state.js — Stato di gioco globale (singleton)
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Fornire un contenitore centralizzato e semplice
//   per lo stato di gioco condiviso.
//
// • Non contiene logica, solo DATI GLOBALI:
//
//     state.score            → punteggio del giocatore
//     state.shotsFired       → numero totale di colpi sparati
//     state.onionsKilled     → onion eliminate
//     state.gameTime         → durata della partita (incrementata da main)
//     state.sessionStart     → timestamp di inizio partita
//
// • Non interagisce con entità, AI, fisica o rendering.
//   È consultato e aggiornato da main.js e altri sistemi.
//
// NOTE ARCHITETTURALI
// ----------------------------------------------------------
// • Il “game state” non va confuso con “game loop” o “engine”.
//   Qui ci sono solo valori.
//
// • In PI.Onion abbiamo scelto un SINGLETON semplice perché:
//
//     - basso coupling con il resto del codice
//     - facile da resettare
//     - ideale per giochi arcade senza complessità multi-level
//
// • In futuro si possono aggiungere:
//
//     - vite
//     - power-up
//     - high-score persistenti
//     - timer di missione
//
//   senza modificare alcun file esterno.
//
// ==========================================================

export const state = {
  // --------------------------------------------------------
  // SCORE E STATISTICHE
  // --------------------------------------------------------
  score: 0,            // punteggio totale
  shotsFired: 0,       // colpi sparati dal player
  onionsKilled: 0,     // nemici eliminati

  // --------------------------------------------------------
  // TEMPORALITÀ
  // --------------------------------------------------------
  gameTime: 0,            // tempo totale della partita (sec)
  sessionStart: 0,        // timestamp dell’inizio partita

  // --------------------------------------------------------
  // reset():
  // • Resetta completamente lo stato come a inizio gioco.
  // • Usato da main.js quando si ricarica il livello.
  // --------------------------------------------------------
  reset() {
    this.score = 0;
    this.shotsFired = 0;
    this.onionsKilled = 0;
    this.gameTime = 0;
    this.sessionStart = performance.now();
  }
};
