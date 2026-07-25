# Local-only data model Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all HTTP/API synchronization and retain a local-only Tablo backed by `chrome.storage.local`.

**Architecture:** Bookmark entities and `AppState` carry only local data. A strict v3 normalizer reconstructs data from an allow-list for storage, import, and export, then immediately persists a cleaned version of old local data. The UI no longer schedules API commands, and both extension manifests no longer request host access.

**Tech Stack:** TypeScript, React 18, Jest, webpack, Chrome Extension Manifest V3.

---

## Chunk 1: Make the local data contract explicit

### Task 1: Define and test strict v3 normalization

**Files:**
- Modify: `src/newtab/helpers/types.ts`
- Modify: `src/newtab/helpers/dataFormatAdapters.ts`
- Modify: `src/newtab/state/storage.ts`
- Modify: `src/__tests__/dataFormatAdapters.test.ts`
- Modify: `src/__tests__/storageMigration.test.ts`

- [ ] **Step 1: Write failing normalization tests**

Add fixtures containing `remoteId` on a space, folder, top-level bookmark,
group, and group bookmark. Assert `normalizeBackupV3()` returns only the local
v3 properties, preserves sorting, and removes every `remoteId`. In
`storageMigration.test.ts`, replace the current v2-migration expectation with
a failing assertion that pre-v3 stored data resolves to the empty local state.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- src/__tests__/dataFormatAdapters.test.ts src/__tests__/storageMigration.test.ts --runInBand`

Expected: FAIL because the current spread-based normalizer preserves
`remoteId`.

- [ ] **Step 3: Replace the mixed legacy model with local types**

In `types.ts`, delete `LegacyObject`, `LegacySpace`, `LegacyFolder`,
`LegacyFolderItem`, `LegacyFolderItemApiPayload`, and
`LegacyFolderApiPayload`. Make `FolderItemToCreate` an explicit local input
shape (`id`, `title`, `url`, `favIconUrl`, optional `position`/`isSection`),
and remove `remoteId` from all v3 entities.

- [ ] **Step 4: Implement an allow-list normalizer**

Rewrite `dataFormatAdapters.ts` so the module exports only v3 normalization
operations. Each normalizer must construct a new object from explicit local
properties; do not spread imported data. Validate a space and folder by their
required `objectType` and every item by `type`; treat missing item
`objectType` as valid legacy-v3 input and canonicalize it. Expose validation
separately from normalization so callers can distinguish invalid input from a
valid empty v3 backup. Delete every server-payload and v2 conversion function.

- [ ] **Step 4a: Switch storage to the strict normalizer in the same change**

Replace `getV3SpacesView()` in `storage.ts` with the new v3-only normalizer
before deleting that export. On invalid/pre-v3 storage, use the empty local
state; on valid v3 storage, normalize it, including item records that omit the
optional `objectType`. This keeps the reducer test graph buildable for Chunk 2.

- [ ] **Step 5: Run the focused test and verify GREEN**

Run: `npm test -- src/__tests__/dataFormatAdapters.test.ts src/__tests__/storageMigration.test.ts --runInBand`

Expected: PASS.

## Chunk 2: Remove runtime synchronization

### Task 2: Remove API state and command execution

**Files:**
- Delete: `src/api/api.ts`
- Delete: `src/api/serverCommands.ts`
- Delete: `src/types/api.ts`
- Modify: `src/newtab/state/state.ts`
- Modify: `src/newtab/state/actions.ts`
- Modify: `src/newtab/components/root/App.tsx`
- Modify: `src/newtab/state/actionHelpers.ts`
- Modify: `src/newtab/helpers/fractionalIndexes.ts`
- Modify: `src/newtab/helpers/utils.ts`
- Modify: `src/__tests__/stateReducer.collapsed.v3.test.ts`
- Modify: `src/__tests__/stateReducer.moveFolder.v3.test.ts`
- Modify: `src/__tests__/getBookmarksViewState.test.ts`

- [ ] **Step 1: Remove test fixtures tied to API state**

Delete `@/api/api` mocks and `apiCommandsQueue`, `apiCommandId`, and
`apiLastError` fixture fields. Keep the existing local CRUD assertions intact.

- [ ] **Step 2: Run affected reducer tests before production edits**

Run: `npm test -- src/__tests__/stateReducer.collapsed.v3.test.ts src/__tests__/stateReducer.moveFolder.v3.test.ts src/__tests__/getBookmarksViewState.test.ts --runInBand`

Expected: FAIL at compile time because fixtures still describe the removed
state contract after the test edits.

- [ ] **Step 3: Delete the API contract from state and reducer**

Remove API command types and actions from `state.ts`; remove command queue
construction, remote-id guards, API confirmation cases, and all command-queue
return fields from `actions.ts`. Every CRUD action must return only the local
state and undo data.

- [ ] **Step 4: Remove API execution from the app shell**

Delete the `executeAPICall` import and both effects that select and execute a
queued command in `App.tsx`.

- [ ] **Step 5: Remove remaining legacy type dependencies**

Update `updateFolderItem`, fractional-index helpers, and utility type guards
to use v3/local interfaces. Delete `get_FAKE_REMOTE_ID_TO_BE_DELETED`.

- [ ] **Step 6: Run the affected tests and verify GREEN**

Run: `npm test -- src/__tests__/stateReducer.collapsed.v3.test.ts src/__tests__/stateReducer.moveFolder.v3.test.ts src/__tests__/getBookmarksViewState.test.ts --runInBand`

Expected: PASS with no API mock or queue field.

## Chunk 3: Canonicalize storage and local import/export

### Task 3: Persist canonical local data and preserve only v3 import/export

**Files:**
- Modify: `src/newtab/state/storage.ts`
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Modify: `src/newtab/helpers/settingsOptions.tsx`
- Modify: `src/__tests__/storageMigration.test.ts`
- Modify: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Write failing migration and import tests**

Add a storage fixture with nested `remoteId` values and assert that loading
returns canonical v3 data and writes it back once. Add import/export tests for
branded v3 backups (`isTablo`, `isTabme`, `isTabowski`) and rejection of v2,
legacy array, Toby, and structurally-invalid v3 files. Verify failed full and
space imports leave existing dashboard data untouched.

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- src/__tests__/storageMigration.test.ts src/__tests__/importExportHelpers.v3.test.ts --runInBand`

Expected: FAIL because old formats and `remoteId` are currently accepted or
retained.

- [ ] **Step 3: Use the strict normalizer at every local boundary**

Detect obsolete properties and call `chrome.storage.local.set()` with the
canonical saving-state object during load. Use the validation result before
normalization: invalid storage becomes the empty local state, while invalid
full/space imports take the existing Unsupported JSON path and do not dispatch
`InitDashboard`. Use the normalizer for valid full backup import, single-space
import, and both export constructors.

- [ ] **Step 4: Remove unsupported import paths and UI**

Delete legacy-array/v2 detection and conversions, `onImportFromToby`, Toby
types, and the Toby option/import from `settingsOptions.tsx`. Simplify cloning
of an imported space so it only regenerates local ids and positions.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run: `npm test -- src/__tests__/storageMigration.test.ts src/__tests__/importExportHelpers.v3.test.ts --runInBand`

Expected: PASS.

## Chunk 4: Remove network capability and restore verification gates

### Task 4: Remove host permissions and make type checking mandatory

**Files:**
- Modify: `public/manifest-normal.json`
- Modify: `public/manifest-overrideless.json`
- Modify: `package.json`
- Modify: `tsconfig.json`
- Modify: `src/__tests__/styleBuildConfig.test.ts` if manifest expectations need updating

- [ ] **Step 1: Add manifest/build assertions**

Extend the existing build-configuration test to assert neither source manifest
contains `optional_host_permissions` and the built manifest inherits that
absence.

- [ ] **Step 2: Run the assertion and verify RED**

Run: `npm test -- src/__tests__/styleBuildConfig.test.ts --runInBand`

Expected: FAIL because both manifests currently contain `"<all_urls>"`.

- [ ] **Step 3: Remove network capability and add a typecheck script**

Delete `optional_host_permissions` from both manifests. Add `typecheck` as
`tsc --noEmit`; make `build` run it before webpack. Set `skipLibCheck: true`
in `tsconfig.json` so third-party declaration conflicts do not hide project
type errors, while application code remains strictly checked.

- [ ] **Step 4: Verify project-wide absence and toolchain health**

Run:
`rg -n 'remoteId|APICommand|apiCommandsQueue|apiCommandId|apiLastError|@/api|src/api|LegacyFolder|LegacySpace|Toby|optional_host_permissions' src public --glob '!**/*.map'`

Expected: no matches other than intentional test descriptions, which should
then be removed or renamed.

Run: `npm run typecheck && npm test -- --runInBand && npm run build`

Expected: all commands exit 0; production build emits a manifest without host
permissions.
