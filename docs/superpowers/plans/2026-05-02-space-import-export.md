# Space Import Export Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-space JSON export and single-space JSON import without replacing the user's existing dashboard.

**Architecture:** Reuse the current V3 backup model and import/export helper boundary, but add a smaller `SpaceBackupV3` envelope for exactly one `SpaceV3`. Export serializes the selected space into that envelope; import validates the envelope, remaps all local ids, appends the space after the last existing space, selects it, and leaves current spaces untouched.

**Tech Stack:** React 18, TypeScript, Jest, Chrome extension FileReader/download APIs, existing `SpaceV3`/`DataBackupV3` data model.

---

## JSON Format

Use a dedicated single-space envelope instead of overloading full-dashboard `DataBackupV3`.

```ts
export type SpaceBackupV3 = BackupBrandMarker & {
  version: 3;
  objectType: "space-backup";
  space: SpaceV3;
};
```

Example:

```json
{
  "isTabowski": true,
  "version": 3,
  "objectType": "space-backup",
  "space": {
    "id": 1746170000000,
    "position": "a0",
    "objectType": "space",
    "title": "Work",
    "folders": []
  }
}
```

Import should also accept a full `DataBackupV3` only when it contains exactly one space, so a file created by exporting all data after manually trimming to one space is still usable. If a full backup contains zero or multiple spaces, show `Unsupported space JSON format`.

Imported ids must be regenerated for the space, folders, top-level items, groups, and group bookmarks. This avoids collisions when a user imports a space exported from the same browser profile.

## File Structure

- Modify `src/newtab/helpers/types.ts`
  Add `SpaceBackupV3`.

- Modify `src/newtab/helpers/importExportHelpers.ts`
  Add single-space format guards, export builder, download helper reuse, recursive id remap, and `importSpaceFromJson`.

- Modify `src/newtab/components/common/SpacesList/SpacesList.tsx`
  Add `Export space` menu action under `Rename space`; add hidden file input and visible `Import space` button before the plus button.

- Modify `src/newtab/components/common/SpacesList/SpacesList.module.scss`
  Style the import button consistently with the plus button and keep drag/drop class hooks unchanged.

- Modify `src/__tests__/importExportHelpers.v3.test.ts`
  Add helper-level tests for single-space export/import and id remapping.

- Modify `src/__tests__/spacesDragContracts.test.ts`
  Add source-contract assertions for the new visible labels if no React component test harness exists.

---

## Chunk 1: Helper API And JSON Contract

### Task 1: Add Single-Space Types

**Files:**
- Modify: `src/newtab/helpers/types.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Add the type contract**

Add `SpaceBackupV3` next to `DataBackupV3`:

```ts
export type SpaceBackupV3 = BackupBrandMarker & {
  version: 3;
  objectType: "space-backup";
  space: SpaceV3;
};
```

- [ ] **Step 2: Run type/test baseline**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: existing tests pass before helper changes.

### Task 2: Add Export Builder For One Space

**Files:**
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Write failing export test**

Add a test that calls `createExportSpaceBackupV3(space)` and expects:

```ts
{
  isTabowski: true,
  version: 3,
  objectType: "space-backup",
  space: {
    id: 1,
    position: "a0",
    objectType: "space",
    title: "Main",
    folders: [],
  },
}
```

Also cover normalization of nested `objectType` fields by using at least one group with one bookmark.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: FAIL because `createExportSpaceBackupV3` is not exported.

- [ ] **Step 3: Implement export builder**

In `importExportHelpers.ts`, import `SpaceBackupV3` and add:

```ts
export function createExportSpaceBackupV3(space: SpaceV3): SpaceBackupV3 {
  return {
    isTabowski: true,
    version: 3,
    objectType: "space-backup",
    space: normalizeBackupV3({
      isTabowski: true,
      version: 3,
      spaces: [space],
    }).spaces[0],
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: PASS.

### Task 3: Share Download Helper And Add `onExportSpaceJson`

**Files:**
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Extract `downloadObjectAsJson`**

Move the nested function from `onExportJson` to module scope:

```ts
function downloadObjectAsJson(exportObj: unknown, exportName: string) {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(JSON.stringify(exportObj));
  const downloadAnchorNode = document.createElement("a");
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", exportName + ".json");
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
}
```

- [ ] **Step 2: Add per-space export action**

Add:

```ts
export function onExportSpaceJson(space: SpaceV3) {
  const backup = createExportSpaceBackupV3(space);
  const safeTitle = space.title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "space";
  downloadObjectAsJson(backup, `tabowski_space_${safeTitle}`);
}
```

- [ ] **Step 3: Run helper tests**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: PASS.

---

## Chunk 2: Single-Space Import

### Task 4: Add Format Guards

**Files:**
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Write failing guard tests through public import**

Add tests for `importSpaceFromJson(event, dispatch, existingSpaces)`:

- accepts `SpaceBackupV3`;
- accepts `DataBackupV3` with exactly one `spaces` entry;
- rejects `DataBackupV3` with two spaces and dispatches an error notification.

- [ ] **Step 2: Implement guards**

Add:

```ts
function isSpaceBackupJsonV3(data: SpaceBackupV3) {
  return (
    hasSupportedBackupMarker(data) &&
    data.version === 3 &&
    data.objectType === "space-backup" &&
    data.space?.objectType === "space"
  );
}

function getImportableSpaceV3(data: unknown): SpaceV3 | undefined {
  if (isSpaceBackupJsonV3(data as SpaceBackupV3)) {
    return (data as SpaceBackupV3).space;
  }

  if (isImportJsonV3(data as DataBackupV3)) {
    const spaces = (data as DataBackupV3).spaces;
    return spaces.length === 1 ? spaces[0] : undefined;
  }

  return undefined;
}
```

- [ ] **Step 3: Run tests and confirm current missing import fails**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: FAIL because `importSpaceFromJson` does not exist yet.

### Task 5: Add Recursive Id Remap And Append Import

**Files:**
- Modify: `src/newtab/helpers/importExportHelpers.ts`
- Test: `src/__tests__/importExportHelpers.v3.test.ts`

- [ ] **Step 1: Write id remap expectations**

In the import test, include:

- imported space original id `1`;
- folder original id `10`;
- group original id `100`;
- bookmark original id `101`;
- existing space id `1`.

Assert the dispatched imported space has ids different from all originals where applicable and `position` after the last existing space.

- [ ] **Step 2: Implement clone helper**

Add a helper that keeps titles, URLs, colors, collapsed flags, archived flags, and ordering, but regenerates every local id:

```ts
function cloneSpaceForImport(space: SpaceV3, existingSpaces: SpaceV3[]): SpaceV3 {
  const lastSpace = existingSpaces.at(-1);
  const normalized = normalizeBackupV3({
    isTabowski: true,
    version: 3,
    spaces: [space],
  }).spaces[0];

  return {
    ...normalized,
    id: genUniqLocalId(),
    remoteId: undefined,
    position: insertBetween(lastSpace?.position ?? "", ""),
    folders: normalized.folders.map((folder) => ({
      ...folder,
      id: genUniqLocalId(),
      remoteId: undefined,
      items: folder.items.map((item) => {
        if (item.type === "bookmark") {
          return {
            ...item,
            id: genUniqLocalId(),
            remoteId: undefined,
          };
        }

        return {
          ...item,
          id: genUniqLocalId(),
          remoteId: undefined,
          groupItems: item.groupItems.map((groupItem) => ({
            ...groupItem,
            id: genUniqLocalId(),
            remoteId: undefined,
          })),
        };
      }),
    })),
  };
}
```

Import `insertBetween` from `fractionalIndexes`.

- [ ] **Step 3: Implement `importSpaceFromJson`**

Add:

```ts
export function importSpaceFromJson(
  event: any,
  dispatch: ActionDispatcher,
  existingSpaces: SpaceV3[],
) {
  function receivedText(e: any) {
    try {
      const parsed = JSON.parse(e.target.result);
      const space = getImportableSpaceV3(parsed);

      if (!space) {
        dispatch({
          type: Action.ShowNotification,
          isError: true,
          message: "Unsupported space JSON format",
        });
        return;
      }

      const importedSpace = cloneSpaceForImport(space, existingSpaces);
      dispatch({
        type: Action.InitDashboard,
        spaces: normalizeBackupV3({
          isTabowski: true,
          version: 3,
          spaces: [...existingSpaces, importedSpace],
        }).spaces,
        saveToLS: true,
      });
      dispatch({ type: Action.SelectSpace, spaceId: importedSpace.id });
      showMessage("Space has been imported", dispatch);
    } catch (e) {
      console.error(e);
      dispatch({
        type: Action.ShowNotification,
        isError: true,
        message: "Unsupported space JSON format",
      });
    }
  }

  const file = event.target.files[0];
  if (!file) return;

  const fr = new FileReader();
  fr.onload = receivedText;
  fr.readAsText(file);
  event.target.value = "";
}
```

- [ ] **Step 4: Run helper tests**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: PASS.

---

## Chunk 3: SpacesList UI

### Task 6: Add Export Menu Item

**Files:**
- Modify: `src/newtab/components/common/SpacesList/SpacesList.tsx`
- Test: `src/__tests__/spacesDragContracts.test.ts`

- [ ] **Step 1: Write source-contract test**

Extend the test to assert the component source contains `Export space` and `onExportSpaceJson`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/__tests__/spacesDragContracts.test.ts --runInBand
```

Expected: FAIL because the label/helper import is absent.

- [ ] **Step 3: Implement menu action**

Import:

```ts
import { onExportSpaceJson } from "@/newtab/helpers/importExportHelpers";
```

Add:

```ts
const onExportSpace = (space: SpaceV3) => {
  setMenuSpaceId(-1);
  onExportSpaceJson(space);
};
```

Render this button directly under `Rename space`:

```tsx
<button
  className="dropdown-menu__button focusable"
  onClick={() => onExportSpace(space)}
>
  Export space
</button>
```

- [ ] **Step 4: Run source-contract test**

Run:

```bash
npm test -- src/__tests__/spacesDragContracts.test.ts --runInBand
```

Expected: PASS.

### Task 7: Add Import Button Before Plus

**Files:**
- Modify: `src/newtab/components/common/SpacesList/SpacesList.tsx`
- Modify: `src/newtab/components/common/SpacesList/SpacesList.module.scss`
- Test: `src/__tests__/spacesDragContracts.test.ts`

- [ ] **Step 1: Write source-contract test**

Assert source contains `Import space`, `importSpaceFromJson`, and `type="file"`.

- [ ] **Step 2: Add imports and ref**

Update React import and helper import:

```ts
import React, { useContext, useRef, useState } from "react";
import {
  importSpaceFromJson,
  onExportSpaceJson,
} from "@/newtab/helpers/importExportHelpers";
```

Inside component:

```ts
const importSpaceInputRef = useRef<HTMLInputElement>(null);

const onImportSpaceClick = () => {
  importSpaceInputRef.current?.click();
};
```

- [ ] **Step 3: Render import control before plus**

Place immediately before the existing add-space button:

```tsx
{!p.itemInEdit && (
  <>
    <input
      ref={importSpaceInputRef}
      type="file"
      accept=".json,application/json"
      className={styles.importInput}
      onChange={(e) => importSpaceFromJson(e, dispatch, p.spaces)}
    />
    <button
      type="button"
      className={styles.importButton}
      onClick={onImportSpaceClick}
      title="Import space"
    >
      Import space
    </button>
    <div
      className={styles.newButton}
      onClick={onAddSpace}
      title="Add new space"
    >
      <PlusIcon />
    </div>
  </>
)}
```

Use a real `button` for the visible import action. Keep the plus markup unchanged unless styling requires a `button`; drag/drop tests depend on the existing global class hooks, not on this control.

- [ ] **Step 4: Style import control**

Add to `SpacesList.module.scss`:

```scss
.importInput {
  display: none;
}

.importButton {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  margin-left: -4px;
  margin-right: 8px;
  border: none;
  background: none;
  color: inherit;
  font-size: 13px;
  font-weight: 600;
  opacity: 0.7;
  cursor: pointer;
  visibility: hidden;

  &:hover {
    opacity: 1;
  }
}
```

Update hover reveal:

```scss
&:hover .newButton,
&:hover .importButton {
  visibility: visible;
}
```

- [ ] **Step 5: Run UI contract test**

Run:

```bash
npm test -- src/__tests__/spacesDragContracts.test.ts --runInBand
```

Expected: PASS.

---

## Chunk 4: Verification

### Task 8: Run Focused Automated Tests

**Files:**
- Test: `src/__tests__/importExportHelpers.v3.test.ts`
- Test: `src/__tests__/spacesDragContracts.test.ts`
- Test: `src/__tests__/dataFormatAdapters.test.ts`

- [ ] **Step 1: Run import/export tests**

Run:

```bash
npm test -- src/__tests__/importExportHelpers.v3.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run spaces UI contract tests**

Run:

```bash
npm test -- src/__tests__/spacesDragContracts.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 3: Run adapter regression tests**

Run:

```bash
npm test -- src/__tests__/dataFormatAdapters.test.ts --runInBand
```

Expected: PASS.

### Task 9: Run Build

**Files:**
- No source changes beyond previous tasks.

- [ ] **Step 1: Build extension**

Run:

```bash
npm run build
```

Expected: webpack build exits successfully.

### Task 10: Manual Browser Check

**Files:**
- No source changes beyond previous tasks.

- [ ] **Step 1: Export one space**

Open the extension new tab UI, context-click a space, click `Export space`.

Expected: downloaded JSON has `objectType: "space-backup"` and one `space`.

- [ ] **Step 2: Import that same space**

Click `Import space` before the plus button and select the exported JSON.

Expected: a new space appears after the existing spaces, is selected, and its folders/items match the exported space.

- [ ] **Step 3: Verify duplicate import**

Import the same file again.

Expected: another independent space appears; editing/deleting folders/items in one imported copy does not affect another copy.

- [ ] **Step 4: Verify invalid file**

Import a full dashboard backup containing more than one space.

Expected: existing spaces remain unchanged and notification says `Unsupported space JSON format`.

