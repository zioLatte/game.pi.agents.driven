// ==========================================================
// physics.js — Funzioni fisiche core di PI.Onion
// ==========================================================
//
// Questo file contiene le funzioni più importanti dell’intero progetto:
//   1. resolveCircleCircle      → collisione tra cerchi (player ↔ onion, onion ↔ onion)
//
// Sono funzioni **pure**, senza dipendenze da classi esterne, e
// costituiscono la base su cui si appoggiano Player e Onion.
//
// Il design è minimalista (vanilla JS), orientato a prestazioni e
// leggibilità. Ogni funzione è isolata per mantenere l’engine estensibile.
//
// ==========================================================


// ==========================================================
// resolveCircleCircle(ax, ay, ar, bx, by, br)
// ----------------------------------------------------------
// • Risolve collisione statica tra due cerchi (A e B).
// • Se si sovrappongono, li “spinge” separandoli in modo simmetrico.
// • Usato in main.js per collisioni onion↔onion e onion↔player.
//
// RETURNS:
//   { ax, ay, bx, by } → nuove posizioni separate
//
// NOTE:
// • Non restituisce velocità: il nostro gioco è arcade,
//   quindi non servono impulsi elastici.
// • Evita incastri visivi delle onion.
//
// ==========================================================
export function resolveCircleCircle(ax, ay, ar, bx, by, br) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy) || 0.00001;
  const overlap = ar + br - dist;

  if (overlap > 0) {
    // direzione di separazione
    const nx = dx / dist;
    const ny = dy / dist;

    const push = overlap * 0.5;

    ax -= nx * push;
    ay -= ny * push;
    bx += nx * push;
    by += ny * push;
  }

  return { ax, ay, bx, by };
}
