# Local-only data model

## Goal

Remove the unfinished HTTP/API synchronization layer. Tablo must store and
operate on bookmark data locally through `chrome.storage.local` only.

## Scope

- Delete `src/api/api.ts` and `src/api/serverCommands.ts`.
- Delete `src/types/api.ts` and every API command type, reducer action, and
  queue field.
- Delete API command state, rollback snapshots, command action types, and the
  API execution effects in the new-tab application.
- Remove `remoteId` and legacy API-payload types from the runtime data model.
- Remove converters whose sole responsibility is to translate between v3 data
  and server payloads.
- Replace the remaining `LegacyObject`/`LegacyFolderItem` dependencies with
  local v3-neutral base and input types; remove fake remote-id helpers.
- Retain the v3 local data model, browser-tab integration, undo, and
  `chrome.storage.local` persistence.
- Remove the optional `"<all_urls>"` host permission from both manifests.
- Normalize existing stored v3 data with a strict field allow-list, so obsolete
  `remoteId` properties are discarded at every entity level and persisted back
  to storage immediately when detected.
- Support only branded v3 local backups (`isTablo`, `isTabme`, or
  `isTabowski`). Legacy/v2 backup and Toby import compatibility, including its
  settings UI entry point, are deliberately removed.

## Non-goals

- No replacement cloud synchronization, authentication, retries, or feature
  flags.
- No redesign of the reducer beyond the code required to remove API behavior.
- No change to the visible bookmark-management workflow.

## Architecture

`AppState` becomes a local UI and bookmark state only. `stateReducer` applies
bookmark actions and `storage.ts` persists the selected fields to
`chrome.storage.local`; no action constructs, queues, executes, confirms, or
rolls back a network command. `App.tsx` retains browser-event subscriptions
but no longer runs an API command effect.

The v3 entities (`SpaceV3`, `FolderV3`, `BookmarkItemV3`, `GroupV3`) retain
only local `id`, position, and display data. Storage normalization reconstructs
clean v3 entities from an explicit field allow-list, rather than spreading
input objects. The same normalizer is used for storage load, full/space import,
and export; it removes obsolete remote identifiers from data saved by previous
versions.

V3 validation requires `objectType: "space"` for spaces,
`objectType: "folder"` for folders, and `type` for every item. The optional
item `objectType` is canonicalized when absent so valid v3 backups from
previous releases continue to load. Invalid stored data resets to the empty
local state; invalid full or space imports are rejected without changing the
current dashboard.

## Compatibility and failure behavior

- Existing local v3 state remains usable. If it contains `remoteId`, the
  canonicalized local-only value is written back during initial load.
- Stored data without `version: 3` and v3 entity discriminators is not
  migrated. It is replaced with the empty local v3 state and written back;
  this deliberately ends pre-v3 storage compatibility.
- Imports that are not v3 backups are rejected using the existing user-facing
  invalid-import path rather than converted to a legacy model.
- There is no network-error or rollback path after this change because no
  network request can be started by the extension.

## Verification

- Add focused tests that prove the strict normalizer drops `remoteId` for a
  space, folder, top-level bookmark, group, and grouped bookmark through
  storage, import, and export paths.
- Update import/export tests to accept branded v3 local backups and reject
  removed legacy/v2 and Toby formats; remove obsolete Toby UI contracts.
- Assert reducer tests use a state shape without API queue fields and that
  local CRUD actions never create network-command state.
- Run Jest, production webpack build, and `npx tsc --noEmit`. Resolve the
  current declaration-package conflicts so the typecheck becomes a meaningful
  gate rather than relying on webpack transpilation.
- Verify static absence in `src` of `src/api` imports, `remoteId`, legacy API
  payload converters, API command types, and command-queue fields; verify both
  source manifests and built manifest have no host permissions.
