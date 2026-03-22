// ==========================================================
// Engine.js — Game Loop principale (update + render)
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Implementare un game-loop a tempo variabile (dt)
// • Fornire callback esterne updateFn() e drawFn()
// • Mantenere FPS stabili tramite requestAnimationFrame
// • Normalizzare dt (limite massimo per evitare salti)
// • Fornire metodi di start/stop semplici e affidabili
//
// NOTE ARCHITETTURALI
// ----------------------------------------------------------
// • L’engine NON conosce nulla del gioco PI.Onion.
//   Tutta la logica si trova nei file Player/Onion/etc.
//
// • Il loop principale:
//       loop() → requestAnimationFrame → calcolo dt → updateFn(dt) → drawFn()
//
// • dt è limitato a un massimo (0.05s ≈ 20 FPS) per evitare
//   tunneling estremo dopo freeze, alt-tab, lag, ecc.
//
// • L’oggetto engine è volutamente minimale, stile arcade,
//   così da non introdurre complessità non necessaria.
//
// ==========================================================

export class Engine {
  constructor(updateFn, drawFn) {

    // ------------------------------------------------------
    // CALLBACK ESTERNE
    // ------------------------------------------------------
    // updateFn(dt): aggiorna la logica del gioco
    // drawFn(): disegna la scena attuale
    this.updateFn = updateFn || function(){};
    this.drawFn   = drawFn   || function(){};

    // ------------------------------------------------------
    // STATO DEL LOOP
    // ------------------------------------------------------
    this.running = false;   // se true → loop attivo
    this.lastTime = 0;      // timestamp dell'ultimo frame
    this.boundLoop = this.loop.bind(this);
  }

  // ----------------------------------------------------------
  // start():
  // • Avvia il game-loop.
  // • next frame → requestAnimationFrame → loop()
  // ----------------------------------------------------------
  start() {
    if (this.running) return;
    this.running = true;

    // reset tempo per evitare dt enorme nel primo frame
    this.lastTime = 0;

    requestAnimationFrame(this.boundLoop);
  }

  // ----------------------------------------------------------
  // stop():
  // • Arresta il game-loop.
  // • Non cancella stati del gioco: solo ferma il render/update.
  // ----------------------------------------------------------
  stop() {
    this.running = false;
  }

  // ----------------------------------------------------------
  // loop(timestamp):
  // • Punto centrale del game-loop.
  // • Calcola dt (delta time)
  // • Chiama updateFn(dt) e drawFn()
  // • Richiede il prossimo frame
  //
  // NOTE:
  // • dt viene limitato (clamped) per stabilità.
  // • Se running = false → il loop non continua.
  // ----------------------------------------------------------
  loop(timestamp) {
    if (!this.running) return;

    if (!this.lastTime) {
      this.lastTime = timestamp;
    }

    // tempo trascorso dall'ultimo frame
    let dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    // dt troppo grande può generare tunneling o salti strani
    if (dt > 0.05) dt = 0.05;

    // logica di gioco
    this.updateFn(dt, timestamp);

    // rendering
    this.drawFn(timestamp);

    // prossimo frame
    requestAnimationFrame(this.boundLoop);
  }
}
