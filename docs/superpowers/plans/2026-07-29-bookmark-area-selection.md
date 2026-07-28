# Bookmark Area Selection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mouse-drag area selection of bookmarks and whole groups, then drag the resolved selection to a valid folder or group target.

**Architecture:** Keep durable selection as root item IDs in the non-persisted UI Zustand store. A focused selection module will convert visible bookmark and group-header rectangles into root IDs, turning every selected group child into its parent group. `Bookmarks` owns the pointer gesture and selection frame; drag-and-drop reads the store selection and disallows group drop areas whenever the selection contains a group.

**Tech Stack:** React 18, TypeScript 5, Zustand vanilla store, CSS modules, Jest/jsdom.

## Global Constraints

- Only visible DOM elements participate in selection; collapsed, filtered-out and hidden items are excluded.
- A group header or any visible bookmark inside the group selects the whole group.
- A selection containing a group may be dropped only into a folder.
- Selection is cleared on empty-area click, space/search/filter change, and completed or cancelled drag.
- Do not run `git add` or create commits without a separate explicit user request.

---

### Task 1: Add pure area-selection resolution

**Files:**
- Create: `src/newtab/feature/selection/areaSelection.ts`
- Create: `src/__tests__/areaSelection.test.ts`

**Interfaces:**
- Produces `SelectionRect`, `SelectionCandidate`, `normalizeSelectionRect`, `isRectIntersecting`, and `resolveAreaSelection` for the gesture component.
- `SelectionCandidate` has `{ id: number; groupId?: number; rect: SelectionRect }`; a group header has `id === groupId`, a bookmark in a group has its parent `groupId`, and a top-level bookmark omits `groupId`.

- [ ] **Step 1: Write failing resolution tests**

```ts
import {
  isRectIntersecting,
  resolveAreaSelection,
  type SelectionCandidate,
} from "@/newtab/feature/selection/areaSelection";

const rect = (left: number, top: number, width: number, height: number) => ({
  left, top, right: left + width, bottom: top + height,
});

test("resolveAreaSelection keeps top-level bookmarks and resolves grouped bookmarks to a group", () => {
  const candidates: SelectionCandidate[] = [
    { id: 1, rect: rect(0, 0, 20, 20) },
    { id: 11, groupId: 10, rect: rect(30, 0, 20, 20) },
    { id: 12, groupId: 10, rect: rect(60, 0, 20, 20) },
    { id: 21, groupId: 20, rect: rect(90, 0, 20, 20) },
  ];

  expect(resolveAreaSelection(rect(0, 0, 100, 20), candidates)).toEqual([1, 10, 20]);
});

test("isRectIntersecting accepts any overlap and rejects touching edges", () => {
  expect(isRectIntersecting(rect(0, 0, 10, 10), rect(9, 9, 10, 10))).toBe(true);
  expect(isRectIntersecting(rect(0, 0, 10, 10), rect(10, 0, 10, 10))).toBe(false);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- areaSelection.test.ts --runInBand`

Expected: FAIL because `@/newtab/feature/selection/areaSelection` does not exist.

- [ ] **Step 3: Implement the minimal pure module**

```ts
export type SelectionRect = { left: number; top: number; right: number; bottom: number };
export type SelectionCandidate = { id: number; groupId?: number; rect: SelectionRect };

export function normalizeSelectionRect(startX: number, startY: number, endX: number, endY: number): SelectionRect {
  return { left: Math.min(startX, endX), top: Math.min(startY, endY), right: Math.max(startX, endX), bottom: Math.max(startY, endY) };
}

export function isRectIntersecting(a: SelectionRect, b: SelectionRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function resolveAreaSelection(selection: SelectionRect, candidates: SelectionCandidate[]): number[] {
  return [...new Set(candidates.filter((candidate) => isRectIntersecting(selection, candidate.rect)).map((candidate) => candidate.groupId ?? candidate.id))];
}
```

- [ ] **Step 4: Run the unit test to verify it passes**

Run: `npm test -- areaSelection.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Run formatting and type validation**

Run: `npx prettier --check src/newtab/feature/selection/areaSelection.ts src/__tests__/areaSelection.test.ts && npm run typecheck`

Expected: exit code 0.

- [ ] **Step 6: Do not commit**

The repository rules require explicit user permission before staging or committing.

### Task 2: Store and render root selection

**Files:**
- Modify: `src/newtab/state/ui/uiStore.ts`
- Modify: `src/newtab/components/common/FolderItem/FolderItem.tsx`
- Modify: `src/newtab/components/common/FolderItem/FolderItem.module.scss`
- Modify: `src/newtab/components/common/FolderGroup/FolderGroup.tsx`
- Modify: `src/newtab/components/common/FolderGroup/FolderGroup.module.scss`
- Create: `src/__tests__/uiStore.selection.test.ts`

**Interfaces:**
- Consumes `selectedItemIds: number[]`, `setSelectedItemIds(itemIds: number[])`, and `clearSelectedItemIds()` from `UiStore`.
- Produces visual selection for individual bookmark roots and group roots via `data-selected="true"`.

- [ ] **Step 1: Write a failing UI-store test**

```ts
import { createUiStore } from "@/newtab/state/ui/uiStore";

test("selection is transient and can be replaced or cleared", () => {
  const store = createUiStore();
  store.getState().setSelectedItemIds([1, 10, 10]);
  expect(store.getState().selectedItemIds).toEqual([1, 10]);
  store.getState().clearSelectedItemIds();
  expect(store.getState().selectedItemIds).toEqual([]);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- uiStore.selection.test.ts --runInBand`

Expected: FAIL because the selection fields and actions are absent.

- [ ] **Step 3: Add non-persisted selection to `UiState`**

Add the following state and actions outside `UiPreferences` so Chrome storage never persists the selection:

```ts
selectedItemIds: number[];
setSelectedItemIds(itemIds: number[]): void;
clearSelectedItemIds(): void;
```

Initialize `selectedItemIds` with `[]`; set action must deduplicate IDs in first-seen order; clear action must return `[]`.

- [ ] **Step 4: Bind selection to bookmark and group presentation**

In `FolderItem`, subscribe only to `selectedItemIds.includes(p.item.id)` and set `data-selected="true"` on the existing `a[data-role="folder-item"]` when true. Preserve existing menu state styles.

In `FolderGroup`, subscribe only to `selectedItemIds.includes(p.group.id)` and set `data-selected="true"` on the group root. Add CSS that visibly marks the complete group container, while keeping `data-drop-target` as the stronger drop indication.

- [ ] **Step 5: Run focused tests and typecheck**

Run: `npm test -- uiStore.selection.test.ts --runInBand && npm run typecheck`

Expected: PASS and exit code 0.

- [ ] **Step 6: Do not commit**

The repository rules require explicit user permission before staging or committing.

### Task 3: Add the area-selection gesture and frame

**Files:**
- Create: `src/newtab/components/common/Bookmarks/useAreaSelection.ts`
- Modify: `src/newtab/components/common/Bookmarks/Bookmarks.tsx`
- Modify: `src/newtab/components/common/Bookmarks/Bookmarks.module.scss`
- Modify: `src/newtab/helpers/domRoles.ts`
- Create: `src/__tests__/useAreaSelection.test.ts`

**Interfaces:**
- Consumes `normalizeSelectionRect` and `resolveAreaSelection` from `areaSelection.ts` and the UI-store selection actions from Task 2.
- Produces `onMouseDown(event)` and `selectionRect` for `Bookmarks`.
- Exports `collectAreaSelectionCandidates(container: HTMLElement): SelectionCandidate[]` for DOM-to-root mapping tests.
- Adds `DOM_ROLE.areaSelectionFrame` only for the non-interactive visual frame.

- [ ] **Step 1: Write failing DOM candidate tests**

```ts
import { collectAreaSelectionCandidates } from "@/newtab/components/common/Bookmarks/useAreaSelection";

const setRect = (element: HTMLElement, left: number) => {
  Object.defineProperty(element, "getBoundingClientRect", {
    value: () => ({ left, top: 10, right: left + 20, bottom: 30 }),
  });
};

test("collectAreaSelectionCandidates resolves a group child and a group header to the same group", () => {
  document.body.innerHTML = `
    <div data-role="bookmarks">
      <a data-role="folder-item" data-id="1"></a>
      <section data-role="folder-group" data-group-id="10">
        <div data-role="group-header" data-id="10"></div>
        <a data-role="folder-item" data-id="11"></a>
      </section>
    </div>`;
  const container = document.querySelector<HTMLElement>(`[data-role="bookmarks"]`)!;
  setRect(container.querySelector(`[data-id="1"]`)!, 0);
  setRect(container.querySelector(`[data-role="group-header"]`)!, 30);
  setRect(container.querySelector(`[data-id="11"]`)!, 60);

  expect(collectAreaSelectionCandidates(container)).toEqual([
    { id: 1, rect: { left: 0, top: 10, right: 20, bottom: 30 } },
    { id: 10, groupId: 10, rect: { left: 30, top: 10, right: 50, bottom: 30 } },
    { id: 11, groupId: 10, rect: { left: 60, top: 10, right: 80, bottom: 30 } },
  ]);
});

```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- useAreaSelection.test.ts --runInBand`

Expected: FAIL because the hook does not exist.

- [ ] **Step 3: Implement `useAreaSelection`**

The hook must:

1. `collectAreaSelectionCandidates` must map DOM elements to candidates exactly as asserted by the test above.
2. Start only for primary-button `mousedown` whose target is not inside `[data-role="folder-item"]`, `[data-role="group-header"]`, a folder header, an input, button, dropdown, or modal.
3. Snapshot currently visible candidates at gesture start from `bookmarksRef.current`:
   - each `[data-role="folder-item"]` yields `{ id, rect }`, with `groupId` read from its closest `[data-role="folder-group"]` when present;
   - each `[data-role="group-header"]` yields `{ id, groupId: id, rect }`.
4. Attach document `mousemove` and `mouseup` listeners. On a move beyond a 3px threshold, normalize the client-coordinate rectangle, call `resolveAreaSelection`, publish its IDs, and return the rectangle for rendering.
5. On mouseup after movement, retain `selectedItemIds`, hide the frame and clean up listeners. On mouseup without movement, clear selection.
6. Always clean listeners on component unmount.

- [ ] **Step 4: Wire the hook into `Bookmarks`**

Call the hook before existing drag binding. If the hook starts an area selection, do not put that event into `mouseDownEvent`; otherwise preserve existing item, group and folder drag behavior. Render a `div` inside `.bookmarks` only while `selectionRect` is present:

```tsx
<div
  data-role={DOM_ROLE.areaSelectionFrame}
  className={styles.areaSelectionFrame}
  style={{ left: selectionRect.left, top: selectionRect.top, width: selectionRect.right - selectionRect.left, height: selectionRect.bottom - selectionRect.top }}
/>
```

Convert its coordinates from client to the scroll container's content coordinates by adding `scrollLeft - getBoundingClientRect().left` and `scrollTop - getBoundingClientRect().top`.

- [ ] **Step 5: Style the frame**

Add an absolutely positioned, `pointer-events: none` frame with blue 1px border and translucent blue background. Give it a z-index above folder content but below menus; do not change scrolling or flex layout.

- [ ] **Step 6: Run focused validation**

Run: `npm test -- useAreaSelection.test.ts areaSelection.test.ts uiStore.selection.test.ts --runInBand && npm run typecheck`

Expected: PASS and exit code 0.

- [ ] **Step 7: Do not commit**

The repository rules require explicit user permission before staging or committing.

### Task 4: Use store selection during drag-and-drop and restrict group targets

**Files:**
- Modify: `src/newtab/feature/dragging/dragAndDrop.ts`
- Modify: `src/newtab/feature/dragging/processItemDragAndDrop.ts`
- Modify: `src/newtab/components/common/Bookmarks/Bookmarks.tsx`
- Modify: `src/newtab/components/root/useKeyboardAndMouseManager.tsx`
- Modify: `src/newtab/helpers/selectionUtils.ts`
- Modify: `src/__tests__/processItemDragAndDrop.test.ts`
- Create: `src/__tests__/dragAndDrop.areaSelection.test.ts`

**Interfaces:**
- Consumes `uiStore.getState().selectedItemIds` and `clearSelectedItemIds()`.
- Produces ordered selected draggable roots from IDs and accepts only folder drop areas if any selected root is a `group-header`.
- Exports `getSelectedTargetRoots(pressedRoot, selectedItemIds, root)` and `getItemDropAreaElements(root, canDropIntoGroups)` for unit tests.

- [ ] **Step 1: Write failing drag target tests**

```ts
import {
  getItemDropAreaElements,
  getSelectedTargetRoots,
} from "@/newtab/feature/dragging/dragAndDrop";

beforeEach(() => {
  document.body.innerHTML = `
    <div class="bookmarks">
      <a data-role="folder-item" data-id="1"></a>
      <section data-role="folder-group"><div data-role="group-header" data-id="10"></div><div data-role="group-items"></div></section>
      <div data-role="folder-items"></div>
    </div>`;
});

test("selected group omits all group destinations", () => {
  expect(getItemDropAreaElements(document, false).map((element) => element.dataset.role)).toEqual(["folder-items"]);
});

test("dragging a selected bookmark uses every selected root in store order", () => {
  const bookmark = document.querySelector<HTMLElement>(`[data-id="1"]`)!;
  expect(getSelectedTargetRoots(bookmark, [1, 10], document).map((element) => element.dataset.id)).toEqual(["1", "10"]);
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- dragAndDrop.areaSelection.test.ts processItemDragAndDrop.test.ts --runInBand`

Expected: FAIL because drag-and-drop reads the legacy DOM array and still includes group targets.

- [ ] **Step 3: Resolve selected draggable roots from the UI store**

In `dragAndDrop.ts`, implement `getSelectedTargetRoots(pressedRoot, selectedItemIds, root)`. When a draggable root is pressed, read `selectedItemIds`. If the pressed root ID is selected, map all stored IDs to their current elements using direct selectors restricted to `.bookmarks`:

```ts
document.querySelector(`[data-role="folder-item"][data-id="${id}"], [data-role="group-header"][data-id="${id}"]`)
```

Filter missing elements so a search/filter re-render cannot break drag. When the pressed root is not selected, use only that root. Keep the order from `selectedItemIds`.

- [ ] **Step 4: Exclude all group destinations for mixed/group selections**

In `dragAndDrop.ts`, implement `getItemDropAreaElements(root, canDropIntoGroups)`. In `processItemDragAndDrop`, derive `canDropIntoGroups` from `targetRoots.every((root) => root.dataset.role !== DOM_ROLE.groupHeader)` and call this helper. When false, query only `DOM_ROLE.folderItems`; do not include `DOM_ROLE.groupItems` or `DOM_ROLE.groupHeader` in `getFolderElements`. This prevents visual highlighting, preview insertion and final drop into groups.

- [ ] **Step 5: Clear selection at lifecycle boundaries**

Replace the functional use of the module-global `selectionUtils` array with UI-store clearing:

1. after complete or cancelled item drag;
2. when beginning folder or space drag;
3. after Delete in `KeyboardAndMouseManager`.

Keep or remove `selectionUtils.ts` only after confirming no imports remain; if removed, update existing mocks and tests in the same task.

In `Bookmarks`, add an effect that clears selection whenever `currentSpaceId`, `search`, `searchFilters`, `searchFilterMode`, `showArchived`, or `showNotUsed` changes.

- [ ] **Step 6: Run focused tests and typecheck**

Run: `npm test -- dragAndDrop.areaSelection.test.ts processItemDragAndDrop.test.ts dragAndDrop.getItemIdByIndex.test.ts && npm run typecheck`

Expected: PASS and exit code 0.

- [ ] **Step 7: Do not commit**

The repository rules require explicit user permission before staging or committing.

### Task 5: Full regression verification

**Files:**
- Modify only if a regression test identifies a concrete issue in Tasks 1–4.

**Interfaces:**
- Consumes the completed selection, gesture and drag modules.
- Produces a verified build with no stale canvas/legacy selection references.

- [ ] **Step 1: Run all unit tests**

Run: `npm test -- --runInBand`

Expected: PASS.

- [ ] **Step 2: Run production validation**

Run: `npm run typecheck && npm run build`

Expected: both commands exit with code 0.

- [ ] **Step 3: Perform manual browser verification**

Verify each scenario in the extension:

1. Drag a rectangle over two top-level bookmarks and move both into a group.
2. Drag a rectangle over one child bookmark; the complete group highlights and moves to a folder.
3. Drag a rectangle over two different group children; both complete groups move to a folder.
4. Drag a rectangle over a top-level bookmark and a group; both move to a folder, and no group is offered as a drop target.
5. Drag a rectangle over only a group header; the group selects.
6. Click blank space, change space, and change a search filter; selection clears in each case.

- [ ] **Step 4: Check for obsolete dependencies**

Run: `rg -n "selectionUtils|canvas|sticky note" src/newtab src/__tests__`

Expected: no runtime dependency on removed canvas; every remaining `selectionUtils` hit is intentional or the file was removed.

- [ ] **Step 5: Do not commit**

The repository rules require explicit user permission before staging or committing.
