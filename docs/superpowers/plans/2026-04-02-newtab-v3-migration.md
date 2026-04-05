# Newtab V3 Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the `newtab` migration so runtime and storage use only `SpaceV3[]`, without lossy legacy round-trips during data mutations.

**Architecture:** Keep `SpaceV3[]` as the only mutable runtime model. Restrict legacy adapters to temporary read-only compatibility boundaries, then replace those boundaries incrementally with direct `v3` reads. Treat `docs/tech-debt/0204-1.json` as the reference backup shape that must round-trip without losing `group`, `collapsed`, or `objectType`.

**Tech Stack:** TypeScript, React, reducer-based state, Chrome extension storage APIs, Jest.

---

## Current Findings

- Runtime state already stores `spaces: SpaceV3[]` in [src/newtab/state/state.ts](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/state/state.ts).
- Storage writes `version = 3`, but load path still trusts shape and does not perform an explicit one-time migration in [src/newtab/state/storage.ts](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/state/storage.ts).
- Lossy mutations still exist in [src/newtab/state/actionHelpers.ts](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/state/actionHelpers.ts) because `updateSpace`, `updateFolder`, `updateFolderItem`, and most lookup helpers convert `v3 -> legacy -> v3`.
- Cross-space folder move still mutates through legacy objects in [src/newtab/state/actions.ts](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/state/actions.ts).
- UI still relies on legacy compatibility views in [src/newtab/components/App.tsx](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/components/App.tsx) and preload helpers in [src/newtab/newtab.tsx](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/newtab.tsx).
- Reference backup [docs/tech-debt/0204-1.json](/Users/romanfomin/rmfomin-projects/tmex/docs/tech-debt/0204-1.json) is already a real `v3` file:
- `version: 3`, `isTabowski: true`
- 1 space, 24 folders, 22 groups, 133 top-level bookmarks
- folder-level `collapsed` exists on all folders
- group-level `collapsed` exists at least once
- some groups omit `objectType`, so normalization must continue to fill it

## Target File Contract

The supported persisted/exported file after migration should match the `DataBackupV3` contract from [src/newtab/helpers/types.ts](/Users/romanfomin/rmfomin-projects/tmex/src/newtab/helpers/types.ts):

- Top level: `{ isTabowski: true, version: 3, spaces: SpaceV3[] }`
- Each space must include `id`, `position`, `objectType: "space"`, `title`, `folders`, optional `widgets`
- Each folder must include `id`, `position`, `objectType: "folder"`, `title`, `items`, optional `color`, optional `collapsed`
- Each item must preserve `type`
- Bookmark items must preserve `url`, `favIconUrl`, and normalize `objectType: "bookmark"`
- Group items must preserve `groupItems`, optional `collapsed`, and normalize `objectType: "group"`
- Export/import of `0204-1.json` must not flatten groups or drop collapse state

## Execution Order

1. Stop data loss in reducers/helpers.
2. Add explicit storage migration and normalization.
3. Lock behavior with tests around `0204-1.json`-like structures.
4. Migrate read paths from legacy view to direct `v3`.
5. Remove dead legacy mutation paths once UI no longer depends on them.

## Chunk 1: Protect Mutable V3 Data

### Task 1: Add characterization tests for lossy cases

**Files:**
- Create: `src/__tests__/dataFormatAdapters.test.ts`
- Create: `src/__tests__/actionHelpers.v3.test.ts`
- Test: `src/__tests__/dataFormatAdapters.test.ts`
- Test: `src/__tests__/actionHelpers.v3.test.ts`

- [ ] **Step 1: Write a failing adapter characterization test**

Add a test that builds a minimal `DataBackupV3` containing:
- one folder with `collapsed: true`
- one `group` item with `collapsed: true`
- bookmarks inside `groupItems`

Assert that converting through legacy adapters loses information today, so the team has a pinned regression case before refactor.

- [ ] **Step 2: Write a failing mutation safety test**

Add a test that calls `updateFolder`, `updateFolderItem`, and `updateSpace` on a `SpaceV3[]` fixture with a grouped item and folder `collapsed`.

Expected after refactor:
- group remains a `group`
- `groupItems` stay nested
- folder `collapsed` survives
- unrelated `objectType` fields are preserved or normalized

- [ ] **Step 3: Run targeted tests to confirm current failure mode**

Run: `npm test -- --runInBand src/__tests__/dataFormatAdapters.test.ts src/__tests__/actionHelpers.v3.test.ts`

Expected before implementation:
- at least one failure showing data loss or unexpected flattening

- [ ] **Step 4: Commit**

```bash
git add src/__tests__/dataFormatAdapters.test.ts src/__tests__/actionHelpers.v3.test.ts
git commit -m "test: capture newtab v3 mutation regressions"
```

### Task 2: Rewrite mutable helpers to operate on `SpaceV3[]`

**Files:**
- Modify: `src/newtab/state/actionHelpers.ts`
- Modify: `src/newtab/helpers/types.ts`
- Test: `src/__tests__/actionHelpers.v3.test.ts`

- [ ] **Step 1: Introduce v3-native lookup helpers**

Replace legacy-based implementations of:
- `findItemById`
- `findFolderById`
- `findSpaceByFolderId`
- `findSpaceById`
- `findFolderByItemId`

with direct traversal of `SpaceV3[]`.

Important:
- searching by item id must check both top-level bookmarks and `groupItems`
- return types can stay legacy-shaped only where network code still needs them, but lookup source must be `v3`

- [ ] **Step 2: Rewrite `updateSpace` and `updateFolder`**

Implement direct immutable updates over `SpaceV3[]` only:
- map spaces/folders directly
- sort only when position changed
- never call `getLegacySpacesView` or `convertLegacySpacesToV3Backup`

- [ ] **Step 3: Rewrite `updateFolderItem` with explicit group support**

Support updating:
- a top-level bookmark item
- a bookmark nested inside `group.groupItems`

Do not treat `group` itself as a bookmark.

- [ ] **Step 4: Update types if needed**

If network-only legacy fields such as `remoteId`, `archived`, `twoColumn`, or `inEdit` are still referenced during transition, extend `v3` runtime types explicitly instead of relying on hidden legacy round-trips.

- [ ] **Step 5: Run tests**

Run: `npm test -- --runInBand src/__tests__/actionHelpers.v3.test.ts`

Expected:
- all new v3 mutation tests pass

- [ ] **Step 6: Commit**

```bash
git add src/newtab/state/actionHelpers.ts src/newtab/helpers/types.ts src/__tests__/actionHelpers.v3.test.ts
git commit -m "refactor: make newtab action helpers mutate v3 directly"
```

### Task 3: Remove reducer-level legacy mutation branches

**Files:**
- Modify: `src/newtab/state/actions.ts`
- Test: `src/__tests__/actionHelpers.v3.test.ts`

- [ ] **Step 1: Refactor cross-space folder move**

Replace the `getLegacySpacesView(...).map(...)` branch in `Action.MoveFolder` with direct `SpaceV3[]` manipulation.

Preserve:
- folder `collapsed`
- folder `items`
- nested groups
- `widgets` in both spaces

- [ ] **Step 2: Audit reducer callers of helper APIs**

Check all reducer cases that depend on:
- `findItemById`
- `findFolderById`
- `findFolderByItemId`
- `updateFolderItem`

Make sure they still behave correctly when item ids can live inside `groupItems`.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- --runInBand src/__tests__/actionHelpers.v3.test.ts`

Expected:
- reducer-related v3 cases pass without legacy conversion

- [ ] **Step 4: Commit**

```bash
git add src/newtab/state/actions.ts src/__tests__/actionHelpers.v3.test.ts
git commit -m "refactor: remove legacy round-trip from newtab reducer mutations"
```

## Chunk 2: Make Storage Migration Explicit

### Task 4: Normalize and migrate storage input on load

**Files:**
- Modify: `src/newtab/state/storage.ts`
- Modify: `src/newtab/helpers/dataFormatAdapters.ts`
- Modify: `src/newtab/newtab.tsx`
- Create: `src/__tests__/storageMigration.test.ts`
- Test: `src/__tests__/storageMigration.test.ts`

- [ ] **Step 1: Extract a storage migration function**

Create one entry point that accepts raw storage payload and returns normalized saving state:
- if data is already `v3`, normalize `objectType`
- if data is legacy `v2`, convert once to `v3`
- if `spaces` is missing, fall back to defaults

- [ ] **Step 2: Use migration during `getStateFromLS`**

Ensure `getStateFromLS` returns `spaces` only in `SpaceV3[]` form, not mixed-shape data.

- [ ] **Step 3: Add tests for legacy and v3 load paths**

Cover:
- raw `version: 2` backup-like state
- raw `version: 3` state with missing `objectType`
- empty storage state

- [ ] **Step 4: Run tests**

Run: `npm test -- --runInBand src/__tests__/storageMigration.test.ts`

Expected:
- explicit migration behavior is verified

- [ ] **Step 5: Commit**

```bash
git add src/newtab/state/storage.ts src/newtab/helpers/dataFormatAdapters.ts src/newtab/newtab.tsx src/__tests__/storageMigration.test.ts
git commit -m "refactor: migrate stored newtab data to v3 on load"
```

### Task 5: Make export path use real v3 input

**Files:**
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Create: `src/__tests__/importExportHelpers.v3.test.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Change export API to accept `SpaceV3[]`**

`onExportJson` should export the actual runtime model instead of pretending export starts from `LegacySpace[]`.

- [ ] **Step 2: Keep import backward compatibility**

Retain temporary support for:
- legacy array backup
- `{ version: 2 }`
- `{ version: 3 }`

But make `v3` import/export the default path.

- [ ] **Step 3: Add tests using a `0204-1.json`-style fixture**

Verify:
- export preserves groups
- export preserves folder `collapsed`
- re-import normalizes missing `objectType` without changing structure

- [ ] **Step 4: Run tests**

Run: `npm test -- --runInBand src/__tests__/importExportHelpers.v3.test.ts`

Expected:
- v3 import/export behavior is stable

- [ ] **Step 5: Commit**

```bash
git add src/newtab/helpers/importExportHelpers.ts src/__tests__/importExportHelpers.v3.test.ts
git commit -m "refactor: export and import real newtab v3 backups"
```

## Chunk 3: Shrink Read-Only Legacy Surface

### Task 6: Replace preload logic that only needs bookmark iteration

**Files:**
- Modify: `src/newtab/newtab.tsx`
- Create: `src/newtab/helpers/v3Traversal.ts`
- Create: `src/__tests__/v3Traversal.test.ts`
- Test: `src/__tests__/v3Traversal.test.ts`

- [ ] **Step 1: Add traversal utilities for `SpaceV3[]`**

Implement small read-only helpers:
- iterate all bookmark items
- iterate nested `groupItems`
- detect archived/hidden compatibility state if still needed

- [ ] **Step 2: Replace legacy-view usage in preload**

Use v3 traversal in:
- favicon pre-registration
- hidden feature detection

- [ ] **Step 3: Run tests**

Run: `npm test -- --runInBand src/__tests__/v3Traversal.test.ts`

Expected:
- preload helpers can read v3 directly

- [ ] **Step 4: Commit**

```bash
git add src/newtab/newtab.tsx src/newtab/helpers/v3Traversal.ts src/__tests__/v3Traversal.test.ts
git commit -m "refactor: read newtab preload data directly from v3"
```

### Task 7: Migrate React UI away from legacy app state

**Files:**
- Modify: `src/newtab/components/App.tsx`
- Modify: `src/newtab/components/Sidebar.tsx`
- Modify: `src/newtab/components/Bookmarks.tsx`
- Modify: `src/newtab/components/Folder.tsx`
- Modify: `src/newtab/components/FolderItem.tsx`
- Modify: `src/newtab/components/SidebarItem.tsx`
- Modify: `src/newtab/components/SidebarRecent.tsx`
- Modify: `src/newtab/components/dropdown/FolderItemMenu.tsx`
- Modify: `src/newtab/helpers/legacyAppStateView.ts`
- Test: affected component tests if present

- [ ] **Step 1: Inventory legacy-only UI assumptions**

Find places where UI assumes:
- all folder items are flat bookmarks
- groups do not exist
- folder collapse or group collapse is ignored

- [ ] **Step 2: Move one component boundary at a time**

Suggested order:
1. `Bookmarks`
2. `Folder`
3. `FolderItem`
4. sidebar components

At each boundary, switch prop types from legacy view to `SpaceV3`-aware props.

- [ ] **Step 3: Delete `getLegacyAppStateView` once no component depends on it**

Do not remove adapter code before all component boundaries are migrated.

- [ ] **Step 4: Run app-facing test suite**

Run: `npm test -- --runInBand`

Expected:
- no component still requires `LegacySpace[]` to render

- [ ] **Step 5: Commit**

```bash
git add src/newtab/components/App.tsx src/newtab/components src/newtab/helpers/legacyAppStateView.ts
git commit -m "refactor: migrate newtab ui reads from legacy view to v3"
```

## Chunk 4: Remove Transitional Legacy Mutation Support

### Task 8: Reduce adapters to compatibility-only responsibilities

**Files:**
- Modify: `src/newtab/helpers/dataFormatAdapters.ts`
- Modify: `src/newtab/state/actionHelpers.ts`
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Test: relevant existing tests

- [ ] **Step 1: Remove unused mutation-facing adapter calls**

After previous chunks, verify that no write path depends on:
- `getLegacySpacesView`
- `convertLegacySpacesToV3Backup`

inside reducers or action helpers.

- [ ] **Step 2: Keep only temporary import compatibility**

The remaining legacy adapter responsibilities should be limited to:
- loading old backups
- optional emergency compatibility helpers if still used by a not-yet-migrated UI seam

- [ ] **Step 3: Update docs**

Mark completed items in [docs/tech-debt/newtab-v3-migration.md](/Users/romanfomin/rmfomin-projects/tmex/docs/tech-debt/newtab-v3-migration.md) and note what legacy support still remains.

- [ ] **Step 4: Run full verification**

Run:
- `npm test -- --runInBand`

Expected:
- all tests green
- no known lossy mutation path remains

- [ ] **Step 5: Commit**

```bash
git add src/newtab/helpers/dataFormatAdapters.ts src/newtab/state/actionHelpers.ts src/newtab/helpers/importExportHelpers.ts docs/tech-debt/newtab-v3-migration.md
git commit -m "chore: finish newtab v3 migration and trim legacy adapters"
```

## Completion Criteria

- `SpaceV3[]` is the only mutable runtime format
- storage load path performs explicit migration/normalization
- `0204-1.json` imports and exports without flattening groups
- updating a folder/item/space cannot drop `group`, `groupItems`, or `collapsed`
- `App` no longer needs a full legacy app-state view to render
- legacy adapters remain only where intentionally required for old backup compatibility
