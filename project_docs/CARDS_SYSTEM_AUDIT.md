# CARDS SYSTEM AUDIT — V27.1.2 CLEANED BASELINE

## Status

The Cards data and controller logic exist, but the screen remains a high-risk interface because presentation rules accumulated over many versions. This audit is based on source inspection, not a claim of successful iPad testing.

## Existing Functional Paths

- Bottom navigation opens `#deckScreen` and calls `renderDeck()`.
- Six deck slots are rendered from `save.deck`.
- Clicking an equipped slot removes that card.
- Collection cards open `#cardInspectScreen`.
- Equip/Remove buttons update the deck through `setDeckCard()`.
- Tabs set card type filters.
- Sort, Merge Ready, Merge All, Save Deck, inspector back, and main Cards back have handlers.
- Changes persist through `saveProgress()`.

## Primary Risk: CSS Collision

`styles.css` repeatedly defines the same Cards selectors across desktop, phone, tablet-emulation, and later repair blocks. Many declarations use `!important`. This makes the rendered result dependent on rule order and exact viewport dimensions, producing:

- inconsistent card proportions;
- tiny equipped cards beside oversized collection cards;
- hidden stats and labels at some widths;
- sticky controls overlapping content;
- pointer targets that do not align with visible elements;
- unpredictable breakpoint transitions.

## Interaction Risks

- Parent collection cards and nested Equip/Remove buttons share the same area. Source correctly stops propagation, but overlays must not cover the button.
- Locked-card overlays, favorite corners, type corners, merge chips, and sticky action layers all require explicit pointer behavior.
- The Cards screen must fully disable or sit above the battle canvas input layer.
- Horizontal tab scrolling must not swallow taps.

## Recovery Recommendation

1. Copy this ZIP and label it read-only baseline.
2. Identify every Cards-specific selector and remove obsolete blocks.
3. Add one Cards section with explicit desktop/tablet/phone rules.
4. Keep current IDs and data functions.
5. Add temporary pointer diagnostics.
6. Test each action on iPad before visual embellishment.
7. Only then remove diagnostics and publish V27.2.

## Acceptance Checklist

- [ ] All six equipped slots are identical in size.
- [ ] All collection cards are identical within the grid.
- [ ] Text remains readable without overlapping artwork or buttons.
- [ ] Every category tab activates and updates the collection.
- [ ] Sort and Merge Ready work.
- [ ] Every card opens inspection.
- [ ] Equip/Remove works without accidentally opening inspection.
- [ ] Merge All is clickable only when valid.
- [ ] Save Deck enforces exactly six cards.
- [ ] Back and bottom navigation always work.
- [ ] The page scrolls fully above the bottom navigation.
- [ ] No battle canvas or hidden overlay intercepts Cards input.
- [ ] State survives reload and orientation change.
