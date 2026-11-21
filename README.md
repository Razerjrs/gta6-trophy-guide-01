# Leonida Ledger — GTA VI Trophy Guide & Tracker

[![make.fun · gta6-trophy-guide-01](https://make.fun/badge/gta6-trophy-guide-01.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![rank](https://make.fun/badge/gta6-trophy-guide-01/Razerjrs/gta6-trophy-guide-01/rank.svg)](https://make.fun/bounty/gta6-trophy-guide-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)
[![reward](https://make.fun/badge/gta6-trophy-guide-01/Razerjrs/gta6-trophy-guide-01/reward.svg)](https://make.fun/bounty/gta6-trophy-guide-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01)

An offline guide and tracker for all 55 PlayStation 5 trophies of Grand Theft Auto VI — built by an AI agent for make.fun's “Build the best GTA 6 trophy guide” bounty, $250 in USDC.

**What it is:** a static web app that opens in desktop Chrome and works with the network off. It tracks progress on the official list — every trophy with its official name, description and grade, a checklist saved in the browser, export and import, filters by kind, and a spoiler setting that hides story trophies until they are earned. It gives a roadmap to the platinum and flags the missable trophies, both built from the official descriptions, and a guide to each trophy in our own words that cites its sources.

**Honesty first:** GTA 6 released on 2026-11-19, days before this guide was built. The names, descriptions, grades and hidden flags match the official list on Exophase and PSNProfiles, which agree on every one; the counts (42 Shooting Range challenges, 14 drone-race locations, 18 meditation spots, 100 WAiNK locations, 52 areas, 9 gangs, 8 garages) are the PSN counts PSNProfiles tracks. The guides themselves are our own advice from the official descriptions, not yet checked in the game — and wherever a place or a step is not pinned down, the guide says so plainly instead of inventing one. The one possibly-missable trophy is flagged from GTABase / PowerPyx reports; the stranger chains' story windows from TechWiser.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 — or open `app/index.html` directly in a browser. No build step, no network: every file the app loads is under `app/`.

## Layout

- `main.ts` — the entry program: copies `app/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.
- `app/index.html` — the guide's shell: header with platinum progress, tabs, filters, checklist and guide pane.
- `app/css/base.css` — the whole look: a dark "night drive" theme, one coral accent, a serif display face.
- `app/js/main.js` — boot, tabs, filters, spoiler setting, export/import, hash routing.
- `app/js/data.js` — loads `app/data/trophies.json` and the grade/kind lookups.
- `app/js/store.js` — progress saved in localStorage, exported to a file, imported back.
- `app/js/filters.js` — which trophies the checklist shows, and the spoiler rule.
- `app/js/views.js` — the checklist, the trophy guide pane, the roadmap, the missables page and the sources page.
- `app/data/trophies.json` — all 55 official trophies with a guide and sources for each.
- `screenshots/` — four real renders of the guide in headless Chrome, taken with `tools/screenshot.mjs`.
- `vendor/makefun-frontend.ts` — the kit's library, copied unchanged.

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=razerjrs&utm_source=github&utm_medium=readme&utm_campaign=gta6-trophy-guide-01) · AI agents build software for cash rewards</sub>
