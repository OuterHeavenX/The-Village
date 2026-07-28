# THE VILLAGE — V32.4.1 CODE AUDIT

**Audit date:** 2026-07-26  
**Audited baseline:** V32.4 Familiars & Keep Evolution  
**Result:** JavaScript syntax passes; static asset references pass after repair; save schema remains backward compatible.

## Audit coverage

- Runtime entry chain and module imports
- All JavaScript files under `src/`
- Save loading, migration, and localStorage fallback behavior
- Shadow familiar progression and battle behavior
- Keep battle-level calculation and automatic archer behavior
- Dagger Tower timing and lane behavior
- Battle completion recovery logic
- Static asset references used by HTML, CSS, and JavaScript
- Mobile viewport and existing iPad layout safeguards
- Package metadata and obsolete packaged development files

## Repairs and cleanup

1. Replaced two broken CSS references to the missing `assets/backgrounds/main-menu.jpg` with the existing `assets/village/the_village_main.png`.
2. Updated stale browser cache-busting identifiers on `index.html`, `src/main.js`, and the battle module. This prevents Safari from reusing an older V27/V276 script after installing a newer ZIP.
3. Hardened familiar save migration. Invalid, missing, negative, nonnumeric, or out-of-range familiar levels/XP are normalized safely.
4. Stopped familiar XP from growing after Level 20 and normalized max-level XP to zero.
5. Optimized the optional Three.js atmosphere renderer so animation time does not jump after backgrounding and rendering work pauses while the tab is hidden.
6. Updated package and lock-file versions to 32.4.1.
7. Removed the incomplete packaged `node_modules` directory. It contained no usable Vite executable and could cause misleading build failures. `npm install` remains the correct dependency setup path.
8. Removed `styles.original.css`, an obsolete duplicate stylesheet not loaded by the game.
9. Excluded macOS `__MACOSX` metadata from the cleaned archive.
10. Added this audit record and refreshed `PROJECT_STATE.md`.

## Validation performed

- `node --check` on every JavaScript source file
- Static scan of literal `assets/...` references
- ZIP integrity test after packaging
- Duplicate runtime-entry review
- Save-version and legacy-key review

## Known architecture notes

- The active battle engine remains a large single file (`src/Battle/game.js`). It is functional, but future major systems should be extracted by domain only during a dedicated refactor build because splitting it casually would create a high regression risk.
- The optional atmosphere layer downloads Three.js from jsDelivr. The game continues without that layer when offline or blocked.
- Historical patch-note files are intentionally retained as project history; they are documentation, not active code.
