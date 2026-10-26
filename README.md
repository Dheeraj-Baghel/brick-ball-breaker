# Brick Ball Breaker

Independent dependency-free canvas game with a 30-level campaign, ten existing
power-ups and five fully integrated game modes.

## GitHub publication — 26 October 2026

**[Play Brick & Ball](https://dheeraj-baghel.github.io/brick-ball-breaker/)**
is live on GitHub Pages, with source in
[the dedicated public repository](https://github.com/Dheeraj-Baghel/brick-ball-breaker).
Clean-clone installation/build and **83 unit tests, 13 local production browser
checks and 9 live-site Chromium checks pass**. Every one of the 19 hosted application
files matches the production build byte-for-byte; desktop/mobile renders inspected.
No gameplay changes were made for publication. Physical devices, other browsers,
human audio quality and assistive-technology review remain manual.

See [deployment and safe updates](DEPLOYMENT.md). Use Node.js 24 for builds;
`npm ci && npm run verify` runs the unit gate and creates the static build.
`npm run deploy:pages` explicitly publishes verified output to the Pages branch;
pushing `main` alone does not update the live game.

Current progress, achievements, cosmetics and settings persist in browser-local
storage (Checkpoint 11 supersedes earlier session-only notes below). No account,
cloud sync or backend. Localhost saves are separate from hosted saves.

Historical checkpoint notes below describe verification at that time. Generated
screenshots, reports and source-backup archives remain local and are intentionally
excluded from GitHub; historical artifact links only resolve in the original
workspace. Browser checkpoint tests use optional workspace Playwright/axe tooling;
unit tests and production builds are dependency-free and work in a clean clone.

## Checkpoint 12 — accessibility, responsiveness and input

**Audit first.** `tests/audit12.mjs` measured the running game at all seven required
sizes and found real defects: the arena rendered **below the viewport** at 5 of 7 sizes
(939px bottom vs 900 on desktop, 755 vs 390 in landscape), 8–9 text elements under 10px,
no dialog semantics, no live region, and no safe-area handling.

**Responsive arena.** `.arena` now uses `aspect-ratio:800/560` with its width derived from
the height left by the surrounding chrome, measured in `fitArena()` and refreshed on
resize, `orientationchange`, `visualViewport` resize, screen changes and whenever the HUD
row count changes. The 800×560 logical physics space is untouched — only the CSS box
scales, so collisions, speed and coordinates are unchanged. Portrait phones give the arena
full width; short landscape collapses decorative chrome and puts active abilities in one
scrollable row.

**Touch.** `input.js` stays Pointer-Events-only, so a tap can never be handled twice.
Secondary fingers are ignored while a pointer is active, pointer positions are clamped so a
finger dragged off-canvas parks the paddle at the edge rather than jumping, and non-mouse
releases clear the hover position. `touch-action:manipulation` on controls stops
double-tap zoom; page scrolling outside the canvas is untouched.

**Keyboard.** Escape is layered: it closes the reset confirmation, then settings, and only
pauses when nothing dismissible is open — verified not to pause while settings are open.
Escape on a focused control belongs to that control. Space on a focused button activates it
without launching the ball. Focus moves into the settings panel and the reset confirmation
on open and returns to the opener on close.

**Semantics.** The overlay is a labelled `role="dialog" aria-modal="true"`; the reset
confirmation is a named dialog with a heading; the canvas is a described `role="application"`
with its controls listed; HUD numbers carry label associations; the hero illustration is
decorative; and a dedicated polite live region announces only level complete, game over,
life lost, extra life, barrier rescue and multi-ball — never score, ball or timer churn.

**Contrast and readability.** All sub-10px type was raised to a 10px floor, and `--muted`
and `--olive` were darkened (`#5C5D53`, `#586340`) after axe found real 4.37–4.39:1 text on
ivory. Entrance animations now start at 0.85 opacity instead of 0 so text is never rendered
mid-fade against a blended background.

**Verification.** 83 unit tests and 14 browser suites pass. `node tests/checkpoint12.mjs`
asserts, on the running game: zero horizontal overflow, preserved 800:560 ratio, arena fully
visible, no clipped controls, no sub-10px text and no undersized controls at all seven
viewports in the densest HUD state; resize and rotation during play preserving level, score,
wall, ball speed, logical bounds and paddle clamping; emulated-phone tap-launch, drag,
multi-touch rejection, off-canvas release, sticky release, Fire button and slider safety;
keyboard movement, pause/resume, Space/button separation, Escape layering and focus restore;
reduced motion persisting, suppressing particles while collisions still register, and
power-ups surviving a resize; and **zero WCAG 2.2 A/AA violations across 24 axe scans**
(8 surfaces × 3 viewports). Layouts were inspected visually, not just asserted.

Gameplay, rendering, audio, save and progression sources are byte-identical to the backup;
only `input.js`, `main.js`, `styles.css` and `index.html` changed.

Limits: all mobile testing used Chromium device emulation — **no physical device was
tested**. Safari/Firefox, real screen readers and hardware notches remain unverified. Two
suites needed a retry due to an intermittent local static-server stall (a test-fixture
issue, not a game defect).

## Checkpoint 11 — save system, persistence and settings

**Save service (`src/storage.js`).** One centralized, versioned writer (`version: 3`,
key `brick-ball-breaker/save`) over the existing `createCampaign` / `createModeState` /
`createProfile` factories plus preferences. `main.js` is the only caller, so no component
writes a competing copy. `localStorage` appears nowhere else in `src/`.

Persisted: levels unlocked and highest reached, per-level completion/stars/best score/best
time, lifetime score and bricks, achievements, cosmetic unlocks and selections, medals,
Endless/Time Attack/Hardcore bests, Challenge records, and preferences (master, effects
and music volume, mute, reduced effects). Reward rules are unchanged — only the existing
values are stored.

**Active run is deliberately not resumed.** Balls, effects, timers and pooled particles are
live runtime objects; restoring mid-flight risks an inconsistent state. On load the player
lands on a clean, valid screen with all permanent progression intact.

**Integrity.** Every field is validated on load and before write: values clamp to range,
unknown level/challenge ids and achievement ids are dropped, locked cosmetics fall back to
defaults, and a completed level always implies a reachable unlock. A malformed payload is
sanitized rather than written over a good save. Corrupt JSON, a newer-version file and
missing storage all fall back to defaults without throwing. v1/v2 saves migrate forward.
Routine churn (volume drags) is debounced at 400 ms; level results, achievements, cosmetic
changes, mute and motion toggles flush immediately. Nothing is written per frame.

**Settings screen.** Reworked in the existing warm palette using the established open,
ruled-group layout: mute, master/effects/music volume with live preview, reduced effects,
real control instructions, and a save-status line. Master volume scales output without
overwriting the individual effects/music preferences. **Reset settings** and **Reset
progress** are separate; the destructive path needs an explicit checkbox before its final
button enables, and it preserves preferences.

**Verification.** 83 unit tests (11 new storage tests) and all 13 browser suites pass.
`node tests/checkpoint11.mjs` covers, in a real browser: level completion surviving reload;
achievements and lifetime stats surviving reload; restored unlocks appearing in the campaign
menu; preferences persisting and applying to the audio engine and reduced-effects class on
boot; master volume preserving sub-volumes; reset settings keeping progress; the gated reset
flow (a forced click on the disabled button changed nothing) keeping settings and returning
to a valid screen; corrupt JSON recovery; v1 migration and rewrite at version 3; a
newer-version file ignored; hostile values sanitized; `?storage=off` staying fully playable
with an explanatory status and no writes; a lower Endless score not lowering the best;
challenge/mode records staying independent of campaign; restart and menu navigation
preserving records; 120 gameplay frames producing no writes; and no save-induced stutter
(59–60 FPS, 0–1 frames >33 ms). Mobile settings layout checked at 390×844.

Gameplay, audio, rendering and art sources are byte-identical to the pre-checkpoint backup.

Fixed during testing: the save status read "Ready to save" when a previous session's file
had loaded; the skip link could overlap a settings row. Also repaired three older browser
tests that raced module load (fixed waits replaced with a harness wait).

Limits: settings are per-browser-profile and not synced; there is no export/import or
cloud backup; private-mode quota limits are handled but not reproduced on real devices;
resume-mid-run is intentionally absent; audible audio and physical devices remain unverified.

## Checkpoint 10 — audio, animation refinement and performance

**Audio (`src/audio.js`).** Procedural Web Audio only (no sample files). 25 cues: paddle,
wall, hit, crack, break, boom, pickup, life, multi, laser, zap, stick, release, magnet,
fire, pierce, barrier, rescue, multiplier, expire, complete, lose, gameover, achievement,
ui. Plus a quiet four-chord ambient pad that plays only while aiming/playing and stops on
pause, results, menus and hidden tabs. A state observer diffs the authoritative game
each frame, so cues only fire for real events. Overlap control: a per-cue minimum gap
(25–800 ms), a 10-voice cap and a master compressor. The AudioContext is created on the
first pointer/key gesture, suspended when hidden and closed on pagehide.

**Settings.** The new Settings panel has mute, separate effects/music volume and
**Reduced effects**. The header Sound toggle mirrors mute. Settings are session-only.
Reduced effects (or the OS preference) removes particles, trails, impact rings and
CSS motion. Critical feedback stays visible as text: life, rescue and multi-ball
callouts and HUD flashes.

**Animation/feedback (`src/render.js`).** Effects run on a renderer clock that freezes on
pause and clamps tab-return gaps, so nothing fast-forwards. Distinct real-state responses:
multi-hit chips, explosive ring plus debris, bonus ring, laser impact sparks, pickup ring
and name callout, Extra Life ring, consumed-Barrier sweep, teal rims on extra balls,
and a Fireball ivory core that keeps the position readable. Life/loss pulses animate
the HUD. The redundant life-loss text no longer appears under Game over.

**Performance.** Fixed 96-slot particle pool allocated once per game; the oldest slot is
recycled. Fixed-size Float32 trail rings, no per-frame trail arrays. Off-arena particles
are culled. The canvas backing store is reallocated only when DPR changes. A single
guarded rAF loop skips simulation entirely while paused.

**Verification** (`node tests/checkpoint10.mjs`, headless Chromium): all 24 gameplay cues
observed from real events (the 25th, `ui`, fires on volume changes); 50 same-frame hits
→ 1 voice; settings round-trip; Esc closes settings; reduced effects spawns zero
particles while audio feedback remains. The pool peaked at exactly 96 while clearing
level 26 with Multi-ball. Pause freezes state; a hidden tab auto-pauses, and returning
does not teleport the ball. Resize preserves the 800:560 ratio. Five restarts leave one
loop (60 callbacks/s). 30/60/144 fps produce identical ball paths. 25 intense restarts
kept heap at ~10 MB. Intense-scene samples across runs: **58.3–60.0 FPS, median
16.7 ms, p95 16.8 ms, 0–2 frames >33 ms of 300**.

Also passing: 72 unit tests and 11 existing browser suites. Updated stale selectors in
lifecycle, brick-types, campaign and powerups tests after the Checkpoint 8/9A UI
changes. A baseline comparison showed three of these already failed before this
checkpoint. Gameplay sources are byte-identical to the pre-Checkpoint 10 backup.

Limits: audio was verified by cue counts and voice accounting, not audible listening.
Headless host timing is not real-device data. Physical touch, Safari/Firefox and
low-power GPUs are unchecked. Settings are not persisted.

## Checkpoint 9A — Warm Tactile Arcade

Presentation-only redesign: warm ivory and matte charcoal, editorial serif/system
sans typography, open mode index, circular campaign markers, ruled achievement
collection and tactile cosmetic swatches. No repetitive card grid UI, neon, bloom
or glass. All existing screens were reviewed: menus, progression, challenge
selection, collection, cosmetics, aiming/gameplay, active abilities, pause,
completion/rewards, game over, timeout and challenge failure.

Canvas now renders six enamel brick materials with health pips/cracks, ceramic
balls with restrained chalk trails, a detailed ivory paddle, quiet cached grain,
brief hit compression and bounded debris. All ten existing abilities have original
vector icons, matte collectible stamps, rarity framing and compact actual-state
indicators (duration, charges, Laser cooldown and multiball count). Existing audio
toggle stays; reduced-motion disables decorative motion. No fake settings screen.
The historical cosmetic 'violet' ID is displayed as a warm Clay streak; locks and
physics are unchanged. The original power-up registry was not edited.

[Design audit and evidence](DESIGN.md) includes the executed plan, scope proof and
remaining checks. [Asset manifest](asset-manifest.json) records original local SVG,
Canvas icons and procedural surfaces; no external assets, fonts or dependencies.
The first source state is archived beside baseline screenshots before editing.
SHA-256 comparisons confirm unchanged physics/input, brick rules, scoring/rewards,
power-up rules, campaign and mode data/runtime source.

Verification: 72 unit tests, existing mode/rewards/control/all-standard-power-up
browser regressions and the new [responsive audit](tests/redesign.mjs) passed.
Screens captured at 1440×1000, 1280×800, 820×1180, 390×844 and 320×700; no horizontal
overflow or clipped result actions. Renderer mutation check passed. Nine scoped
axe WCAG A/AA scans have zero detected violations after darkening small olive
text for contrast. Visible keyboard focus, tooltips and reduced motion tested.
Headless Chromium 180-frame host samples: desktop 60.002 FPS (p95 16.7ms),
mobile-sized 60.004 FPS (p95 16.8ms), zero frames >33.4ms in either ~3s sample.
These are not real-device or field performance claims.

- [Home / mode index](artifacts/testing/redesign-after/home-desktop.png)
- [Brick damage / arena](artifacts/testing/redesign-after/damage-states-desktop.png)
- [Mobile abilities](artifacts/testing/redesign-after/abilities-mobile.png)
- [Collection](artifacts/testing/redesign-after/collection-earned-desktop.png)
- [Audit results](artifacts/testing/redesign-after/results.json)
- [Accessibility results](artifacts/testing/redesign-after/accessibility.json)

Fixed during iteration: false startup life-loss label, loss feedback after Extra
Life, misleading Laser readiness while paused, text contrast. No critical errors
remain in tested Chromium flows. Physical devices, Safari/Firefox, manual screen
readers and audible sound quality remain unverified. Existing deferred signature
abilities and persistent saves remain deferred. No deployment or unrelated changes.

## Checkpoint 9 — scoring, rewards and achievements

`src/rewards.js` centralizes configurable scoring and session reward tracking.
Every actual destruction passes through the same ledger after the existing
alive-to-dead guard. Partial damage and dead-brick collisions give no points.
Fireball, lasers, multiple balls and queued explosions cannot score a dead brick
again. Each run tracks base points, combo bonus and completion/time bonus.

- Consecutive destructions within 3 seconds chain. Every five hits after the first
  adds 25%, capped at 3x. No destruction for 3 seconds or life loss resets the chain;
  pause freezes the clock. Explosive clusters can advance the same capped chain.
- Existing Score Multiplier multiplies destruction rewards by 2 before combo
  rounding. Mode multiplier defaults to 1; Hardcore uses 1.25. Completion bonus is
  separate and not doubled by a just-expired Score Multiplier.
- A clear earns 100 plus 2 per remaining par-time second (120-second bonus cap),
  optionally configurable to zero in `SCORING`. Completion payouts are idempotent.
  Endless/Time Attack carry score breakdowns across waves but reset the live combo.
- Existing configurable campaign objective/par-time stars remain intact and visible
  on completion. Clears award clean/no-life-loss and combo-10+ medals.
- 23 achievements cover destruction totals, scores, combos, explosive chains,
  campaign milestones, clean clears, all ten powers, Endless scores, ten challenges,
  all Beginner stars and skilled paddle rallies. Conditions derive from gameplay
  ledgers and campaign/mode records, not fixture completion labels.

Open **Achievements & cosmetics** from Modes for locked/in-progress/unlocked
cards, progress bars, medal counts, visual swatches and earned cosmetic selection.
Paddle Mint/Coral/Gold, trail None/Aqua/Violet and brick themes Original/Ocean/
Sunset are cosmetic only. Locks explain their achievement prerequisite. Rendering
history for trails lives in a WeakMap and never affects ball motion or brick health.
Achievement toasts do not pause gameplay or capture pointer input. Terminal screens
show reward breakdowns and earned medals. Cosmetics, achievements and statistics
persist between modes/replays during this session; reload resets them, matching the
existing session-only campaign. Persistent save/restore remains deferred.

**Verification:** 72/72 unit tests passed, including exact score/combo rounding,
expiry/life resets, duplicate damage, explosions, Multiball/Fireball/Laser shared
scoring, idempotent completion/profile updates, all achievement threshold boundaries,
cosmetic locks and star boundaries. `node tests/rewards.mjs` unlocks milestones via
real production-engine ball-hit fixtures, activates all ten abilities, clears five
levels for the star group, selects earned cosmetics, verifies gameplay dimensions,
checks summaries and mobile overflow. No profile/achievement values were injected.
The five-mode browser suite and keyboard/mouse/emulated-touch plus all standard
power-up browser suites pass. Rewards/completion, cosmetic gameplay and collection
screenshots were visually inspected. Tests use controlled contacts, not human runs;
physical touch, other browsers and manual accessibility remain unchecked.

## Checkpoint 8 — five game modes

The mode menu now opens first. `src/modes.js` contains mode descriptions, ten
challenge definitions and the procedural wave generator. `src/mode-runtime.js`
wraps the existing engine with configurable initialization, clocks, speed scaling,
wave transitions and challenge evaluation. The original campaign level manager
and its layouts/objectives remain authoritative. No bosses or new power-ups.

- **Campaign:** 30 existing levels, original objectives and 1–3 stars. Clearing a
  level unlocks the next; replay via Campaign level selection. Other modes cannot
  change campaign records. Session progress survives returning to Modes.
- **Endless:** generated valid ten-column walls gain reinforced/armored/explosive
  bricks and sparse Unbreakables; rows increase from four to six. Each wave adds
  4.5% ball-motion speed up to 155%, with increased substeps. Score/lives carry
  forward automatically; abilities, balls, projectiles and paddle size reset.
  Final life loss ends the run; a separate session best is recorded.
- **Time Attack:** configurable `MODE_BALANCE.timeLimit`, default 120 seconds.
  Countdown starts on first launch and continues through aiming, life resets and
  automatic wave transitions, but freezes on pause. One clock for the whole run;
  no wave timer reset exploit. Prominent countdown, timeout result and separate
  best score. Losing all three lives also ends the run. Existing brick rewards
  and score multiplier apply; no separate combo mechanic was invented.
- **Hardcore:** existing Expert formation, one life, 118% speed configured in
  mode balance. Extra Life is excluded at the one-life cap without altering
  ability definitions/rarity weights. Clear the wall to win; final-ball loss ends
  immediately. Multiball remains supported: a life is lost only when all balls go.
- **Challenges:** ten predefined named walls with time, bonus, score and no-life-
  loss objectives shown before entry and during gameplay. A challenge requires
  both wall completion and its objective; merely dying with a high score never
  counts. Failed replays do not erase a previous completion. Timed challenges
  can fail before wall completion. Results explicitly show success/failure.

Every mode supports pause/resume, retry/restart and exit to Modes. Records and
initialization are isolated; all modes keep the same controls, brick damage,
scoring, power-up registry and collision engine. Records are session-only as in
Campaign: reload starts fresh; persistent save/restore is still deferred.

**Current verification:** 62/62 unit tests passed. Mode tests validate first 100
Endless formations for structural completion, capped difficulty, all ten challenge
objectives, one-life cap and countdown/wave carryover. This is not proof of an
uninterrupted human-played 100-wave run. `node tests/modes.mjs` passed production-
browser checks for five-mode initialization, pause/resume, restart, exit, final-
life game over/retry, Campaign unlock/stars/isolation, Endless wave progression,
Time Attack timeout/best, Hardcore victory/loss, all ten challenge completions
and failed/timed-out challenges. Completion uses controlled ball-position fixtures
through real physics. Existing keyboard/mouse/emulated-touch tests and the five
original plus advanced/sticky/fireball power-up browser suites were rerun and pass.
Desktop mode menu, Time Attack result and mobile menu screenshots were inspected.
Physical phone, Firefox/Safari and audible sound quality remain manual checks.
Evidence: `artifacts/testing/modes-results.json`. No deployment.

## Checkpoint 5 — first functional slice

Implemented: registry/effect manager (`src/powerups.js`), falling pickups, weighted
rarity selection, per-definition probability/conditions/duration, refresh/instant
policies and incompatibility removal hooks. Utility effects coexist with no stored
velocity mutation. Drops: 18% per destruction, maximum three falling at once.
Common/Rare/Epic/Legendary weights are configured; only Common/Rare abilities are
currently registered. No placeholder signature abilities spawn.

- Wide Paddle: width 168 instead of 112, 16 seconds, Common.
- Slow Ball: simulation speed 70%, 12 seconds, Common; paddle input unaffected.
- Extra Life: immediate +1, cap five, Rare; no drop/activation at cap.
- Emergency Barrier: one rescue at y=540, expires after 18 seconds, Rare.
- Score Multiplier: 2x destruction rewards, 14 seconds, Rare; dead bricks cannot
  be scored twice, including explosion chains.

Repeated timed pickups refresh, never multiply strength or accumulate charges.
Timers and falling objects freeze on pause. Life loss, game over, restart and
completion clear temporary effects/drops/particles and restore normal paddle
width. Level transitions now construct a fresh game/effect manager. Structured-
clone state roundtrip is tested; browser reload starts fresh, so no saved ability
can become permanent.

Colored icon pickups, radial pickup particles, duration bars, expiring dashed
borders, barrier rendering, hover descriptions and optional synthesized per-type
sound cues are implemented in `src/powerup-ui.js`. Sound defaults off. Cue execution
was browser-tested, not audibly evaluated. No screen flashes/shakes were added.

Verified: 34 unit tests plus existing input, brick-type and lifecycle browser suites
passed. `node tests/powerups.mjs` catches all five pickups through production code,
checks HUD, pause/expiration, barrier rescue, loss/restart cleanup and mobile layout.
Controlled fixtures are used, not a claim of a human-played pickup run. Active HUD
screenshot visually inspected. Existing controls, brick physics and single-level
completion remain intact.

Additional completed abilities:

- Multi-ball (Rare): instant split into at most three independently simulated
  balls with preserved speed and diverging angles. Losing secondary balls costs
  no life; only losing the final ball triggers the normal life-loss flow.
- Laser Paddle (Epic): 14-second refreshable effect; F or the visible Fire button
  launches paired bolts with a 0.34-second bounded cooldown. Bolts deal one damage,
  respect brick health/score/explosions, and cannot damage Unbreakables.
- Magnet Paddle (Epic): 13-second refreshable effect; only nearby descending balls
  within 220 logical pixels receive bounded horizontal steering toward the paddle.
  It does not teleport balls or permanently alter speed.

The primary `game.ball` compatibility surface remains while `game.balls` owns
simulation/rendering. All extra balls, laser shots and timed effects clean up on
life loss/restart/level transition. Multi-ball is capped, Laser has no score farm
bypass, and Magnet acceleration is bounded. Six focused unit tests and production-
browser checks passed; the active three-ball/laser/magnet screen was visually
inspected. Total unit gate: 47/47.

Sticky Paddle and Fireball are now also complete:

- Sticky Paddle (Rare): 14 seconds and three catches. A descending ball sticks
  at its contact offset, follows the moving paddle, and releases upward with
  Space, click or tap. Re-collection refreshes duration and charges.
- Fireball (Epic): 12 seconds. Every ball gains an orange glow, damages and
  passes through destructible bricks without substep duplicate hits, while still
  rebounding from Unbreakables and arena boundaries.

Five focused unit tests and production-browser checks passed for catch/follow/
release, bounded charges, piercing multi-hit damage, Unbreakable rebound,
expiration and restart cleanup. Total unit gate: 52/52. The combined state was
visually inspected.

All requested standard abilities are implemented. The ten signature abilities
and persistent campaign save/restore remain deferred. Deferred signatures: Gravity Well, Portal Gates, Time Fracture,
Chain Reaction, Impact Nova, Phantom Paddle, Spectrum Beam, Trajectory Oracle,
Reality Glitch and Echo Shot. Cooldown/extended incompatibility interactions,
signature feedback and persistent save/restore need implementation with those
abilities. This is a partial checkpoint, not completion of the full ability brief.

## Campaign progression

`src/levels.js` contains 30 unique ten-column handcrafted layouts, names, six
five-level tiers, per-level objectives, star criteria and power-up drop rates.
Difficulty tiers: Beginner 1–5, Intermediate 6–10, Advanced 11–15, Expert 16–20,
Master 21–25, Challenge 26–30. Beginner introduces Normal/Reinforced/Bonus;
Advanced introduces Armored/Explosive and level 15 introduces Unbreakable.
No moving/regenerating bricks were added because the current engine has no reliable
support for them.

Every level requires clearing all destructible bricks; Unbreakables may remain.
Optional objective rotation includes time limits, two bonus bricks, target scores
and no-life-loss clears. Completion earns one base star, one objective star and
one par-time star. The level menu shows tiers, lock/completion state and best stars.
Completion unlocks the next level for the current in-memory session. Best records
do not regress. Reload intentionally starts a fresh campaign; browser persistence
was not requested. Next level, replay/retry, restart and Levels menu transitions
construct a fresh game, clearing prior balls, paddle changes, power-ups, timers,
lives, score and brick damage. Drop chance scales from 20% to 10%; completion is
never dependent on a random drop.

Validation covers unique layouts, exact row width, arena bounds, known brick types,
possible completion, possible bonus objectives and tier counts. All 30 were
structurally completed by deterministic damage in unit tests—this proves completion
conditions, not physical ball-path reachability from uninterrupted play. Browser
production-physics fixtures completed representative levels 5, 10, 15, 20, 25 and
30, one from every tier. Level 1 unlock/next/menu flow, stars, objective failure and
state reset passed. The other 24 were not browser-played. Level-selection screenshot
was visually inspected.

Current total: 41/41 unit tests passed. Existing Checkpoint 1–5 input, brick,
lifecycle and power-up browser suites previously passed; campaign additions did
not replace those mechanics.

## Run

From this folder run `npm start` (Python 3 required), or
`python3 -m http.server 4328 --bind 127.0.0.1`.
Visit http://127.0.0.1:4328. No install/build step required.

## Controls and lifecycle

Arrows, A/D, mouse movement or touch drag move the paddle. Start prepares the
stationary ball on the paddle; Space/click/tap launches. P/Esc or Pause/Resume
freezes and restores aiming/playing. Blur/hidden tabs auto-pause explicitly.
A miss consumes one life, resets the paddle/ball, and preserves score and brick
health. Zero lives shows Game over. Play again/Restart resets everything.
HUD shows score, lives and level (single level 1). Clear all destructible bricks
to complete; solid bricks can remain. Frame deltas are clamped; 4 ms physics
substeps and contact-normal rebounds protect against normal-speed tunneling.

## Configurable bricks

Rules, default layout and destruction behaviors are in `src/bricks.js`, separate
from ball collision logic. `createGame({layout, definitions})` accepts custom
rows of type keys (null skips a cell) and a definitions map. Each brick snapshots
its rule. Geometry uses the existing ten-column grid.

- Normal: green, 1 HP, 10 points, breaks on one hit.
- Reinforced: blue, 2 HP, 25 points on destruction.
- Armored: purple, 3 HP, 50 points on destruction.
- Explosive: coral/star, 1 HP, 30 points; on destruction inflicts 1 damage on
  destructible bricks whose centers lie within 85 logical pixels, including
  diagonals in this grid. Destroyed explosives chain.
- Bonus: gold/plus, 1 HP, 100 points; score bonus only, no dropped power-up.
- Unbreakable: slate/cross, infinite HP, 0 points; bounces the ball, immune to
  explosions and excluded from completion.

Multi-hit bricks display remaining HP and progressively more cracks. Score is
awarded only on destruction, never for partial hits. A brick is marked dead
before its score or blast is processed. Explosions use an iterative queue; each
source detonates once, preventing recursion/infinite cyclic reactions. A target
may take one damage from each distinct nearby explosion. Separating outward
ball contacts do not cause repeated damage.

## Modules

- `src/bricks.js`: type definitions, layouts, brick factory, damage/blast queue.
- `src/game.js`: state, physics, paddle/wall/brick contacts and lives.
- `src/input.js`: keyboard and pointer/touch input.
- `src/render.js`: canvas drawing, type styles and damage states.
- `src/main.js`: animation, resizing, HUD and screen lifecycle.
- `index.html` / `src/styles.css`: accessible controls and responsive presentation.

## Verification

`npm test`: 26/26 unit tests passed. Includes original uniform-wall regression,
all six types through real ball contacts, exact one-time destruction scores,
multi-hit health, corner contacts, no false corner hits, finite cyclic explosion
chains, nearby multi-hit damage, distant/solid immunity, configurable rules,
completion with solid bricks remaining, three lives, pause freeze, and
20-144 fps paddle/wall checks.

With server running:
- `node tests/browser.mjs`: arrows, A/D, mouse, Space/click, emulated touch
  launch/drag, life loss/reset/restart, mobile overflow, no exceptions.
- `node tests/lifecycle.mjs`: mixed-wall destruction with exact aggregate type
  scores, solid bricks remaining at completion, win/loss screens, three losses,
  relaunch, paused-state immutability/resume, restart and automatic blur pause.
- `node tests/brick-types.mjs`: all six types in browser physics, exact isolated
  scores and damage states rendered in the full mixed wall.

Browser tests reuse the existing chess-game-analyzer Playwright installation
without changing that project. Deterministic `?test` ball-position fixtures run
production physics/UI; these are not uninterrupted human-played winning rounds.
Damage-state screenshot visually inspected; evidence in `artifacts/testing/`.
Physical-device touch, other browsers and assistive technology remain manual.
No deployment or unrelated app changes.
