[BUILD INPUT]
- Master Patch Brief received
  `docs/iterations/001/03_master_patch_brief.md`
- Minimal assumptions adopted
  The earliest rotating onboarding stage reached during PI0 first-minute progression is the PI0 `irregular` stage currently using `arenaRotationSpeed: -5`.
  Onion cleanup stays conservative in v1: ring removed, glow reduced, wobble reduced lightly, chase state/sprite distinction preserved.
  No global AI timing change is allowed in v1, so `js/ai/OnionAI.js` was not touched.
  The approved runtime patch was already present in the working tree when this build step started, so the build task for this pass was verification plus report alignment inside the allowed perimeter.

[CODEBASE TARGET]
- files to modify
  `config/levels.json`
  `js/entities/Player.js`
  `js/entities/Bullet.js`
  `js/entities/Onion.js`
  `docs/iterations/001/04_build_report.md`
- current responsibility of each
  `config/levels.json`
  Level-by-level progression tuning including arena rotation.
  `js/entities/Player.js`
  Shot spawn and immediate player feedback.
  `js/entities/Bullet.js`
  Bullet trail and bounce feedback.
  `js/entities/Onion.js`
  Onion chase presentation and feedback.
  `docs/iterations/001/04_build_report.md`
  Build report for this patch.
- files intentionally not touched
  `js/ai/OnionAI.js`
  `main.js`
  `js/core/LevelManager.js`
  `js/core/Arena.js`
  `assets`
  all other files outside the locked v1 minimum scope

[IMPLEMENTATION PLAN]
- 1. Delay the first PI0 onboarding rotation
  purpose: remove early rotation noise without changing progression structure.
  impacted files: `config/levels.json`
  risk: low.
- 2. Reduce player shot feedback density
  purpose: keep recoil/squash feel while making shots less screen-dominant.
  impacted files: `js/entities/Player.js`
  risk: medium.
- 3. Reduce bullet trail and bounce noise
  purpose: keep bullet core/bounce readability while lowering clutter.
  impacted files: `js/entities/Bullet.js`
  risk: medium.
- 4. Apply conservative onion readability cleanup
  purpose: remove the most redundant chase accent first without flattening chase readability.
  impacted files: `js/entities/Onion.js`
  risk: medium.
- 5. Report the applied patch and remaining risks
  purpose: keep the patch auditable and manual-testable.
  impacted files: `docs/iterations/001/04_build_report.md`
  risk: low.

[PATCH]
- FILE:
  `config/levels.json`
  CHANGE TYPE: modify
  WHY:
  Delay the earliest rotating onboarding stage reached in PI0 by making it non-rotating.
  SURGICAL PATCH:
  - BEFORE
    `"arenaShape": "irregular",`
    `"arenaRotationSpeed": -5,`
  - AFTER
    `"arenaShape": "irregular",`
    `"arenaRotationSpeed": 0,`
  - NOTES
    No shape order or other PI values changed.
- FILE:
  `js/entities/Player.js`
  CHANGE TYPE: modify
  WHY:
  Reduce muzzle flash and shot shake, remove per-shot full-screen flash, keep recoil and squash intact.
  SURGICAL PATCH:
  - BEFORE
    `duration: 0.12,`
    `maxRadius: 22,`
    `shadowBlur: 14,`
    `sparkCount: 5,`
    `sparkLength: 12`
    `window.addScreenShake(0.06);`
    `window.triggerGameFlash('rgba(255, 235, 180, 1)', 0.05);`
  - AFTER
    `duration: 0.08,`
    `maxRadius: 16,`
    `shadowBlur: 10,`
    `sparkCount: 3,`
    `sparkLength: 8`
    `window.addScreenShake(0.035);`
  - NOTES
    Recoil and squash values were not changed.
- FILE:
  `js/entities/Bullet.js`
  CHANGE TYPE: modify
  WHY:
  Keep bullets readable while reducing trail clutter and bounce burst intensity.
  SURGICAL PATCH:
  - BEFORE
    `this.maxTrail = 9;`
    `duration: 0.14,`
    `maxRadius: 18,`
    `shadowBlur: 12,`
    `sparkCount: 4,`
    `sparkLength: 10`
    `window.addScreenShake(0.04);`
    `const alpha = this.fade * t * 0.28;`
    `const radius = Math.max(1.4, this.r * (0.45 + t * 0.9));`
  - AFTER
    `this.maxTrail = 6;`
    `duration: 0.1,`
    `maxRadius: 14,`
    `shadowBlur: 8,`
    `sparkCount: 3,`
    `sparkLength: 7`
    `const alpha = this.fade * t * 0.18;`
    `const radius = Math.max(1.2, this.r * (0.4 + t * 0.7));`
  - NOTES
    Bounce event, bounce SFX, and bullet core remain intact. Per-bounce screen shake was removed.
- FILE:
  `js/entities/Onion.js`
  CHANGE TYPE: modify
  WHY:
  Apply the safest v1 onion cleanup: cut the chase ring, reduce glow, reduce wobble lightly, preserve chase readability.
  SURGICAL PATCH:
  - BEFORE
    `const wobble = Math.sin(this.wigglePhase) * 1.6;`
    `const glowAlpha = inChase ? 0.95 : 0.35;`
    `ctx.shadowColor = inChase ? 'rgba(255, 95, 95, 0.9)' : 'rgba(255, 170, 90, 0.45)';`
    `ctx.shadowBlur = inChase ? 16 : 8;`
    chase ring draw block present during chase.
  - AFTER
    `const wobble = Math.sin(this.wigglePhase) * 1.1;`
    `const glowAlpha = inChase ? 0.65 : 0.24;`
    `ctx.shadowColor = inChase ? 'rgba(255, 95, 95, 0.65)' : 'rgba(255, 170, 90, 0.28)';`
    `ctx.shadowBlur = inChase ? 10 : 5;`
    chase ring draw block removed.
  - NOTES
    Chase state, sprite distinction, saturation behavior, and chase-entry scale cue were preserved.

[MANUAL TEST CASES]
- Start at level 1, move and fire around the nearest onion.
  Expected: recoil and light squash still give shot feel; player, bullet path, and nearest onion remain readable together.
- Trigger the first chase in PI0 early levels by shooting repeatedly.
  Expected: chase remains obvious, but the screen is visibly less noisy without the onion ring and shot flash.
- Create bounce-heavy moments against walls in PI0.
  Expected: bullet core and recent ricochet remain trackable; bounce event is still visible, but less dominant.
- Clear PI0 up to the first previously rotating onboarding stage.
  Expected: that stage is now non-rotating; progression still reads through shape and pressure.
- Compare level 1 against PI1 entry.
  Expected: PI1 feels harder because of pressure/progression, not because of increased effect clutter.

[KNOWN RISKS]
- Player shots may feel too soft if muzzle flash and shake were reduced too aggressively.
- Bullet readability may regress if the shorter/lighter trail is not enough to support self-danger reading in bounce-heavy play.
- Onion chase readability may regress if glow reduction plus ring removal removes too much urgency for some players.
- The assumption that PI0 `irregular` is the earliest rotating onboarding stage should be confirmed in real play.
- Manual gameplay validation was not executed in this build step.
- `levels.json` parsed successfully.
- Syntax parsing passed for `js/entities/Player.js`, `js/entities/Bullet.js`, and `js/entities/Onion.js` via `node --experimental-vm-modules`.

[DEFERRED ITEMS]
- Any change to `js/ai/OnionAI.js`
  Out of scope for v1 because it would affect global chase timing.
- Any chase-duration retune
  Explicitly deferred by the master brief.
- Any further onion cuts to saturation or chase scale
  Deferred until v1 human testing proves they are necessary.
- Any wider rotation tuning beyond the earliest PI0 onboarding rotation
  Deferred to keep the patch minimal and reversible.

[BUILD STATUS]
- PARTIAL
- reason
  The approved v1 minimum patch is present in the exact allowed scope and lightweight verification passed, but manual gameplay validation has not been executed yet, so this build step cannot be marked as complete success.
