# THE VILLAGE — SAVE SCHEMA

**Current schema version: 15** (`ASCENSION_SAVE_VERSION` in
`src/Ascension/registry.js`).

Player progress is the one thing in this project that cannot be rebuilt. Read
this before changing anything that is written to storage.

---

## Storage keys

Everything lives in `localStorage`. There is no IndexedDB.

| Key | Owner | Contents |
|---|---|---|
| `relicsEclipseSave` | `src/Battle/game.js` | **The main save.** Campaign, cards, Shadow, familiars, equipment, gems, relics, village economy and progression, settings, stats |
| `gateRunnerSave` | legacy | Read-only fallback for pre-rename saves |
| `theVillageFreshTownV1Plots` | `src/villageBootstrap.js` | Which building sits on which plot |
| `rotkVillagePlots`, `rotkVillagePlotsV224B` | legacy | Older plot stores |
| `rotk.village.living.v31_3` | `src/villageBootstrap.js` | Claimed secrets, visit counts, weather seed |
| `rotk.village.juice.v31_5` | `src/villageBootstrap.js` | In-progress constructions, blessings, trophies, the active village event |
| `village.vk.mode`, `village.tactical.mode` | easter eggs | Toggle state |
| `villageFreshStartToken` | `src/Battle/game.js` | Historical marker, retained so old builds do not re-trigger a wipe |
| `relicsEclipseSave_backup_v35` | `src/Battle/game.js` | Pre-migration copy, written once when an older save is upgraded |
| `village.saveRecovery.*` | `src/Battle/game.js` | Automatic backups and quarantined damaged saves |
| `village.cloud.*` | `src/online/cloudSave.js` | Cloud migration markers and the per-account local cache |
| `village.feedback.pending` | `src/online/feedbackSystem.js` | Queued tester reports |
| `village.debug` | `src/config/debug.js` | Active debug channels (per device) |

### Which keys count as progress

Three places decide, and **they must agree**:

- `SAVE_KEY_PATTERN` / `EXCLUDED_KEY_PATTERN` in `src/online/cloudSave.js` — what
  is uploaded to the cloud.
- `SAVE_KEY_PATTERN` / `SAVE_KEY_EXCLUDED` / `isSaveKey()` in
  `src/Battle/game.js` — what reaches an export, a backup and a restore.
- `RESET_PREFIXES` in `src/Battle/game.js` — what a full reset erases.

All three currently match:

```
/^(relicsEclipse|gateRunner|rotkVillage|rotk\.village\.|theVillage|village\.)/
```

with `village.(cloud.|saveRecovery.|feedback.|debug)` excluded from the first
two.

> A key that is written by the game but matches none of these is **invisible**:
> it will not sync, will not export, will not restore, and will survive a reset
> that was supposed to clear it. The `rotk.village.*` stores spent several
> releases in exactly that state. **If you add a storage key, add it here and to
> those patterns in the same change.**

---

## Save flow

### Load — `src/Battle/game.js`, module evaluation

1. Read `relicsEclipseSave`, falling back to `gateRunnerSave`.
2. `JSON.parse`. On failure, or if the result is not a plain object, copy the
   raw text to `village.saveRecovery.damaged.<timestamp>` (three kept) and
   continue with a new profile. **A damaged save is never overwritten
   unexamined.** `null` is the ordinary "no save yet" case and is not
   quarantined.
3. If the loaded `saveVersion` is below the current one, write
   `relicsEclipseSave_backup_v35` before migrating.
4. Normalise every field (see below).
5. Set `saveVersion` to `ASCENSION_SAVE_VERSION` and `gameVersion` to the
   release version.
6. `registerSaveProvider()` hands the live object to the cloud adapter.

### Save — `saveProgress(reason)`

Serialises the whole save object to `relicsEclipseSave` synchronously, then
calls `queueCloudSave(reason)`, which debounces a cloud write by 5 seconds. With
no signed-in account `queueCloudSave` returns immediately and local storage is
the only copy.

Autosave triggers: every meaningful state change (46 call sites), a 45-second
periodic check that only writes when the save fingerprint changed, and a flush
when the page is backgrounded.

### Cloud — `src/online/cloudSave.js`

The cloud stores a bundle of *storage entries*, not the game object:

```json
{
  "format": "the-village-cloud-save",
  "schemaVersion": 1,
  "gameVersion": "36.0.0",
  "savedAt": "…",
  "entries": { "relicsEclipseSave": "…", "rotk.village.living.v31_3": "…" }
}
```

Writes are revisioned; a mismatch surfaces as `CLOUD_REVISION_CONFLICT` and asks
the player to reload rather than overwriting. Local storage is always written
first, so a failed cloud write never costs progress.

### Export / import — Save Manager

The same shape, `format: "the-village-save-bundle"`, downloaded as JSON. Import
writes a `village.saveRecovery.preRestoreBackup` before replacing anything.

---

## Migration

There are no numbered migration steps. Instead, **load-time normalisation** runs
on every boot and is idempotent: each field is coerced to its expected shape,
defaulted when missing, and filtered against the current registries (unknown
card, relic, gem, fusion and chapter ids are dropped). An old save and a current
save go through the same code.

Version-specific repairs are the exception and are written as explicit
conditionals, for example:

- `previousSaveVersion < 6` resets the deck to the default six.
- Saves that completed `monastery`, hold `draculaTooth`, or are above Shadow
  level 1 are granted the Chapter 1 awakening retroactively.
- Chapters below `campaign.unlocked` that are missing from `campaign.completed`
  are backfilled.

### Rules for changing the schema

1. **Never rename or repurpose an existing field.** Add a new one.
2. **Never delete a field** other code may still read. Stop writing it first,
   remove it a release later.
3. Bump `ASCENSION_SAVE_VERSION` for any structural change.
4. Guard the repair with `previousSaveVersion < N` so it runs once.
5. Normalisation must tolerate every earlier shape, including missing and
   wrong-typed fields. Assume a save from any past version can arrive.
6. If a change cannot be made backward-compatible, write a pre-migration backup
   under a new `relicsEclipseSave_backup_vNN` key first.
7. Test three profiles: fresh, current-version, and a save from the version
   before your change.

---

## Main save object

Top-level fields on `relicsEclipseSave`:

```
saveVersion, gameVersion
campaign { unlocked, completed[], selected, stars{}, replayClears{} }
unlocked[]            card ids the player owns
inventory {}          per card: copies, rarity, level, xp, gemSlots[2], lastFound
deck[6], favorites[]
cardFragments {}
shadowLevel, selectedHero, heroLevels{}, heroJP{}, heroJobs{}, heroEquipment{}
jpAwardedStages[], groundDefenseSlots[]
familiars { equipped, unlocked[], progress{} }
ascension { fragments{}, gems{}, discoveredFusions[], equipmentInventory[], equipped{}, chapterGemRewards[] }
unlockedRelics[], equippedRelic, uniqueBossDrops{}
villageEconomy {}     resource totals and the last production timestamp
villageProgression { era, researched[], artifacts[], chronicle[], flags{}, … }
kingdom { buildings{}, renown }
materials {}, stats {}, achievements { claimed[] }, cosmetics {}
settings { audio, music, sfx, musicVolume, sfxVolume, ambienceVolume }
ui { cardFilter, cardSort }
bestWave, essence, tutorialSeen, runHistory[], discoveredEnemies{}, discoveredMaps{}
```

---

## Recovery

If a player reports lost progress, ask them for, in order:

1. `village.saveRecovery.damaged.*` — the exact text of a save that would not load.
2. `village.saveRecovery.initialBackup` — the state at their first safe start.
3. `village.saveRecovery.preRestoreBackup` — the state before their last import.
4. `relicsEclipseSave_backup_v35` — the state before the last schema migration.
5. The cloud save, if they have an account.

The Save Manager (More → Save Manager) exports all of it as one file.
