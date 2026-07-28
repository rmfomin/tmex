# Folder Drag Indicator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace folder drop previews that change layout with a non-layout insertion indicator.

**Architecture:** The dragged folder remains removed from the document flow, so the visible folder grid is stable throughout dragging. `processFolderDragAndDrop` owns the one visual indicator; helpers in `dragAndDrop.ts` create, position and remove it without inserting it into the bookmarks container.

**Tech Stack:** React, TypeScript, Jest, SCSS.

## Global Constraints

- Do not add dependencies.
- Persist the folder order only through existing `config.onDrop`.
- Do not stage or commit files without explicit user permission.

### Task 1: Cover the stable-layout drag contract

**Files:**

- Modify: `src/__tests__/processFolderDragAndDrop.test.ts`

**Interfaces:**

- Consumes: `processFolderDragAndDrop(mouseDownEvent, config, targetRoot)`.
- Produces: a regression test that fails while layout previews are inserted.

- [x] **Step 1: Write the failing test**

Replace the preview assertion with a test that starts a drag and expects `createFolderDropIndicator` and `placeFolderDropIndicator` to be called once, while `createDropPreview` is not called. Add a test that expects the second `calculateFoldersDropAreas` call to receive no source element.

- [x] **Step 2: Run test to verify it fails**

Run: `npm test -- src/__tests__/processFolderDragAndDrop.test.ts --runInBand`

Expected: FAIL because the indicator helpers do not exist and the current implementation creates a preview.

- [x] **Step 3: Implement the minimum behavior**

Add indicator helper mocks only after production exports are introduced. Keep the tests focused on observable process contracts: indicator lifecycle and source-free geometry.

- [x] **Step 4: Run test to verify it passes**

Run: `npm test -- src/__tests__/processFolderDragAndDrop.test.ts --runInBand`

Expected: PASS.

### Task 2: Replace layout preview with fixed indicator

**Files:**

- Modify: `src/newtab/feature/dragging/dragAndDrop.ts`
- Modify: `src/newtab/feature/dragging/processFolderDragAndDrop.ts`
- Modify: `src/newtab/feature/dragging/dragAndDrop.scss`

**Interfaces:**

- Consumes: `DropArea`, `createFolderDummy`, `setDragSourceHidden`.
- Produces: `createFolderDropIndicator(): HTMLElement`, `placeFolderDropIndicator(indicator, dropArea, insertBefore): void`, and `removeFolderDropIndicator(indicator): void`.

- [x] **Step 1: Implement indicator helpers**

Create a fixed, pointer-events-none `div` with class `dad-folder-drop-indicator`. Position it on the left or right edge of the target `DropArea.rect` according to `insertBefore`; set its height to the target height.

- [x] **Step 2: Rework folder drag lifecycle**

After hiding the source, recalculate folder drop areas from DOM folders excluding `targetRoot`. On hover, update only the indicator. On space hover, cancellation and mouseup, remove the indicator. Do not call `createDropPreview`, `placeDropPreview` or `removeDropPreview` from folder dragging.

- [x] **Step 3: Style the indicator**

Add a visible 3px blue vertical indicator with a rounded cap and high z-index. It must be fixed and never affect flex layout.

- [x] **Step 4: Run focused tests**

Run: `npm test -- src/__tests__/processFolderDragAndDrop.test.ts --runInBand`

Expected: PASS.

### Task 3: Verify integration safety

**Files:**

- No production file changes expected.

**Interfaces:**

- Consumes: folder drag code and TypeScript compilation.
- Produces: validated build-quality change.

- [x] **Step 1: Run relevant drag tests**

Run: `npm test -- src/__tests__/processFolderDragAndDrop.test.ts src/__tests__/processSpacesDragAndDrop.test.ts src/__tests__/dragAndDrop.getItemIdByIndex.test.ts --runInBand`

- [x] **Step 2: Run type checking**

Run: `npm run typecheck`

- [x] **Step 3: Inspect diff**

Run: `git diff --check` and `git diff -- src/newtab/feature/dragging src/__tests__/processFolderDragAndDrop.test.ts`.
