# Components Folders And Modules Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize `src/newtab/components` into per-component folders and move component-specific styles into `module.scss` files without changing behavior.

**Architecture:** Migrate in small batches. For each batch, move component files into their own folders, keep shared primitives in shared locations, and extract only component-owned selectors from `public/scss` into colocated CSS modules. Shared styles such as tokens, dropdowns, modal primitives, buttons, and cross-cutting layout remain in `public/scss`.

**Tech Stack:** React 18, TypeScript, CSS Modules via SCSS, webpack, Jest smoke checks, manual browser verification.

---

## Chunk 1: Prepare CSS Modules Support

### Task 1: Add SCSS modules support to webpack

**Files:**
- Modify: `webpack/webpack.common.js`
- Test: `src/__tests__/styleBuildConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Add a config-level test that expects webpack to recognize `*.module.scss` for component code.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npx jest src/__tests__/styleBuildConfig.test.ts --runInBand`
Expected: FAIL because CSS Modules are not configured yet.

- [ ] **Step 3: Implement minimal webpack support**

Add a webpack rule for `*.module.scss` used from TS/TSX files. Keep global `public/style.scss` compilation unchanged.

- [ ] **Step 4: Re-run the targeted test**

Run: `npx jest src/__tests__/styleBuildConfig.test.ts --runInBand`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- the extension should still build
- global styles should still load

How to check:
- open the new tab page
- verify the page is styled at all, not unstyled white HTML

- [ ] **Step 6: Commit**

Commit name: `add scss modules`

## Chunk 2: First Low-Risk Component Batch

### Task 2: Move `Notification` into its own folder and module stylesheet

**Files:**
- Create: `src/newtab/components/Notification/Notification.tsx`
- Create: `src/newtab/components/Notification/Notification.module.scss`
- Modify: `src/newtab/components/App.tsx`
- Modify: `public/scss/_notifications.scss`
- Test: `src/__tests__/styleSelectors.test.ts`

- [ ] **Step 1: Write the failing test**

Add a targeted expectation that notification selectors remain in the built CSS or, if component tests exist later, that the rendered notification still gets the expected wrapper and transition classes.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL after removing the selectors from the global stylesheet and before wiring the module.

- [ ] **Step 3: Implement minimal move**

Move `Notification.tsx` into `Notification/`.
Extract only:
- `.notification-box`
- `.notification`
- `.notification__error`
- `.notification__button`
- transition classes if they still need to remain globally compatible with `CSSTransition`

Important:
- if `CSSTransition` still depends on string class names like `notification-enter`, keep those transition classes global unless you deliberately rewire `classNames`

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- top notification appearance
- loading spinner animation
- error notification coloring

How to check:
- trigger any success notification
- trigger any error notification
- verify both still animate and render at the top center

- [ ] **Step 6: Commit**

Commit name: `move notification styles`

### Task 3: Move `SpacesList` into its own folder and module stylesheet

**Files:**
- Create: `src/newtab/components/SpacesList/SpacesList.tsx`
- Create: `src/newtab/components/SpacesList/SpacesList.module.scss`
- Modify: `src/newtab/components/TopBar.tsx`
- Modify: `public/scss/_bookmarks.scss`

- [ ] **Step 1: Write the failing test**

Add or extend a smoke check to expect spaces-list selectors to remain represented after migration.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during the selector move.

- [ ] **Step 3: Implement minimal move**

Move `SpacesList.tsx` into `SpacesList/`.
Extract only:
- `.spaces-list`
- `.spaces-list__item`
- `.spaces-list__delete-button`
- `.spaces-list__new`

Keep unrelated top-bar and button styles global.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- spaces tabs row
- active space highlight
- add-space button visibility
- delete-space icon in edit mode

How to check:
- open new tab
- hover the spaces row
- switch spaces
- rename one space
- create one new space

- [ ] **Step 6: Commit**

Commit name: `move spaces list`

### Task 4: Move `TopBar` into its own folder and module stylesheet

**Files:**
- Create: `src/newtab/components/TopBar/TopBar.tsx`
- Create: `src/newtab/components/TopBar/TopBar.module.scss`
- Modify: `src/newtab/components/Bookmarks.tsx`
- Modify: `public/scss/_bookmarks.scss`

- [ ] **Step 1: Write the failing test**

Add a smoke expectation for top-bar selectors or rendering classes that must survive the move.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during the style extraction.

- [ ] **Step 3: Implement minimal move**

Move `TopBar.tsx` into `TopBar/`.
Extract only styles owned by TopBar:
- `.bookmarks-menu`
- `.bookmarks-menu--scrolled`
- `.search-results-header`
- `.menu-buttons`
- `.btn__clear-search`

Keep shared button primitives and search input base styles global if they are reused.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- search field alignment
- top bar sticky/scrolled border
- help/settings buttons
- spaces row layout

How to check:
- open new tab
- scroll content enough to trigger top bar scrolled state
- type in search
- clear search
- open help/settings dropdowns

- [ ] **Step 6: Commit**

Commit name: `move top bar`

### Task 5: Move `Toolbar` into its own folder and module stylesheet

**Files:**
- Create: `src/newtab/components/Toolbar/Toolbar.tsx`
- Create: `src/newtab/components/Toolbar/Toolbar.module.scss`
- Modify: `src/newtab/components/Bookmarks.tsx`
- Modify: shared canvas or bookmarks SCSS where toolbar rules currently live

- [ ] **Step 1: Write the failing test**

Add a selector smoke check for toolbar-related classes if those selectors are currently only validated manually.

- [ ] **Step 2: Run the targeted test to verify failure**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during the move.

- [ ] **Step 3: Implement minimal move**

Move `Toolbar.tsx` into `Toolbar/`.
Extract only toolbar-owned selectors such as:
- `.toolbar-wrapper`
- `.toolbar`
- `.toolbar-button`

Do not move shared button primitives.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- floating bottom toolbar
- add-folder button
- add-sticky-note button

How to check:
- open a space with normal content
- verify the bottom toolbar still appears
- click add folder
- click add sticky note

- [ ] **Step 6: Commit**

Commit name: `move toolbar styles`

## Chunk 3: Sidebar Family

### Task 6: Move `SidebarItem`, `SidebarOpenTabs`, and `SidebarRecent`

**Files:**
- Create corresponding component folders
- Add per-component `module.scss` where appropriate
- Modify imports in `Sidebar.tsx`
- Modify `public/scss/_sidebar.scss`

- [ ] **Step 1: Write a failing test**

Add smoke expectations for sidebar-owned selectors that should remain after the move.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement in one batch**

Recommended ownership:
- `SidebarItem`: `.inbox-item*`, `.saved-tab-icon`, `.window-name`
- `SidebarOpenTabs`: mostly structure stays in parent unless uniquely owned
- `SidebarRecent`: `.recent-filter-panel`, `.recent-list-panel__btn`, history-specific list presentation

Keep container-level layout like `.app-sidebar`, `.app-sidebar__header`, `.inbox-box`, `.recent-list`, `.sidebar-message` global until the parent `Sidebar` is migrated.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- open tabs list
- recent history list
- filter buttons
- close-tab and save-tab actions

How to check:
- open sidebar
- switch between open tabs and recent behavior
- use recent filters
- close a tab from sidebar
- save a tab into a folder

- [ ] **Step 6: Commit**

Commit name: `split sidebar items`

## Chunk 4: Folder Family

### Task 7: Move `FolderItem` into a folder and module stylesheet

**Files:**
- Create: `src/newtab/components/FolderItem/FolderItem.tsx`
- Create: `src/newtab/components/FolderItem/FolderItem.module.scss`
- Move or colocate only truly local helpers if any emerge
- Modify imports in `Folder.tsx` and `FolderGroup.tsx`
- Modify `public/scss/_bookmarks.scss`

- [ ] **Step 1: Write a failing test**

Add a smoke expectation for folder item selectors.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement minimal move**

Extract:
- `.folder-item*`
- `.btn__close-tab`

Keep folder-level layout global until `Folder` is migrated.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- bookmark rows
- per-item context menu
- item selection highlight
- close-open-tab icon on linked item

How to check:
- hover several items
- open item menu
- edit one item title
- verify selected state styles

- [ ] **Step 6: Commit**

Commit name: `move folder item`

### Task 8: Move `FolderGroup` into a folder and module stylesheet

**Files:**
- Create matching folder and module
- Modify imports in `Folder.tsx`
- Modify `public/scss/_bookmarks.scss`

- [ ] **Step 1: Write a failing test**

Add a smoke expectation for folder group selectors.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement minimal move**

Extract:
- `.folder-group*`

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- group header row
- collapse/expand chevron
- grouped bookmarks spacing

How to check:
- open a folder with groups
- collapse and expand a group
- rename a group

- [ ] **Step 6: Commit**

Commit name: `move folder group`

### Task 9: Move `Folder` into a folder and module stylesheet

**Files:**
- Create matching folder and module
- Modify imports in `Bookmarks.tsx`
- Modify `public/scss/_bookmarks.scss`

- [ ] **Step 1: Write a failing test**

Add a smoke expectation for folder container selectors.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement minimal move**

Extract:
- `.folder`
- `.folder--empty`
- `.folder-empty-tip`
- `.folder-collapse-toggle*`
- `.folder-items-box`
- `.draggable-folder`
- `.folder-title*`

Keep only shared layout or cross-component selectors global if they still serve multiple components.

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- folder card layout
- title row
- empty folder view
- collapse behavior

How to check:
- open normal folder
- open empty folder
- rename folder
- collapse and expand folder

- [ ] **Step 6: Commit**

Commit name: `move folder styles`

## Chunk 5: Parent Containers

### Task 10: Move `Sidebar` into a folder and colocate only local helpers if needed

**Files:**
- Create `src/newtab/components/Sidebar/Sidebar.tsx`
- Create `src/newtab/components/Sidebar/Sidebar.module.scss`
- Modify `src/newtab/components/App.tsx`
- Review nearby helper ownership

- [ ] **Step 1: Write a failing test**

Add a smoke expectation for sidebar container selectors.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement minimal move**

Extract container-owned rules:
- `.app-sidebar`
- `.app-sidebar.collapsed`
- `.app-sidebar__header*`
- `.bookmarks-box`
- `.empty-dashboard*`

Recommendation on related code:
- keep drag-and-drop bindings in shared helpers for now
- keep recent/history helpers in shared helpers
- only colocate helper functions if they become Sidebar-only after the move

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- sidebar width and collapse state
- sticky headers
- inbox/recent container scrolling

How to check:
- collapse and expand sidebar
- hover to reopen collapsed sidebar
- scroll inside sidebar

- [ ] **Step 6: Commit**

Commit name: `move sidebar container`

### Task 11: Move `Bookmarks` into a folder and colocate only local helpers if justified

**Files:**
- Create `src/newtab/components/Bookmarks/Bookmarks.tsx`
- Create `src/newtab/components/Bookmarks/Bookmarks.module.scss`
- Modify `src/newtab/components/App.tsx`
- Review `getBookmarksViewState.ts`, `getFolderDisplayItems.ts`, `isEmptyDashboard.ts`

- [ ] **Step 1: Write a failing test**

Add a smoke expectation for bookmarks container selectors.

- [ ] **Step 2: Verify RED**

Run: `npx jest src/__tests__/styleSelectors.test.ts --runInBand`
Expected: FAIL during extraction.

- [ ] **Step 3: Implement minimal move**

Extract:
- `.bookmarks`

Potential colocations:
- `getBookmarksViewState.ts` can move next to `Bookmarks` if only `Bookmarks` uses it
- `isEmptyDashboard.ts` can move next to `Bookmarks` if usage remains local
- `getFolderDisplayItems.ts` likely stays shared if still used by `Folder`

- [ ] **Step 4: Re-run tests**

Run: `npm run test:build-style`
Expected: PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- main content area sizing
- scroll behavior
- interaction between top bar, folders, canvas, and toolbar

How to check:
- open new tab
- scroll main area
- interact with folders and canvas in the same screen

- [ ] **Step 6: Commit**

Commit name: `move bookmarks container`

## Chunk 6: Final Cleanup

### Task 12: Normalize imports and remove old flat component files

**Files:**
- Delete migrated flat files from `src/newtab/components`
- Update any barrel or direct imports
- Adjust tests if import paths changed

- [ ] **Step 1: Write the failing test**

Add a lightweight structure test if useful, or rely on TypeScript compile/build failure after path cleanup.

- [ ] **Step 2: Verify RED**

Run: `npm run build`
Expected: FAIL if any old import path remains.

- [ ] **Step 3: Remove leftovers and fix imports**

Delete the old flat files only after the new folder-based imports are all wired.

- [ ] **Step 4: Verify GREEN**

Run:
- `npm run build`
- `npm run test:build-style`

Expected: both PASS.

- [ ] **Step 5: Manual check**

What could be affected:
- any screen because this is pure import-path cleanup

How to check:
- open the extension
- verify the default new tab flow still loads and works

- [ ] **Step 6: Commit**

Commit name: `cleanup component paths`

