# Recovery Log - 2026-05-19 Git Incident

## Cause

During GitHub Pages deployment, Claude Code performed destructive git operations on an orphan `gh-pages` branch without first checking for uncommitted working tree changes. The commands `git checkout --orphan gh-pages` followed by `git rm -rf .` deleted all uncommitted source files from the working tree. When switching back to `main`, git only restored the last committed state — **one week of uncommitted changes were wiped.**

**Root cause:** No `git stash` or commit was made before branching operations. No check for dirty working tree was performed.

## Last Known Good Deploy

Commit `772c45f81106f0a708d136263459b5c4f7eb4384` contains the last deployed build. Its `dist/assets/index-DGISdab2.js` and `dist/assets/index-B95curSI.css` were used as reference for recovery verification.

---

## Session 1 Recovery (2026-05-19, initial response)

### Source Code (all recovered from CC transcripts)

| File | Recovery Source | Status |
|------|----------------|--------|
| src/components/Board.jsx | Transcript 9332fb3d | RECOVERED |
| src/components/IslandContainer.jsx | Transcript 9332fb3d | RECOVERED |
| src/components/Player.jsx | Transcript afe8fbd7 | RECOVERED |
| src/components/Player.css | Transcript afe8fbd7 | RECOVERED |
| src/components/Scorecard.jsx | Transcript e91f690e | RECOVERED |
| src/components/Scorecard.css | Transcript e91f690e | RECOVERED |
| src/Palette.js | Transcript d1f758ed | RECOVERED |
| src/appConfig.js | Transcript f8444983 | RECOVERED |
| src/index.css | Transcript ccb60e22 | RECOVERED |
| src/main.jsx | Transcript 5b42ffa1 | RECOVERED |
| src/hooks/useBoardZoom.js | Transcript 7c738079 | RECOVERED |
| src/utils/shotPhysics.js | Transcripts aa72727b + d1f758ed | RECOVERED |
| src/simulate.js | Transcripts 5b42ffa1 + e91f690e | RECOVERED |

### Static Data (all recovered from dangling commit 24956c1)

| Content | Status |
|---------|--------|
| dist/map/ (4 maps) | RECOVERED |
| dist/mock-record/ | RECOVERED |
| dist/npc-data/ (50 reports) | RECOVERED |

---

## Session 2 Recovery (2026-05-19, deep fix pass)

### appConfig.js — Full reconstruction

The initial recovery only had `board` and partial `game` sections. Reconstructed from multiple CC transcript sources + deployed bundle verification:

| Section | Source | Notes |
|---------|--------|-------|
| `board` | Already present | `aspectRatio: 1` |
| `cards` | Transcript aa72727b | `enabled`, `deckType`, `field` (minCount, maxCount, acquireRadiusYd, pathStartPct, pathEndPct, lateralSpread) |
| `map` | Transcript aa72727b | `enabled`, `availableMaps`, `selectedMaps`, `imageUrl`, `imageWidth`, `imageHeight`, `holePlan`, `points` |
| `game.powerToRange` | Transcripts 92c87fa6, 95bed145 | Extended to keys 0-15 with aggressive diminishing returns |
| `game.aimToOffsetRate` | Transcripts 92c87fa6, 95bed145 | Extended to keys 1-15, exponential decay |
| `game.burstRate` | Transcript 4cdbc123 | Touch tier (not nerve), values: high 1.05, mid 1.03, low 1.02 |
| `game.rangeBandInfluence` | Transcripts fca1cad9, 667689c3 | 4 distance bands with power/aim/touch weights |
| `game.offsetPenaltyRate` | Transcript fca1cad9 | 0.6 |
| `game.outcomeThresholds` | Transcripts 44072f38, 5b42ffa1 | Tightened: great maxOffset 5, good 10, okay 25 |
| `game.timing` | Transcript 91c9227e | 9 props: flightDuration 0.8, fadeDuration 1.6, shotDelay 600, landDelay 400, cameraFollowUp 700, holedReset 800, holeTransition 1200, holeTransitionFinal 2000, introFrameDuration 80 |

### useIllustrateState.js — Bug fixes

- **Null guard**: Added `DEFAULT_CONFIG` constant for when `config` is undefined (fixes crash on pages that don't pass illustrateConfig)
- **syncBalls export**: Added `syncBalls` callback to return value (Board.jsx expected it)
- **Stable deps**: All useEffects use `safe` (derived from config || DEFAULT_CONFIG) instead of raw `config`

### useIllustrateAnimation.js — syncBalls integration

- Added `syncBalls` parameter, calls it when balls change (replaces old setInterval polling)

### TrainingPicker.jsx — Full rewrite from deployed bundle

The initial recovery was a simplified version that generated training data locally and used `nerve` instead of `touch`. Reconstructed from transcript 9332fb3d (Write at line 255):

| Issue | Before | After |
|-------|--------|-------|
| trainingRecords prop | Generated internally | Accepts from parent via `computeStatsFromTraining` |
| Stat name | `nerve` | `touch` |
| testConfig to Board | Not passed (crash) | Passed as `testConfig={testConfig}` |
| illustrateConfig to Board | Not passed (crash) | Passed as `{ varyStat: 'power', baseStats: {...}, paused: true }` |
| Shot outcomes | Basic distance only | Handles `holed`/`miracle` explicitly |
| Swing issue display | Not shown | Shows debuff with `SWING_ISSUES` label |

### useGameReducer.js — Map hole generation fix

- **makeHole**: Was checking `map.points.length >= 2` (always empty). Now checks `map.holePlan?.length > 0` and passes `[plan.startPt, plan.endPt]` to `generateHoleFromMap`
- **DEAL_CARD**: Confirmed as intentional no-op in deployed bundle. Cards enter hand only via field card acquisition in `BALL_LANDED`

### Board.jsx — Map hole generation fix

- **makeHole**: Same fix as reducer — reads from `map.holePlan`, passes 3 args to `generateHoleFromMap`

### IslandContainer.jsx — handleNewGame reset

- Now also resets `appConfig.map.holePlan = []` and `appConfig.map.transform = null`

### CSS — 134 missing classes recovered

Created `src/recovered.css` with all missing styles extracted from deployed bundle's `index-B95curSI.css`:

| Component | Classes | Impact |
|-----------|---------|--------|
| Board/Game | 71 rules | board fullscreen, map image, phase badges, floating HUD, hole labels |
| Ball rendering | 5 classes | dot, trail, glow, landed, dist text (+ map-mode white overrides) |
| Field cards | 5 classes | question mark pickup markers, acquire ring, radius |
| Active effects | 7 classes | swing debuff/penalty display tags |
| Commentary | 5 classes | live broadcast-style commentary feed |
| Fire animation | 8 classes | end-of-round card reveal photo animation |
| HUD overlay | 15 classes | stats columns, bars, player header, issue labels |
| Illustrate mode | 17 classes | config panel, stat toggles, grid, legend |
| Test mode | 8 classes | debug config panel, stat pickers, issue selector |
| TrainingPicker | 7 classes | debuff display, practice mode issue tag |
| CardPicker | 10 classes | header, grid, exchange, hint, floating overlay |
| OpponentPicker | 6 classes | scroll, sections, stat badges with tier colors |
| Scorecard | 2 classes | par color in HUD context |
| MapPicker | 2 classes | back button, dimmed card |
| Other | 18 rules | player distance label, has-map overrides, guide lines |

Imported in `src/main.jsx` as `import './recovered.css'`

---

## Security

| Item | Status |
|------|--------|
| .mcp.json with bearer token | REMOVED from git, added to .gitignore |
| Bearer token `pfmcp_L0onFWj...` | User should revoke if pushed to remote |

---

## Still TODO — Next Recovery Steps

### High Priority (game-breaking)

- [ ] **cards.js** — Source has only 4 base cards + brainrot deck. Deployed bundle has **17 base cards** with weather/animal event types and `touch`/`issue` stat names (not `nerve`/`curse`). The card definitions need full recovery from the bundle.
- [ ] **Verify full game flow end-to-end** — Select training → pick opponents → pick map → pick deck → play 18 holes → see scorecard. Test each transition.
- [ ] **Board.jsx CSS imports** — Some components (BallLayer, FieldCardMarker, etc.) may have missing inline styles or CSS class references not in recovered.css

### Medium Priority (features partially working)

- [ ] **FireAnimation component** — Check if `src/components/board/FireAnimation.jsx` has complete logic for end-of-round card reveal (CSS classes recovered but component logic may be incomplete)
- [ ] **GameFinished component** — Verify end-of-game state is complete
- [ ] **CardPicker component** — Verify exchange functionality works with recovered CSS
- [ ] **CommentaryEngine** — Verify `src/commentaryEngine.js` and `src/commentaryTemplates.js` have full template coverage
- [ ] **OpponentPicker** — Check if stat badges use `touch` (not `nerve`)

### Low Priority (polish)

- [ ] **Clean up recovered.css** — Split into proper component CSS files instead of one monolith
- [ ] **Remove unused CSS** — The 53 source-only classes (PracticeRange, curse system) that don't exist in the deployed bundle
- [ ] **data/trainingRecords.js** — Verify swing generation matches deployed bundle (uses `technicalRadar` array not individual fields)
- [ ] **GitHub Pages deployment** — Re-deploy after all recovery is verified

### Reference: Deployed Bundle File

```
commit: 772c45f81106f0a708d136263459b5c4f7eb4384
dist/assets/index-DGISdab2.js  (300KB, last working build)
dist/assets/index-B95curSI.css (62KB, last working styles)
```

Can be extracted with: `git show 772c45f8:dist/assets/index-DGISdab2.js`
