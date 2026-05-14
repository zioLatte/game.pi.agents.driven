# Speed Dot - Orchestrator Plan

Thread id: `004-speed-dot-contested-powerup`
Canonical state file: `.agents/threads/004-speed-dot-contested-powerup/state.json`
Structured log file: `.agents/threads/004-speed-dot-contested-powerup/log.jsonl`

## Lettura del requisito

Introdurre un power-up neutro singleton, raccoglibile da Pi-chan o da una onion. Il soggetto che lo raccoglie riceve lo stesso boost temporaneo di velocita'; il dot viene consumato immediatamente e non puo' essere raccolto due volte nello stesso ciclo di vita.

Il dot e' conteso: quando e' attivo, esattamente una onion non in chase, la piu' vicina al dot, puo' puntarlo come target temporaneo. Le onion in `CHASE_PICHAN` non devono mai lasciare Pi-chan per il dot. Se la onion assegnata entra in chase, perde il target; se il dot e' ancora attivo, il target viene riassegnato alla nuova onion non in chase piu' vicina. V1: massimo un dot, niente stack boost, niente onion aggregation, niente HP, niente big onion, niente scoring/UI numerica.

## Source of truth rilevate

- Arena: `js/core/Arena.js` contiene poligono arena e `constrainCircle(...)`; `main.js:966-1035` usa l'arena per clip e draw.
- Livelli/config: `config/levels.json:1-80` contiene wave statiche con `maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, `onionSpeedScale`, `onionChaseSpeedScale`; `js/core/LevelManager.js:30-58` indicizza la config.
- Wave/entity ownership: `js/core/LevelManager.js:15-19` conserva `player`, `onions`, `arena`, `waveState`; `js/core/LevelManager.js:78-109` costruisce livello, player, arena e initial onion; `js/core/LevelManager.js:180-205` aggiorna spawn queue.
- Onion creation/tuning: `js/core/LevelManager.js:245-291` crea le onion e assegna arena, speed scale, chase scale e dodge.
- Main loop: `main.js:765-952` aggiorna input, player, onion, wave, collisioni e level completion. `js/core/Engine.js` passa `dt` e timestamp `now` al loop.
- Pi-chan movement: `js/entities/Player.js:16-19` inizializza `speed`; `js/entities/Player.js:79-153` applica movimento e constrain arena; `js/entities/Player.js:155-226` calcola bullet speed da `this.speed`.
- Onion movement/chase: `js/entities/Onion.js:21-23` inizializza speed; `js/entities/Onion.js:185-251` aggiorna AI e movimento; `js/entities/Onion.js:253-288` gestisce random move; `js/entities/Onion.js:290-321` gestisce chase.
- Chase state: `js/ai/OnionAI.js:46-54` definisce stati e timer; `js/ai/OnionAI.js:56-78` entra/esce da chase e ricalcola speed; `js/ai/OnionAI.js:132-186` aggiorna stati.
- Collisioni: `main.js:819-838` bullet/player, `main.js:854-903` bullet/onion, `main.js:905-931` onion/player, `main.js:933-952` onion/onion; `js/core/physics.js` espone solo separazione cerchio/cerchio.
- Rendering: `main.js:961-1046` disegna arena, onion e player; `js/entities/Onion.js:340-377` disegna onion; `js/entities/Player.js:228-255` disegna player/bullets/explosions; `js/entities/Bullet.js` mostra un pattern semplice per entita' circolare con trail.
- Pattern temporanei/power-up: non esiste un sistema power-up. Pattern disponibili: timers via `dt`/`now`, speed mutata in `Player`/`Onion`, feedback visuale in draw, effetti `Explosion` gia' usati per colpi/kill.

## Impatto previsto

| Sistema | File probabile | Tipo di modifica | Rischio | Motivo |
|---|---|---:|---:|---|
| Speed Dot lifecycle/config | `js/core/LevelManager.js` | aggiungere stato singleton dot, spawn/respawn timer, reset su `loadLevel` | medio | `LevelManager` gia' resetta livello e possiede world/arena/player/onions |
| Config tuning | `config/levels.json` | aggiungere parametri v1 opzionali o top-level default | basso | valori prototipo devono essere modificabili senza hardcoding diffuso |
| Main loop integration | `main.js` | chiamare update dot, collisioni pickup, draw dot | medio | ordine collisioni e consumo unico devono evitare doppio pickup |
| Pi-chan boost | `js/entities/Player.js` | campi/metodi minimi per boost temporaneo e feedback | medio | `Player.speed` alimenta movimento e bullet speed; reset deve essere robusto |
| Onion boost + dot targeting movement | `js/entities/Onion.js` | campi/metodi minimi per boost, target dot in non-chase, feedback | alto | chase/random movement sono nello stesso update; non rompere chase |
| Onion state eligibility | `js/ai/OnionAI.js` | preferibilmente solo import/lettura di `ONION_STATE`, nessuna modifica; se serve, helper exported | medio | toccare AI aumenta blast radius; evitare se `Onion.js` puo' leggere lo stato gia' importato |
| Collision helper | `main.js` o `js/core/physics.js` | preferire local helper distanza in `main.js`; evitare utility generica se non necessaria | basso | pickup e' un semplice circle overlap |
| Rendering feedback | `main.js`, `Player.js`, `Onion.js` | dot visivo, glow boost soggetto | medio | feedback deve essere leggibile senza nuovi asset |
| Assets/CSS/UI | nessuno in v1 | non modificare | basso | richiesto niente nuova UI/asset; canvas draw sufficiente |

## Decisioni tecniche proposte

- Lifecycle Speed Dot: mantenere uno stato singleton per livello, non globale di partita: `active`, `x`, `y`, `r`, `spawnedAt`, `nextSpawnAt`, `targetOnion`. Lo stato deve resettarsi in `loadLevel`/`clearLevel` insieme alla wave.
- Spawn/respawn: primo spawn randomizzato dopo 5-8s dalla costruzione livello; respawn 6-10s dopo pickup. V1 puo' usare default da config con fallback hardcoded in `LevelManager`, ma senza aggiungere un sistema generico di power-up.
- Posizionamento: spawn dentro arena usando `Arena.constrainCircle(...)` sul candidato; evitare spawn troppo vicino a player/onion solo se il gameplay-programmer lo giustifica con una soglia piccola e verificabile. Non introdurre pathfinding.
- Targeting onion: ogni frame o ad ogni cambio rilevante, se dot attivo selezionare tra onion `alive && !dying && state !== ONION_STATE.CHASE_PICHAN`. Assegnare solo la piu' vicina. Pulire il target se entra in chase o muore; riassegnare se dot resta attivo.
- Movimento onion verso dot: in `Onion.js`, prima del random move ma dopo `updateOnionAI(...)`, se onion e' assegnata al dot e non e' in chase, muoversi sull'asse dominante verso il dot riusando `currentDirection`, `#setVelocityFromDirection()` e `#applyArenaConstraint(...)`. Se passa in chase, non eseguire movimento dot.
- Boost temporaneo: aggiungere un piccolo contratto comune su Player/Onion, es. `applySpeedBoost(multiplier, durationMs, now)` e `updateSpeedBoost(now)`, senza base class. Non stackare: se gia' boostato, refresh esplicito vietato o durata sovrascritta solo sullo stesso soggetto dopo nuovo lifecycle dot; v1 puo' ignorare pickup quando `speedBoostUntil > now` per rispettare no-stack.
- Reset velocita': non salvare solo `speed` corrente come base se il soggetto puo' essere in chase. Per Pi-chan usare `baseSpeed`; per onion usare `speedScale`, `chaseSpeedScale`, player speed e stato corrente. Il boost deve essere un moltiplicatore finale calcolato sopra la velocita' normale corrente, non una mutazione permanente che AI sovrascrive o lascia sporca.
- Feedback visivo: Speed Dot disegnato in canvas come cerchio piccolo luminoso. Soggetto boostato: glow/saturazione/ring leggero in `Player.draw` e `Onion.draw`. Niente HUD numerico, niente asset.
- Config iniziale: `speedDot.enabled: true`, `maxActive: 1`, `boostDurationMs: 3000`, `boostSpeedMultiplier: 1.35`, `firstSpawnDelayMsRange: [5000, 8000]`, `respawnDelayMsRange: [6000, 10000]`, `onionCandidateLimit: 1`. Se il gameplay-programmer ritiene invasivo modificare `levels.json`, usare default statici in `LevelManager` e rimandare config al thread tuning.

## Thread operativi consigliati

### Thread 1: modello dati/config/lifecycle Speed Dot

- Goal: creare stato singleton del dot, reset su livello, spawn/respawn e API minima per `main.js`.
- File coinvolti: `js/core/LevelManager.js`, `config/levels.json` solo se la config viene approvata.
- Cosa modificare: aggiungere `speedDotState`; parser config opzionale; metodi tipo `updateSpeedDot(now)`, `consumeSpeedDot()`, `getSpeedDot()`.
- Cosa non modificare: `Onion.js`, `Player.js`, `main.js` oltre eventuale chiamata placeholder se il thread resta solo lifecycle; niente UI/asset.
- Acceptance criteria: un solo dot attivo; reset su level change; primo spawn e respawn rispettano range; nessun dot se disabilitato.
- Rischi: spawn fuori arena, stato stale dopo `resetGame`, config non retrocompatibile.
- Verifiche: JSON parse se `config/levels.json` cambia; syntax check `LevelManager.js`; manuale con log/debug temporaneo solo se rimosso prima del build finale.

### Thread 2: collisioni e boost temporaneo

- Goal: pickup da Pi-chan o onion con consumo unico e boost simmetrico.
- File coinvolti: `main.js`, `js/entities/Player.js`, `js/entities/Onion.js`.
- Cosa modificare: circle overlap dot/player e dot/onion; `applySpeedBoost`/timer; consumo atomico del dot.
- Cosa non modificare: scoring, bullets, wave completion, audio, network.
- Acceptance criteria: Pi-chan e onion ricevono stesso durata/moltiplicatore; dot sparisce subito; nessun doppio pickup nello stesso lifecycle; speed torna normale.
- Rischi: bullet speed di Pi-chan aumenta se legata a `this.speed`; da accettare solo se dichiarato o mitigato nel piano tecnico. Onion chase puo' sovrascrivere speed se il boost non e' moltiplicatore finale.
- Verifiche: manuale pickup Pi-chan/onion; boost scade; collisione simultanea decide un solo vincitore con ordine documentato.

### Thread 3: onion targeting verso dot

- Goal: selezionare e muovere una sola onion non in chase verso il dot.
- File coinvolti: `js/core/LevelManager.js`, `js/entities/Onion.js`, eventualmente `main.js`.
- Cosa modificare: candidate selection; campi target dot per onion; perdita target quando `state === ONION_STATE.CHASE_PICHAN`.
- Cosa non modificare: chase trigger/durata/cooldown in `OnionAI.js` salvo motivazione esplicita; niente nuove enemy variants.
- Acceptance criteria: solo onion non in chase piu' vicina punta dot; onion in chase resta su Pi-chan; riassegnazione dopo chase/death; nessuna onion candidate quando tutte in chase.
- Rischi: oscillazione target ogni frame se distanze simili; collisioni onion/onion possono spostare la candidate; AI dodge potrebbe competere con dot targeting.
- Verifiche: manuale con 2-3 onion, sparo per mandare candidate in chase, osservare riassegnazione.

### Thread 4: rendering/feedback visivo

- Goal: rendere leggibile dot attivo e soggetto boostato senza nuove UI numeriche.
- File coinvolti: `main.js`, `js/entities/Player.js`, `js/entities/Onion.js`.
- Cosa modificare: draw dot canvas; glow/ring/saturazione quando `isSpeedBoosted`.
- Cosa non modificare: `assets/**`, `css/**`, HUD, overlay.
- Acceptance criteria: player vede il dot; player/onion boostati sono riconoscibili; chase onion resta leggibile e non confusa col boost.
- Rischi: feedback boost onion in chase puo' confondersi col feedback chase rosso.
- Verifiche: browser visual check desktop/mobile, dot visibile su arena scura, nessun overlap UI.

### Thread 5: tuning e regression check

- Goal: consolidare config v1 e validazioni finali.
- File coinvolti: `config/levels.json`, file runtime effettivamente toccati.
- Cosa modificare: tuning range solo se gameplay test lo richiede; build report.
- Cosa non modificare: scoring, combo, HP, big onion, enemy variants, audio.
- Acceptance criteria: feature soddisfa tutti i criteria; nessuna regressione wave cap/completion; gameplay base invariato.
- Rischi: dot aumenta troppo la pressione nei wave cap 3; boost player altera ritmo shooting se bullet speed scala con player speed.
- Verifiche: static checks, browser checklist completa, PHPMD non applicabile se resta assente codice PHP/config PHPMD.

## Backward compatibility e call site

- `LevelManager.getLevelConfig(...)` e `getBaseLevelConfig(...)` sono usati da overlay/goto e wave. Nuovi campi devono essere opzionali e non cambiare i campi esistenti (`maxAliveOnions`, `totalOnions`, `spawnIntervalMs`, speed/chase scale, `bulletBounces`).
- `LevelManager.getOnions()` ritorna l'array usato da `main.js` per update/draw/collisioni. Non sostituire con un nuovo owner separato.
- `main.js` usa la variabile locale `onions` e poi riallinea con `levelManager.getOnions()` dopo `updateWave`. Qualsiasi dot targeting deve usare la lista corrente dopo cleanup o documentare l'ordine.
- `Player.speed` oggi guida movimento e bullet speed (`Player.js:121`, `Player.js:172`). Il boost puo' impattare anche bullet velocity: rischio da decidere esplicitamente nel piano tecnico, non lasciarlo accidentale.
- `OnionAI` ricalcola `onion.speed` in base a stato e player speed (`OnionAI.js:56-78`, `132-186`), mentre `Onion.js` ricalcola chase speed a ogni frame (`Onion.js:238-241`). Un boost implementato come assegnazione diretta a `speed` rischia di essere perso o di sporcare il reset.
- `Onion.js` importa gia' `ONION_STATE`; il targeting puo' leggere lo stato senza modificare `OnionAI.js`.
- `Arena.constrainCircle(...)` e' stabile e puo' essere riusata per dot spawn, ma non esiste collision query genericamente "inside"; non creare refactor fisico ampio.
- `README.md` e `docs/` sono parzialmente stale rispetto al wave model corrente. Per questo thread la source of truth e' il codice reale piu' contratti, non la mappa storica.

## Test e validazioni

### Test manuali

- Avviare `./serve.sh`, aprire `http://127.0.0.1:8080`, Wave 1. Expected: nessun crash, un solo Speed Dot dopo 5-8s.
- Raccogliere dot con Pi-chan. Expected: dot scompare, Pi-chan accelera per circa 3s, feedback visivo attivo, poi velocita' normale.
- Lasciare dot a una onion non in chase. Expected: solo la onion piu' vicina punta il dot, le altre continuano normale.
- Far raggiungere dot alla onion assegnata. Expected: dot scompare, quella onion ha stesso boost durata/moltiplicatore di Pi-chan.
- Sparare mentre una onion e' candidata al dot. Expected: se entra in chase, perde target dot e torna a inseguire Pi-chan; se dot resta, nuova candidate non in chase viene selezionata.
- Portare tutte le onion in chase mentre dot attivo. Expected: nessuna onion punta il dot; Pi-chan puo' ancora raccoglierlo.
- Creare collisione quasi simultanea Pi-chan/onion sul dot. Expected: un solo soggetto riceve boost, dot consumato una volta.
- Aspettare fine boost. Expected: velocita' normale ripristinata per Pi-chan e onion; nessuno stack visibile.
- Completare Wave 1/2. Expected: wave cap/completion/rest spawn invariati.
- Usare `R`, Continue e goto. Expected: dot/timer/boost non restano sporchi dopo reset/level change.

### Test automatici/opportuni

- Se vengono creati helper puri per range spawn/candidate nearest/circle overlap, testarli via piccolo script Node solo se il repo accetta file test o comando temporaneo non committato.
- In assenza di test runner e `package.json`, non introdurre framework test.

### Comandi

- `node -e "JSON.parse(require('fs').readFileSync('config/levels.json','utf8')); console.log('levels json ok')"` se cambia `config/levels.json`.
- `node --input-type=module --check < main.js` se cambia `main.js`.
- `node --input-type=module --check < js/core/LevelManager.js` se cambia `LevelManager.js`.
- `node --input-type=module --check < js/entities/Player.js` se cambia `Player.js`.
- `node --input-type=module --check < js/entities/Onion.js` se cambia `Onion.js`.
- `node --input-type=module --check < js/ai/OnionAI.js` solo se viene toccato.
- PHPMD: non applicabile al repo corrente; `find . -maxdepth 3 \( -name '*.php' -o -name 'composer.json' -o -name 'phpmd.*' \)` non ha rilevato file PHP/config PHPMD.

Expected result: tutti i check statici passano; browser checklist senza regressioni wave/collisioni/rendering.

## Domande bloccanti

Nessuna domanda bloccante.

Assunzioni reversibili:

- Speed Dot v1 e' abilitato per tutte le wave salvo decisione successiva di tuning.
- Il dot viene disegnato in canvas senza asset.
- La simmetria boost riguarda durata e moltiplicatore. L'eventuale effetto collaterale su bullet speed di Pi-chan deve essere deciso dal gameplay-programmer prima della build.

## Current Snapshot

- Status: `DONE`
- Current owner: `task-orchestrator`
- Last completed owner: `review-maintainability-guard`
- Expected handoff owner: `none`
- Last updated at: `2026-05-11 19:36 CEST`
- Resolved at: `2026-05-11 19:36 CEST`

## Orchestrator Receipt - LOG-003

LOG-002 gameplay-programmer is accepted as the implementation spec for review.

Canonical decisions:

- Route next to `impact-regression-guard`.
- No code implementation is approved.
- No build is approved.
- Speed Dot v1 remains singleton, no-stack, one onion candidate.
- Pi-chan boost affects movement only and must not increase bullet speed.
- Allowed runtime files for review/build planning: `main.js`, `js/core/LevelManager.js`, `js/entities/Player.js`, `js/entities/Onion.js`.
- Optional file: `config/levels.json`, only for one top-level optional `speedDot` tuning object if approved.
- Forbidden: `js/ai/OnionAI.js` unless task-orchestrator explicitly reopens it; also `Bullet.js`, `Engine.js`, `Arena.js`, `physics.js`, assets, sounds, CSS, UI/services/network/app files, README/docs except final workflow/build artifacts.

Impact-regression-guard must verify LOG-002 before any build approval:

- pickup ordering does not mask bullet/player game over;
- wave cap/budget/cadence/completion remain unchanged;
- Player movement boost cannot affect bullet speed or OnionAI speed through `player.speed`;
- Onion boost survives OnionAI speed recomputation as a final movement multiplier;
- assigned onion cannot target dot while in `CHASE_PICHAN`;
- atomic consume prevents double pickup;
- reset/Continue/goto/level transition clear dot, target, and boost state;
- manual tests and static validations are sufficient for build gate.

## Orchestrator Receipt - LOG-005

LOG-004 impact-regression-guard is accepted as the build gate approval.

Canonical decisions:

- Route next to `build-agent`.
- Build is approved only inside:
  - `main.js`
  - `js/core/LevelManager.js`
  - `js/entities/Player.js`
  - `js/entities/Onion.js`
- Optional file: `config/levels.json`, only for one top-level optional `speedDot` tuning object with backward-compatible defaults.
- Forbidden: `js/ai/OnionAI.js` unless task-orchestrator explicitly reopens it; also `Bullet.js`, `Engine.js`, `Arena.js`, `physics.js`, assets, sounds, CSS, UI/services/network/app files, README/docs except workflow/build artifacts.
- Pi-chan boost must not mutate `Player.speed`; bullet speed and OnionAI speed through `player.speed` must remain baseline.
- Onion boost must be a final movement multiplier over current normal/chase movement, not a one-time `onion.speed` mutation.
- Speed Dot consume must be atomic and must not consume a dot without applying a boost.
- Reset, Continue, goto, config reload, and level transition must clear active dot, target references, and boost state.
- Wave cap, total budget, spawn cadence, completion, scoring, bullet behavior, runtime arena behavior, assets, HUD, audio, and services remain unchanged.

Build-agent must produce:

- code changes only in approved files;
- build report in log with changed files, validations run, manual tests run or not run with reason;
- `status_proposal: BUILD_DONE` and `next_owner: task-orchestrator`, or `NEEDS_REWORK/BLOCKED` with concrete blocker.

## Orchestrator Receipt - LOG-007

LOG-006 build-agent report is accepted as `BUILD_DONE` for review.

Build report summary:

- Changed runtime files: `main.js`, `js/core/LevelManager.js`, `js/entities/Player.js`, `js/entities/Onion.js`.
- No `config/levels.json` change.
- No forbidden runtime file detected in the scoped diff.
- Static validations reported PASS:
  - `node --input-type=module --check < main.js`
  - `node --input-type=module --check < js/core/LevelManager.js`
  - `node --input-type=module --check < js/entities/Player.js`
  - `node --input-type=module --check < js/entities/Onion.js`
  - `git diff --check -- main.js js/core/LevelManager.js js/entities/Player.js js/entities/Onion.js`
- Server smoke reported PASS on `127.0.0.1:8091`.
- Browser gameplay checklist was not executed.

Review focus:

- Verify implementation scope against LOG-005 approved files and forbidden files.
- Verify `Player.speed` remains baseline and Speed Dot does not alter bullet speed or OnionAI speed through `player.speed`.
- Verify onion boost is a final movement multiplier across random, dot-target, and chase movement.
- Verify consume behavior is atomic and no dot is consumed without boost application.
- Review residual risk from LOG-006: if nearest overlapping collector is already boosted, dot remains active instead of selecting another candidate.
- Verify reset/Continue/goto/config reload/level transition cleanup.
- Verify wave cap, budget, cadence, completion, scoring, bullets, arena behavior, assets, CSS, audio, and services are unchanged.
- Decide whether skipped browser gameplay checklist requires validation-only rework before final DONE.

## Handoff

Next owner: `none`

Required output: none. Task closed.

## Orchestrator Receipt - LOG-008

Human prompt supplied review-maintainability-guard verdict: `APPROVE_WITH_NOTES`.

DONE gate:

- Build report present: yes, LOG-006.
- Diff scope respected: yes, scoped runtime diff is `main.js`, `js/core/LevelManager.js`, `js/entities/Player.js`, `js/entities/Onion.js`.
- Forbidden runtime files touched: no scoped forbidden diff detected.
- Static validation recorded: yes, LOG-006 reports syntax checks for all changed JS files and `git diff --check` PASS.
- Server smoke recorded: yes, LOG-006.
- Manual/browser validation: not executed; accepted as residual note under `APPROVE_WITH_NOTES`.
- Review verdict: `APPROVE_WITH_NOTES`.
- `solution_applied`: recorded in state and summary.

Residual notes:

- Browser gameplay checklist was not executed.
- If the nearest pickup winner is already boosted, the dot remains active instead of selecting another candidate.

## Solution Applied

- Speed Dot v1 implemented in approved runtime files:
  - `main.js`
  - `js/core/LevelManager.js`
  - `js/entities/Player.js`
  - `js/entities/Onion.js`
- LevelManager owns singleton Speed Dot lifecycle, default tuning, spawn/respawn, target assignment, target cleanup, and atomic consume.
- main.js integrates Speed Dot update, pickup resolution, and canvas draw in the existing loop.
- Player boost is movement-only; `Player.speed` remains baseline for bullet speed and OnionAI speed through `player.speed`.
- Onion boost is a final movement multiplier; chase remains dominant over dot targeting.
- No config, OnionAI, Bullet, Engine, Arena, physics, asset, sound, CSS, UI/service/network/app, README, or docs runtime changes were accepted.
- Task closed `DONE` with `APPROVE_WITH_NOTES`.
