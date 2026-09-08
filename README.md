# The Village

The Village is a browser-based gothic RPG, tower-defense and village-building
game. You develop a persistent settlement, assemble a card-driven defensive
loadout, guide Shadow and a familiar, and defend branching roads through a
twenty-chapter campaign.

Current version: **37.0.0 — Siege of the Keep**

Village development materially changes battle, and battle progression opens
village research. That loop is the point of the game:

```
Village → Research → Battle → Boss → Relic → Research → stronger Village → …
```

New to the project? Read [`PROJECT_STATE.md`](PROJECT_STATE.md), then
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Features

- Persistent 3D village with construction, resources, citizens, and progression
- Twenty-stage campaign with procedural and branching enemy roads
- Canvas-rendered tower-defense battles
- Card collection, deck building, upgrades, fusion, and passive defenses
- Shadow Hero progression with permanent Job Point unlocks
- Familiar companions with persistent levels and XP
- Relics, achievements, profiles, Codex entries, and save management
- Authenticated tester bug reports, suggestions, and general feedback
- Responsive desktop, tablet, and mobile controls

## Controls

### Village

- Move: Arrow keys or `W`, `A`, `S`, `D`
- Touch movement: on-screen joystick
- Interact: the contextual interaction control
- Camera: mouse/touch drag and the on-screen camera controls
- Build: open the Build menu and choose an available plot

### Battle

- Select/place cards: click or tap a draft card, then the battlefield
- Pan camera: mouse/touch drag
- Zoom: mouse wheel or pinch
- Rotate road pieces: Rotate placement control
- Center camera: Center command
- Speed: cycles between 1×, 2×, and 3×
- Pause: Pause command
- Exit: Exit command

## Development setup

Requirements:

- Node.js 20 or newer
- npm

Install dependencies:

```bash
npm install
```

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:5173`. Live Server and port 5500 are no longer supported
development paths.

Create a production build:

```bash
npm run build
```

The build stages only the controlled runtime asset manifest, bundles imported
audio and portraits, and fails if a required dynamic sprite, Village model,
progression registry icon, or release version is missing.

Preview the production build:

```bash
npm run preview
```

Vite writes the production output to `dist/`; preview normally runs at
`http://localhost:4173`.

With preview running, execute the production browser smoke suite:

```bash
npm run test:production
```

Cloud accounts are optional. Copy `.env.example` to `.env` and set the
browser-safe `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to work on
sign-in and cloud saves. Without them the game boots straight into local-only
play, which is also how a static deployment without build variables behaves.

## Folder structure

```text
assets/         Game art, sprites, models, textures and audio
docs/           Supabase setup, design notes, historical patch notes and audits
project_docs/   Historical numbered code audits
scripts/        Asset staging, build and content validation, production smoke tests
src/
  config/       Release version and debug channels
  data/         Campaign and village content registries (pure data)
  Battle/       Battle simulation, canvas rendering, cards, campaign systems
  Village/      Economy model and world registry
  Renderer/     Three.js village renderer
  Ascension/    Relics, equipment, gems, fusions, companions, elements
  Progression/  Economy and telemetry registries
  UI/           Bundled stylesheets
  online/       Supabase client, auth gate, cloud save, tester feedback
  main.js       Application entry point
  villageBootstrap.js
index.html      Main application document — its element ids are an API
styles.css      Shared responsive UI and game presentation
vite.config.js  Build configuration (relative base for host-agnostic output)
```

The authoritative notes are in [`PROJECT_STATE.md`](PROJECT_STATE.md) and
[`ARCHITECTURE.md`](ARCHITECTURE.md).

## Save compatibility

Progress is stored in browser local storage under a legacy save key, so players
carrying saves forward from earlier versions keep their campaign, cards, Hunter
progression, village construction and resources. A save is normalised and
migrated on every load; a save that cannot be read is quarantined rather than
overwritten.

Signed-in players also get revisioned Supabase cloud saves. Local storage is
always written first, so a failed cloud write never costs progress.

Do not clear browser storage unless you intend to reset a save. The in-game Save
Manager (More → Save Manager) exports a portable backup.

Full details, including the rules for changing the schema, are in
[`SAVE_SCHEMA.md`](SAVE_SCHEMA.md).

## Known issues

See [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md). The short version: everything has been
tested in Chromium at desktop, iPad and iPhone viewport sizes, and **not** on
physical iOS or Android hardware.

## Deployment

The build output is static files. `npm run build` produces `dist/`, which works
from a root domain or a path prefix such as a GitHub Pages project site. Cloud
accounts are optional — without Supabase credentials the game boots straight
into local play.

See [`DEPLOYMENT.md`](DEPLOYMENT.md).

## Documentation

| File | What it is for |
|---|---|
| [`PROJECT_STATE.md`](PROJECT_STATE.md) | What the game is today. Start here |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | How the code fits together |
| [`ROADMAP.md`](ROADMAP.md) | Milestones and what to build next |
| [`SAVE_SCHEMA.md`](SAVE_SCHEMA.md) | Storage keys, save flow, migration rules |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | Build and hosting |
| [`KNOWN_ISSUES.md`](KNOWN_ISSUES.md) | Open problems and fragile areas |
| [`CHANGELOG.md`](CHANGELOG.md) | Release history |
| [`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) | Cloud account setup |
| [`docs/patch_notes/`](docs/patch_notes/) | Historical per-release notes |
| [`project_docs/`](project_docs/) | Historical numbered code audits |

## Development scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite development server |
| `npm run build` | Stage assets, bundle, then validate the build and the content registries |
| `npm run preview` | Serve the production build |
| `npm run validate:build` | Check `dist/` without rebuilding |
| `npm run validate:content` | Check the content registries |
| `npm run test:production` | Browser smoke suite against a running preview (needs `CHROME_PATH`) |

## The battlefield

Battles play on the Battle 4.0 arena by default: the keep in the centre, four
roads whose sealed gates breach at authored waves instead of a road that
grows, hills and grass rendered with Three.js from a Blender-built asset
(`tools/blender/build_battlefield.py`). The classic 2D board is the fallback
when WebGL is unavailable, and can be chosen with `?battle3d=0` or by turning
off "3D Battlefield" in the ♫ panel (`?battle3d=1` turns it back on). See
`docs/BATTLE_4_DESIGN.md`.

## Debug channels

Append `?debug=1` to enable the development overlays on any build, or name
channels with `?debug=overlay,diagnostics,visual,proof`. `?debug=0` clears the
choice, which is remembered between reloads. See
[`ARCHITECTURE.md`](ARCHITECTURE.md#10-debug).
