# Newtab V3 Migration Tech Debt

## Context

Current uncommitted changes switch `newtab` runtime storage from legacy `ISpace[]` to `SpaceV3[]`, but most UI and part of the reducer logic still operate on legacy structures through adapters.

This commit is intentionally treated as an intermediate migration step.

## Known Risks

### Lossy conversions in state updates

`src/newtab/state/actionHelpers.ts` now converts `SpaceV3[]` to legacy and back inside `updateSpace`, `updateFolder`, and `updateFolderItem`.

This is not safe for real `v3` data:

- `group` items are flattened into plain bookmarks
- `collapsed` fields are dropped
- legacy-only and network-related fields are not preserved consistently
- any action that rewrites folders/items can silently destroy `v3`-specific structure

### Storage migration is incomplete

`src/newtab/state/storage.ts` now saves `spaces` as-is and forces `version = 3`, but old local data is not explicitly migrated on read.

This leaves a transitional state where:

- old users may still have legacy-shaped `spaces`
- the code relies on runtime shape detection via `objectType`
- the stored `version` no longer guarantees the actual payload format

### Legacy adapter remains in the hot path

UI components currently receive legacy views via `legacyAppStateView`.

That keeps the app working short-term, but it means the migration is not complete and further features can accidentally keep depending on the deprecated model.

## Follow-up Work

1. Make reducer updates operate on native `SpaceV3` structures without round-tripping through legacy adapters.
2. Decide and implement an explicit one-time migration path for old local storage data.
3. Limit legacy adapters to read-only compatibility boundaries, then remove them from runtime state flows.
4. Add regression coverage for `v3`-only structures such as grouped items and collapsed states.

## Commit Intent

This document records why the intermediate commit exists and what must be addressed before considering the `v3` migration complete.
