# The Village

The Village is a browser-based gothic RPG, tower-defense, and village-building game. Players develop a persistent settlement, assemble a card-driven defensive loadout, guide Shadow and a Familiar, and defend branching roads through a twenty-chapter campaign.

Current version: **34.1.0**

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

Create a production build:

```bash
npm run build
```

Vite writes the production output to `dist/`.

## Folder structure

```text
assets/         Game art, sprites, models, textures, and source assets
docs/           Historical audits and patch notes
project_docs/   Architecture, current project state, audits, and roadmap
shaders/        Rendering shader resources
src/
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

## Known issues

- The Stage 6 visual-state repair has passed parsing and initialization checks, but its full Stage 1 → Stage 6 → Stage 1 visual regression sequence still requires manual release verification.
- The optional Three.js atmosphere renderer loads Three.js from a CDN. Core game systems continue to operate if that optional layer cannot load.
- Production builds require Node.js/npm; opening `index.html` directly is useful for basic checks but the Vite development server is recommended.

## Documentation

- [`project_docs/PROJECT_STATE.md`](project_docs/PROJECT_STATE.md): current technical state and recent fixes
- [`project_docs/ARCHITECTURE.md`](project_docs/ARCHITECTURE.md): system architecture
- [`project_docs/ROADMAP.md`](project_docs/ROADMAP.md): planned work
- [`docs/patch_notes/`](docs/patch_notes/): historical release notes
