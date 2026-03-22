// ==========================================================
// OnionAI.js — State Machine & AI Utilities per le Onion
// ==========================================================
//
// RESPONSABILITÀ DEL MODULO
// ----------------------------------------------------------
// • Contiene gli stati della AI delle onion (enum ONION_STATE)
// • Contiene la logica principale di update AI:
//       updateOnionAI(onion, now, isShooting, lastPlayerShot)
//
// • Gestisce i timer di:
//       - CHASE (inseguimento del player)
//       - COOLDOWN (pausa dopo un inseguimento)
//       - RANDOM_MOVE (default)
//
// • Espone funzioni di utilità:
//       - registerOnion(onion)  → utile per sistemi futuri di AI collettiva
//       - getOnionColor(onion) → colore dinamico in base allo stato
//
// NOTE ARCHITETTURALI
// ----------------------------------------------------------
// • La AI è intenzionalmente semplice (retro arcade):
//      - un trigger (player spara) accende l’aggressività
//      - inseguimento per una finestra temporale
//      - cooldown di 3s dove la onion “si calma”
//      - ritorno a random move
//
// • Non ci sono pathfinding o steering avanzati.
//   La direzione è determinata dall’asse dominante (dx > dy → move X).
//
// • Questo file NON gestisce fisica, collisioni o rendering.
//   È solo “cervello”.
//
// ==========================================================



// ==========================================================
// ENUM STATI DELLA ONION
// ==========================================================
//
// RANDOM_MOVE → cammina in linea retta e cambia direzione periodicamente
// CHASE_PICHAN → inseguimento del player dopo un colpo
// COOLDOWN → periodo di calma dopo la fase di chase
//
export const ONION_STATE = {
  RANDOM_MOVE:  0,
  CHASE_PICHAN: 1,
  COOLDOWN:     2
};

const CHASE_DURATION_MS = 6500;
const COOLDOWN_DURATION_MS = 1800;
const SHOOT_TRIGGER_MS = 120;

function startChase(onion, now) {
  const globalChaseEnd = window.chaseEndTime || 0;
  if (now > globalChaseEnd) {
    window.chaseEndTime = now + CHASE_DURATION_MS;
  }

  onion.state = ONION_STATE.CHASE_PICHAN;
  onion.color = "#ff0000";    // rosso aggressivo
  const chaseScale = onion.chaseSpeedScale || 1;
  const playerSpeed = onion.player?.speed ?? onion.baseSpeed;
  onion.speed = playerSpeed * chaseScale;
  onion.chaseStartTime = now;

  // la chase dura 10s
  onion.chaseUntil = now + CHASE_DURATION_MS;
}

function setBaseSpeedAndColor(onion) {
  const playerSpeed = onion.player?.speed ?? onion.baseSpeed;
  const speedScale = onion.speedScale ?? 1;
  onion.speed = playerSpeed * speedScale;
  onion.color = "#ff6347";  // colore base
}

// ==========================================================
// REGISTRO DELLE ONION (opzionale, utile in futuro)
// ----------------------------------------------------------
// Per ora registra solo le onion, ma in futuro ci permette:
//   - swarm behavior
//   - onion che collaborano
//   - onion che evitano gruppi
//
// Attualmente non è usato per logica diretta, ma è utile
// perché noi (o te) possiamo leggerne lo stato in debug,
// o in futuro per creare comportamenti collettivi.
// ==========================================================
const onionRegistry = new WeakSet(); // evita leak: le onion GC-ate spariscono dal registro

export function registerOnion(onion) {
  onionRegistry.add(onion);
}


// ==========================================================
// updateOnionAI(onion, now, isShooting, lastPlayerShot)
// ----------------------------------------------------------
// È la FUNZIONE CENTRALE della AI.
// Decide come deve comportarsi ogni onion ad ogni frame.
//
// PARAMETRI:
// • onion           → la onion da aggiornare
// • now             → performance.now() corrente
// • isShooting      → true se il player sta sparando in questo frame
// • lastPlayerShot  → timestamp dell’ultimo colpo sparato
//
// LOGICA (versione “retrogame”):
//
//   1. Se onion è in COOLDOWN:
//        - continua finché cooldownUntil non scade
//
//   2. Se player spara:
//        - tutte le onion vedono lastPlayerShot
//        - se non sono in cooldown → entrano in CHASE
//
//   3. Se in CHASE:
//        - seguono il player per 10s
//        - poi passano in COOLDOWN (3 secondi)
//
//   4. Se nessuna condizione attiva:
//        - tornano in RANDOM_MOVE
//
// NOTA:
// • Questa funzione è volutamente indipendente da posizione o fisica.
//   Non muove la onion, aggiorna solo lo STATO.
//   È Onion.js a decidere come muoversi in base allo stato.
// ==========================================================
export function updateOnionAI(onion, now, isShooting, lastPlayerShot) {
  if (!onion.alive) return;

  const state = onion.state;

  // --------------------------------------------------------
  // 1) Se in COOLDOWN → attendiamo fine timer
  // --------------------------------------------------------
  if (state === ONION_STATE.COOLDOWN) {
    if (now > (onion.cooldownUntil || 0)) {
      // rientra in random move
      onion.state = ONION_STATE.RANDOM_MOVE;
      setBaseSpeedAndColor(onion);
    }
    return;
  }

  // --------------------------------------------------------
  // 2) Trigger di inseguimento (CHASE)
  //    Se il player ha sparato recentemente (<120ms fa)
  //    e la onion non è in cooldown → entra in CHASE
  // --------------------------------------------------------
  if (isShooting || now - lastPlayerShot < SHOOT_TRIGGER_MS) {

    // se non in cooldown, attiva chase
    if (state !== ONION_STATE.CHASE_PICHAN) {
      startChase(onion, now);
    }

    return;
  }

  // --------------------------------------------------------
  // 3) Se era in CHASE → controlla se deve passare in COOLDOWN
  // --------------------------------------------------------
  if (state === ONION_STATE.CHASE_PICHAN) {
    if (now > (onion.chaseUntil || 0)) {

      // entra in cooldown (1.8 secondi)
      onion.state = ONION_STATE.COOLDOWN;
      onion.color = "#ffa500";   // arancione = stanca / cooldown
      onion.cooldownUntil = now + COOLDOWN_DURATION_MS;
      const playerSpeed = onion.player?.speed ?? onion.baseSpeed;
      const speedScale = onion.speedScale ?? 1;
      onion.speed = playerSpeed * speedScale;
    }
    return;
  }

  // --------------------------------------------------------
  // 4) Default: RANDOM_MOVE
  // --------------------------------------------------------
  onion.state = ONION_STATE.RANDOM_MOVE;
  setBaseSpeedAndColor(onion);
}



// ==========================================================
// getOnionColor(onion, now)
// ----------------------------------------------------------
// Restituisce il colore corrente della onion.
// Il colore è determinato DALLO STATO della AI.
//
// • RANDOM_MOVE → rosso tomate #ff6347
// • CHASE       → rosso acceso #ff0000
// • COOLDOWN    → arancione #ffa500
//
// L’uso del colore come feedback visivo è intenzionale:
// dà immediatezza arcade al comportamento
// (inseguimento, calma, aggressività).
// ==========================================================
export function getOnionColor(onion) {
  return onion.color;
}
