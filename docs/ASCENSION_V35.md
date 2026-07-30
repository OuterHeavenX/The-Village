# The Village 35.0.0 — Ascension

Ascension adds a data-driven progression layer without replacing the existing
card, campaign, Village, or cloud-save formats.

## Content registry

`src/Ascension/registry.js` is the single configuration source for equipment,
equipment slots, extensible statistics, elements, Gems I–III, known and hidden
fusion recipes, support cards and effects, companion definitions and behavior,
relic definitions and effects, and boss-loot tables.

The battle engine consumes generic effect maps and behavior types. New records
can be appended without adding item-, relic-, support-, or companion-ID
branches to gameplay logic. Boss drop counts, tier boundaries, fragment rules,
and guaranteed Gem rewards are configuration values.

Registry exports:

- `EQUIPMENT_REGISTRY`
- `ELEMENT_REGISTRY` and `GEM_REGISTRY`
- `FUSION_REGISTRY`
- `COMPANION_REGISTRY` and `COMPANION_BEHAVIOR_REGISTRY`
- `SUPPORT_REGISTRY` and `SUPPORT_EFFECT_REGISTRY`
- `RELIC_REGISTRY`
- `BOSS_LOOT_REGISTRY`

## Save migration

V35 uses save schema `15`. Earlier saves are backed up to
`relicsEclipseSave_backup_v35`, then normalized with an `ascension` object.
Existing cards, progression, Village data, settings, cloud data, companions,
and loadouts are preserved.

## Progression

- Chapter 5 first clear: Fire Gem I.
- Chapter 8 first clear: Ice Gem I.
- Chapter 10 first clear: Lightning Gem I.
- Chapter bosses award tier-appropriate equipment and elemental fragments.
- Ten matching fragments craft a level-I gem.
- Fusion consumes the two displayed level-I elemental gems.
- Hidden recipes reveal permanently after their first successful fusion.

Shadow has Weapon, Helmet, Armor, Gloves, Boots, and two Accessory slots.
Equipment contributes open-ended stat maps plus explicit Faith and Bravery.

Test loading a pre-V35 save, the Chapter 5/8/10 rewards, boss replays,
equipment changes, gem socket/remove, fragment crafting, hidden fusion, and
support capacity at each rarity.
