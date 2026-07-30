# The Village

The Village is a browser-based gothic RPG, tower-defense, and village-building game. Players develop a persistent settlement, assemble a card-driven defensive loadout, guide Shadow and a Familiar, and defend branching roads through a twenty-chapter campaign.

Current version: **35.1.0 — VITE NATIVE FOUNDATION**

## Features

- Persistent 3D village with construction, resources, citizens, and progression
- Twenty-stage campaign with procedural and branching enemy roads
- Canvas-rendered tower-defense battles
- Card collection, deck building, upgrades, fusion, and passive defenses
- Shadow Hero progression with permanent Job Point unlocks
- Familiar companions with persistent levels and XP
- Relics, achievements, profiles, Codex entries, and save management
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

Create a local `.env` from `.env.example` and set the browser-safe
`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` values before starting Vite.

## Folder structure

```text
assets/         Game art, sprites, models, textures, and source assets
docs/           Historical audits and patch notes
project_docs/   Architecture, current project state, audits, and roadmap
scripts/        Runtime-asset staging, build validation, and production smoke tests
shaders/        Rendering shader resources
src/
  config/       Shared release metadata
  Battle/       Battle simulation, Canvas rendering, cards, and campaign systems
  Renderer/     Three.js village renderer
  main.js       Application entry point
  villageBootstrap.js
index.html      Main application document
styles.css      Shared responsive UI and game presentation
```

The authoritative architecture and implementation notes are in [`project_docs/PROJECT_STATE.md`](project_docs/PROJECT_STATE.md) and [`project_docs/ARCHITECTURE.md`](project_docs/ARCHITECTURE.md).

## Save compatibility

Progress is stored locally in the browser. The current game preserves the legacy save key so existing players retain campaign progress, cards, Hunter progression, Village construction, and resources.

Do not clear browser storage unless intentionally resetting a save.

Authenticated players also receive revisioned Supabase cloud saves. Local
storage remains the immediate offline-safe copy, while the cloud adapter
debounces and retries remote writes. See
[`docs/SUPABASE_SETUP.md`](docs/SUPABASE_SETUP.md) for environment variables,
database migration, authentication behavior, migration rules, and testing.

## Known issues

- The iOS battle-camera recovery for stale touch pointers has passed Chromium parsing and initialization checks, but still requires repeated manual stage-transition and pinch/drag verification on physical iPhone hardware.
- Authentication and cloud saving require the Supabase migration and redirect
  configuration documented in `docs/SUPABASE_SETUP.md`.
- Physical iPhone/iPad testing remains required for final Safari audio,
  recovery-link, rotation, and safe-area certification.

## Documentation

- [`project_docs/PROJECT_STATE.md`](project_docs/PROJECT_STATE.md): current technical state and recent fixes
- [`project_docs/ARCHITECTURE.md`](project_docs/ARCHITECTURE.md): system architecture
- [`project_docs/ROADMAP.md`](project_docs/ROADMAP.md): planned work
- [`docs/patch_notes/`](docs/patch_notes/): historical release notes
