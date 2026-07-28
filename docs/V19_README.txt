Relics of the Kingdom V19.0 - Stability & Refinement Audit

Verified in this build:
- Production build completes successfully with Vite.
- JavaScript modules parse and bundle successfully.
- Twelve campaign chapters and permanent three-star chapter ratings are present.
- Existing save migration preserves campaign, deck, inventory, relic, hero, and kingdom data.
- Boss health UI, chapter guardians, elite enemy rolls, relic vault, Living Codex, and kingdom upgrades are present.
- The confirmed compact mobile Cards layout remains unchanged.

Refinement applied:
- Fixed an iOS touch interception defect that could cancel Cards-page scrolling when a swipe began over the hero panel, battle deck, ground defenses, filters, or controls. The entire Cards screen now participates in the same native vertical scroll gesture.
- Updated stale browser cache/version labels so devices do not keep loading an older CSS or JavaScript build.
- Updated the visible milestone label and document title to identify this package correctly.

Scope note:
This is a stability/refinement release. It does not claim twelve fully unique multi-phase boss implementations. The current battle engine includes a shared boss framework plus several type-specific summon/frost behaviors; deeper handcrafted boss phases remain future gameplay work.
