# THE VILLAGE — Code Audit & Cleanup (V29.2)

Baseline audited: V29.1. All changes below are applied in this build.

---

## 1. Critical: one line was disabling 18% of the game

**`src/Battle/game.js` line 1417**

```js
$('#kingdomBack').onclick=()=>openScreen(UI.menu);
$('#achievementsBtn').onclick=()=>{...};   // #achievementsBtn is not in index.html
$('#achievementsBack').onclick=()=>openScreen(UI.menu);
```

`#achievementsBtn` was removed from `index.html` when Achievements moved to the
`[data-more-target]` handler on line 1414. `$()` is `document.querySelector`, so
the expression was `null`, and `null.onclick = ...` threw:

```
TypeError: Cannot set properties of null (setting 'onclick')
```

This ran at **top-level module scope with no try/catch**, so JavaScript aborted
the rest of the module. **Lines 1418–1732 never executed — 315 lines, 18.2% of
the file.**

### Systems that were written but never wired up

| Lines | Feature |
|---|---|
| 1666–1709 | **The entire Village builder** — build button, build tray, plot construction, zoom, centre, pan, pinch, wheel |
| 1473–1482 | Cards screen: `#mergeOnly`, `#deckTypeFilter`, `#deckSort` |
| 1422–1431 | `window.__returnToCardsDeck` (inspector return button) |
| 1432–1469 | `bindClick` helper and all HUD pointer/click bindings |
| 1504–1534 | `syncNativeBattleControls` battle-HUD bridge |
| 1543–1544 | Audio panel and all audio settings |
| 1563–1564 | `setAppHeight` resize / orientationchange (mobile layout) |

**The Village builder was never unfinished. It was unreachable.**

### Fix

```js
$('#achievementsBtn')?.addEventListener('click',()=>{openScreen($('#achievementsScreen'));renderAchievements()});
```

Optional chaining, matching the style already used on the following line.

---

## 2. Dead code removed

- `$('#endlessBtn')?.addEventListener(...)` — `#endlessBtn` is not in `index.html`. The listener could never fire. (`freshGame('endless')` still exists and can be re-hooked.)
- `$('#collectionScreen')` in the `openScreen` hide-list — element does not exist.

---

## 3. `styles.css` consolidation

### The underlying problem

**5,225 of 9,927 declarations (52.6%) carry `!important`.** Each iteration
forced its overrides to win with `!important` rather than editing the existing
rule, so specificity and source order stopped being meaningful and the file
became append-only. That is why the same selector appears up to 17 times.

### What was done

230 redundant duplicate rule blocks were merged.

| | Before | After |
|---|---|---|
| Bytes | 335,091 | 309,283 |
| Lines | 4,064 | 2,711 |
| Duplicate selector groups | 468 | 284 |

**Verification:** the stylesheet was re-parsed after consolidation and the final
computed value of every property was compared against the original for all
**2,079 selectors. Zero mismatches.**

A group was only merged when it was *provably* safe — that is, when no rule
between the earlier and later occurrences could both (a) match the same element,
(b) declare the same property, and (c) win on specificity and importance.

### What was deliberately left alone

284 duplicate groups still carry real cascade risk. The largest:

| Occurrences | Selector |
|---|---|
| 17 | `#deckScreen .deck-zone` |
| 16 | `#deckScreen .card-file-tabs` |
| 14 | `#deckScreen>.cards-deck-panel` |
| 14 | `#deckScreen .sticky-actions` |
| 14 | `#deckScreen #collectionCards .portrait-card.compact-card` |
| 13 | `#deckScreen .collection-divider` |

These are the worst offenders and the most tempting to clean, but they
interleave with each other and merging them **would** change rendered output.
They need a browser and a human eye, one screen at a time. Mechanical
consolidation cannot safely resolve them.

The original stylesheet is preserved as `styles.original.css`.

---

## 4. Confirmed healthy

- `node --check` passes on all four JS files.
- All 23 asset paths referenced in code resolve to files that exist — **no broken asset references**.
- After the fix, no unguarded JS reference targets an element that exists nowhere.
- `#closeInspect` and `#detailFavorite` are created via `innerHTML` immediately before use — safe.

---

## 5. Not changed

No gameplay, balance, save schema, card, tower, or progression values were
touched. No content IDs renamed. Save compatibility unaffected.

---

## 6. Recommended next steps

1. **Run this build and confirm the Village builder, Cards filters, and audio
   panel now respond.** A large amount of code has not been executing, so any
   judgement about what is missing should be re-made after this.
2. Then take the 284 remaining CSS groups screen by screen, in a browser.
   Replacing `!important` with correct specificity is the real fix.
3. Only then design progression, towers, merges and unlockables — against a
   codebase that is actually running.
