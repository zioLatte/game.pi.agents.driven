# PI.Onion — ZIO LATTE! Neon Arcade

Gioco arcade 2D in stile retro. Pi-Chan si muove nello schermo, spara proiettili che rimbalzano sui bordi e deve eliminare le Onion prima che lo raggiungano. I livelli ora cambiano shape ad ogni avanzamento, con cicli di forme che ripartono più duri ad ogni giro. Alcune arene ruotano.

Questa guida e' pensata per dare a Codex il quadro completo: dove sta la logica, come fluisce il game loop, quali sono le dipendenze tra moduli e quali parti sono legacy o non integrate.

## Avvio rapido
1) Server locale (HTTP):
```bash
./serve.sh
```
Poi apri `http://127.0.0.1:8080`.

2) In alternativa (stesso risultato):
```bash
python3 -m http.server 8080
```
Poi apri `http://localhost:8080`.

3) HTTPS locale (opzionale, solo se ti serve testare in secure context):
```bash
TLS_CERT=/percorso/cert.pem TLS_KEY=/percorso/key.pem ./serve.sh --https --port 8443
```
Poi apri `https://127.0.0.1:8443`.

Nota: l'audio WebAudio/BGM parte solo dopo un gesto utente (click o tasto).
Nota: `index.html` espone `window.BUILD_VERSION`, usata da `js/loader.js` per versionare `main.js`, i moduli preload, il CSS e gli audio senza usare `Date.now()`.
Nota: `main.js` carica `config/levels.json` con cache-busting per evitare cache del browser.

## Mappa file (entry points e cartelle)
- `index.html` — canvas, HUD, overlay (game over, level up), audio tag, analytics.
- `js/loader.js` — bootstrap: loader iniziale, preload moduli, cache-busting asset, avvio `main.js`.
- `main.js` — entry point runtime: crea engine, aggiorna/disegna, gestisce UI e reset.
- `css/game.css` — stile UI/overlay/loader (prima inline in `index.html`).
- `js/core/` — Engine, Input, LevelManager, Arena, fisica, stato globale.
- `js/entities/` — Player, Onion, Bullet, Explosion.
- `js/ai/` — State machine Onion.
- `js/audio/` — Effetti sonori WebAudio.
- `assets/` — sprite (player, onion).
- `sounds/` — BGM e SFX (vedi `<audio>` in `index.html`).
- `config/levels.json` — configurazione livelli (PI, arena e parametri per livello).
- `css/style.css` — stile legacy non referenziato da `index.html`.

## Flusso runtime (cosa succede a ogni frame)
### Bootstrap
- `index.html` crea canvas + HUD + overlay + audio.
- `js/loader.js` mostra loader, pre-carica moduli JS con `BUILD_VERSION` stabile e mostra Play appena il preload e' pronto.
- `main.js` inizializza DPI canvas, Input, LevelManager, Engine, pre-carica sprite e avvia il loop (timestamp rAF passato a update/draw).

### Update (main.js)
Ordine esatto:
1) Aggiorna tempo di gioco (`state.gameTime`) e HUD.
2) Aggiorna feedback chase (flash onion negli ultimi 3s).
3) `player.update(dt, input, now)`.
4) `onions.update(dt, now)` + rimozione onion morte.
5) Collisione **bullet -> player** (friendly fire): game over immediato.
6) Se non ci sono onion: level up, overlay di start con countdown 10s.
7) Collisione **bullet -> onion**: kill, score, knockback e suono.
8) Collisione **onion -> player** (game over) + separazione cerchi.
9) Collisione **onion -> onion** (separazione cerchi).

### Draw (main.js)
1) Onion.
2) Player (inclusi bullets + explosion).

## Entita' principali
### Player (`js/entities/Player.js`)
- Movimento con input (WASD/frecce).
- Spara proiettili con cooldown (200ms).
- Notifica AI globale via `window.lastPlayerShot` (`window.isShooting` deriva dal delta).
- Gestisce update/draw di Bullet e Explosion.

### Onion (`js/entities/Onion.js`)
- State machine in `OnionAI`.
- Stati: RANDOM_MOVE, CHASE_PICHAN, COOLDOWN.
- Separazione con player/onion in `main.js`.
- Morte con knockback e fade-out.
- Sprite speciale in chase e scalatura dinamica (picco 2x, poi assestamento ~1.3x).
- Saturazione extra solo in chase quando `chaseSpeedScale > 1`.

### Bullet (`js/entities/Bullet.js`)
- Movimento lineare costante (900 px/s).
- Rimbalzi sui bordi dell'arena, max variabile in base al PI.

### Explosion (`js/entities/Explosion.js`)
- Effetto grafico radiale, puro rendering.

## AI delle Onion
File: `js/ai/OnionAI.js`
- Trigger: quando il player spara (entro 150ms) le onion entrano in CHASE.
- CHASE dura 10s, poi COOLDOWN per 3s, poi RANDOM_MOVE.
- Aggiorna velocita' e colore di feedback (rosso #ff0000 / arancione #ffa500 / base #ff6347).

## Fisica e collisioni
File: `js/core/physics.js`
- `resolveCircleCircle` separa cerchi (player/onion/onion).
File: `js/core/Arena.js`
- L'arena e' un poligono convesso usato per contenere player/onion e rimbalzare i proiettili.

## Progressione livelli
File: `js/core/LevelManager.js`
- Ogni avanzamento livello ricostruisce il mondo da zero (player al centro, onion rispawnate ai bordi).
- La difficolta' e' definita da `config/levels.json`, con `piTable` ordinata.
- Ogni entry PI contiene `arenaShape` e una lista `levels` con:
  - `bulletBounces`
  - `onionCount`
  - `onionSpeedScale` (array per onion in RANDOM_MOVE/COOLDOWN).
  - `onionChaseSpeedScale` (array per onion in CHASE).
- I livelli sono assegnati in ordine, scorrendo tutte le liste `levels`.
- Se `onionSpeedScale` o `onionChaseSpeedScale` hanno meno valori di `onionCount`, si usa l'ultimo valore disponibile per le onion restanti.
- La transizione non e' immediata: `main.js` ferma il loop, mostra overlay di livello con progress bar e riparte dopo 10s.

## Audio
- SFX e BGM sono gestiti via `<audio>` in `index.html`.
- BGM gestito in `main.js` con fade: volume base 0.5 (attualmente nessun boost durante chase).

## UI/DOM e overlay
- `#gameover-overlay` mostra score/time e tasti `Continue`/`Play Again`.
- `Continue` e' limitato a 3 usi per sessione (`MAX_CONTINUES`).
- `#level-overlay` mostra info livello + progress bar per 10s.
- `#mobile-warning` blocca il gioco su mobile (warning a schermo).
- `#goto-overlay` mostra tabella livelli; si apre con 3 pressioni di `X` in meno di 800ms.
- La barra chase non e' presente; resta solo il flash delle onion.

## Stato globale e flags (importanti per Codex)
- `state` (`js/core/state.js`): score, onionsKilled, gameTime, ecc.
- Flags globali su `window` usati da OnionAI e UI:
  - `window.isShooting`
  - `window.lastPlayerShot`
  - `window.chaseEndTime`
  - `window.chaseFlashActive`
  - `window.reloadLevelConfig(path)` ricarica `levels.json` e resetta il livello corrente.

## Controlli
- Movimento: WASD o frecce direzionali.
- Sparo: spazio.
- Reset partita: R.
- Pausa: P (toggle gioco + BGM).
- Goto livelli: premi `X` tre volte velocemente per aprire la tabella.

## Asset e file non usati
- `sounds/soundtrack.original.mp3`, `sounds/track.mp3`, `sounds/clock.mp3`, `sounds/orig/bullet.bounce.mp3`, `sounds/soundManagement.osp`: presenti ma non referenziati.
- `assets/*.kra` e `assets/*~`: sorgenti/backup sprite non usati a runtime.
- `css/style.css`: non incluso in `index.html`.

## Note tecniche / gotchas
- DPI: il canvas viene scalato in base a devicePixelRatio (anti "pixeloni").
- Resize/DPI: su resize ricostruisce canvas/background e riallinea world/arena/entita'.
- Mobile: se rilevato, mostra warning e ferma l'engine dopo l'inizializzazione.
- `state.shotsFired` esiste ma non viene incrementato nel codice attuale.
- Lo sfondo dell'arena e' un layer statico disegnato su canvas (gradiente scuro, griglia doppia leggera, noise e glow soft) per profondita' visiva.

## Performance
- Game loop: bind di `Engine.loop` una sola volta, riusato ad ogni frame.
- Timing: timestamp rAF propagato a update/draw e alle onion per evitare `performance.now()` ripetuti.
- Registry onion: `WeakSet` per evitare crescita del registro tra livelli.
- Stats: `games` e `maxLevel` aggiornati solo quando il livello parte davvero (non all'apertura pagina).

## Analytics
`index.html` include Google tag con ID `G-X9DYW1QWK2`.

## Licenze
- Il resto del codice del gioco e' proprieta' del progetto.
