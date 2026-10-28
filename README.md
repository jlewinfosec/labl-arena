# LABL Arena — build kit

Game-day tablet app for the Louisiana Blaster League. Single offline HTML file, built from the
Extinction Protocol (EP) Field Terminal v2.52.0 by extracting modules and layering LABL overlays.

## Build

```
cd lint && npm install && cd ..        # once per machine (eslint + acorn)
python3 build.py                        # -> LABL_Arena.html + docs/index.html + docs/sw.js
node walk.js && node flow.js            # smoke + game-day flow tests (need Playwright)
node pwa.js                             # installed-app test: offline reload + update keeps data
node draw.js                            # team draw: 30 players x 20 draws balanced, walk-in, squads hidden
```

## Rules for changing anything

- `LABL_Arena.html`, `docs/index.html` and `docs/sw.js` are GENERATED. Never edit them. Never edit `src.html`.
  `docs/` is what GitHub Pages serves (https://jlewinfosec.github.io/labl-arena/); commit it with every release.
  The version lives in one place: `window.LABL.version` in `overlay/pre.js.html`. Bump it for every
  release — the service worker's cache name comes from it, so an unchanged version never reaches the tablets.
- `src.html` is the EP source with every unused line blanked (line numbers match the original
  EP file, so `build.py` ranges still work). It is ~4 MB instead of 16 MB.
- All LABL changes live in `overlay/`:
  - `labl.js.html` — the LABL shell and new features. Override EP functions by reassigning them
    (`mtabPage = function () { … }`). Most new work goes here.
  - `patches.py` — exact-substring edits to EP code (`PATCHES` must match exactly once;
    `PATCHES_ALL` replaces every match). Use for `const` bindings and EP defaults you can't
    override at runtime. The build fails loudly if a patch stops matching.
  - `terms.js` — wording swaps applied only inside JS string literals (EP → LABL vocabulary).
  - `theme.css.html` — LABL theme; rules are scoped under `body.labl`.
  - `pre.js.html` — shims for globals that dropped EP modules used to provide.
  - `head.html`, `logo_b64.txt` — embedded fonts (Oswald, Barlow), manifest link and the logo.
  - `sw.js` — service worker template (cache-first app shell); `build.py` stamps the version into `docs/sw.js`.
  - `docs/manifest.webmanifest`, `docs/icon-*.png` — install metadata; icons come from `tools/icons.py`.
- `undef.json` / `curated.json` + `lint.sh` — auto no-op stubs for EP globals still referenced.
  Run `./lint.sh` after a build when you add EP code ranges, then rebuild.

## Storage keys (localStorage)

`ep_cfg` (config, PIN, roster under `.roster` with `age` Y/T/A per player, LABL settings under `.labl`), `ep_bb` (rounds — each with `how` time/elim/obj/mg/forfeit/other, `st` {playerId: [tags, outs]} and an `ed` edit history when edited —
awards), `ep_bbteams` (sides, plus `pool` / `bl` blaster S/F/B / `day` / `drawIdx` for the LABL draw), `ep_bbplan`, `ep_bbrun`, `ep_bbterm*`, `ep_mtab`, `ep_tablog`, `ep_lk`,
`ep_lock_<game>`. Keys keep their `ep_` prefix on purpose: renaming them would orphan saved data.

## Where things are in the EP code (search these names in LABL_Arena.html)

- Arena / Bullet Ballet: `BB_MODES`, `BB_INFO` (rules cards), `BB_DAY`, `BB_BRK`, `BBSND`,
  `bbPlanNew`, `bbPlanAuto` (Build a full day), `bbRun` (run screen), `bbRunMode`,
  `bbRunAdvance`, `bbQuickLog`, `bbTeamsBox`, `bbStats`, `bbBoard`, `kBB` (standings page),
  `bbTerm` (objective stations), `arenaPage`, `bbStandingsTab`.
- Mission Tablet + mini-games: `GAMES[id]` (one module per game), `intro`, `play`, `hud`,
  `result`, `FAIL_RULES`, `lockFor`, `mtabPage`, `mtabTile`, `mtabSetup`.
- Router: `routeTo` (overridden in labl.js.html), `go`, `NAV`, `setMode`/`modeVal`
  (modes: "0" panel, "6" arena, "7" mission tablet, "8" scoreboard).

## Tests

`walk.js` visits every screen; `flow.js` runs a full block (plan → teams → 2 rounds → CSV →
scoreboard); `pwa.js` serves `docs/` over http, installs the worker, reloads offline and applies a
bumped version at the same URL (data must survive both); `shots.js` screenshots key screens into `shots/`. A change is done when the build
passes, both tests report zero PAGEERROR lines, and the changed screens look right in
screenshots at 1280×800 (landscape tablet) and 800×1280 (portrait).
