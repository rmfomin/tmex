# Zustand Full Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Полностью заменить legacy `useReducer` state layer newtab на Zustand без изменения поведения расширения.

**Architecture:** Три vanilla Zustand stores владеют dashboard, UI/preferences и Chrome runtime state. Чистые domain-функции преобразуют dashboard data; controllers владеют Chrome API, storage, BroadcastChannel, DOM-темой и таймерами. Компоненты используют selector-ы stores и именованные actions, без `AppState` и `DispatchContext`.

**Tech Stack:** TypeScript, React 18, Zustand 5, Jest 29, Chrome Extensions API.

## Global Constraints

- Не менять v3 backup format, ключи `chrome.storage.local` или пользовательское поведение.
- Store и domain-функции не вызывают Chrome API, storage, DOM или таймеры.
- Каждый новый production API появляется после падающего unit/contract test.
- Комментарии архитектурных границ пишутся на русском.
- Не выполнять `git add` и `git commit` без явного разрешения пользователя.
- Итоговый `src` не импортирует `Action`, `ActionPayload`, `ActionDispatcher`, `AppState`, `DispatchContext` или `stateReducer`.

## File Structure

- `state/dashboard/*` — сохранённое дерево закладок, CRUD и undo.
- `state/ui/*` — UI state, preferences, selectors, theme и notification controllers.
- `state/chrome-runtime/*` — runtime store, Chrome controller и tab commands.
- `state/storage-sync/*` — serializable snapshot, Chrome storage adapter и BroadcastChannel controller.
- `components/*` — selector-based consumers без полного `AppState` prop.
- `index.tsx` — startup/hydration; `App.tsx` — lifecycle controllers и top-level UI.

### Task 1: Выделить UI state и selectors

**Files:**

- Create: `src/newtab/state/ui/uiStore.ts`
- Create: `src/newtab/state/ui/selectors.ts`
- Create: `src/newtab/state/ui/themeController.ts`
- Create: `src/newtab/state/ui/useNotificationAutoHide.ts`
- Create: `src/__tests__/uiStore.test.ts`
- Create: `src/__tests__/themeController.test.ts`

**Interfaces:**

```ts
export type UiPreferences = {
  sidebarCollapsed: boolean;
  openBookmarksInNewTab: boolean;
  colorTheme: ColorTheme;
  showRecent: boolean;
  showArchived: boolean;
  showNotUsed: boolean;
  hiddenFeatureIsEnabled: boolean;
};

export type UiStore = UiPreferences & {
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  itemInEdit?: number;
  notification: NotificationState;
  page: "default" | "import";
  sidebarHovered: boolean;
  setSearch(value: string): void;
  setSearchFilters(filters: SearchFilter[]): void;
  setSearchFilterMode(mode: SearchFilterMode): void;
  setItemInEdit(itemId?: number): void;
  showNotification(notification: NotificationInput): void;
  hideNotification(): void;
  hydratePreferences(preferences: UiPreferences): void;
};
```

- [ ] **Step 1: Написать падающие tests UI store и theme controller**

```ts
store.getState().setSearch("grafana");
store.getState().showNotification({ message: "Saved" });
expect(store.getState().search).toBe("grafana");
expect(store.getState().notification.visible).toBe(true);
```

- [ ] **Step 2: Запустить tests и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/uiStore.test.ts src/__tests__/themeController.test.ts`

Expected: FAIL, UI modules отсутствуют.

- [ ] **Step 3: Реализовать vanilla UI store, selector-ы и DOM theme controller**

Theme controller принимает `ColorTheme` и применяет CSS-class; он не импортируется из UI store.

- [ ] **Step 4: Запустить tests и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/uiStore.test.ts src/__tests__/themeController.test.ts`

Expected: PASS.

### Task 2: Завершить чистую dashboard domain-модель

**Files:**

- Modify: `src/newtab/state/dashboard/types.ts`
- Modify: `src/newtab/state/dashboard/domain.ts`
- Create: `src/newtab/state/dashboard/undo.ts`
- Create: `src/__tests__/dashboardDomain.operations.test.ts`
- Modify: `src/__tests__/zustandDashboard.domain.test.ts`

**Interfaces:**

```ts
export type DashboardState = {
  spaces: SpaceV3[];
  currentSpaceId: number;
  undoSteps: UndoStep[];
};

export function createSpace(state: DashboardState, input: CreateSpaceInput): DashboardState;
export function updateSpace(state: DashboardState, input: UpdateSpaceInput): DashboardState;
export function deleteSpace(state: DashboardState, spaceId: number): DashboardState;
export function createFolder(state: DashboardState, input: CreateFolderInput): DashboardState;
export function updateFolder(state: DashboardState, folderId: number, patch: FolderPatch): DashboardState;
export function deleteFolder(state: DashboardState, folderId: number): DashboardState;
export function createFolderItems(state: DashboardState, input: CreateFolderItemsInput): DashboardState;
export function updateFolderItem(state: DashboardState, input: UpdateFolderItemInput): DashboardState;
export function deleteFolderItems(state: DashboardState, itemIds: number[]): DashboardState;
export function moveFolderItems(state: DashboardState, input: MoveFolderItemsInput): DashboardState;
export function undo(state: DashboardState): DashboardState;
```

- [ ] **Step 1: Перенести reducer expectations в падающие domain tests**

Покрыть создание, update, delete и move каждого уровня дерева; отдельно сохранить group items, fractional positions и undo inverse operations.

- [ ] **Step 2: Запустить tests и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/dashboardDomain.operations.test.ts`

Expected: FAIL, отсутствуют перенесённые domain operations.

- [ ] **Step 3: Перенести чистую логику из `state/actions.ts` и `actionHelpers.ts` в dashboard domain**

Ни одна функция не читает store или не выполняет side effect. Каждая неуспешная операция возвращает исходный state и показывает notification через вызывающий UI/controller слой.

- [ ] **Step 4: Запустить tests и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/dashboardDomain.operations.test.ts src/__tests__/zustandDashboard.domain.test.ts`

Expected: PASS.

### Task 3: Расширить dashboard Zustand store до полного CRUD и undo

**Files:**

- Modify: `src/newtab/state/dashboard/dashboardStore.ts`
- Create: `src/newtab/state/dashboard/selectors.ts`
- Create: `src/__tests__/dashboardStore.operations.test.ts`
- Modify: `src/__tests__/zustandDashboard.store.test.ts`

**Interfaces:**

```ts
export type DashboardStore = DashboardState & {
  hydrate(state: PersistedDashboardState): void;
  createSpace(input: CreateSpaceInput): void;
  updateSpace(input: UpdateSpaceInput): void;
  deleteSpace(spaceId: number): void;
  createFolder(input: CreateFolderInput): void;
  updateFolder(folderId: number, patch: FolderPatch): void;
  deleteFolder(folderId: number): void;
  createFolderItems(input: CreateFolderItemsInput): void;
  updateFolderItem(input: UpdateFolderItemInput): void;
  deleteFolderItems(itemIds: number[]): void;
  moveFolderItems(input: MoveFolderItemsInput): void;
  undo(): void;
};
```

- [ ] **Step 1: Написать падающие store tests для CRUD и undo**

```ts
store.getState().createFolder({ spaceId: 1, title: "Инфраструктура" });
store.getState().undo();
expect(store.getState().spaces[0].folders).toEqual([]);
```

- [ ] **Step 2: Запустить tests и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/dashboardStore.operations.test.ts`

Expected: FAIL, methods store отсутствуют.

- [ ] **Step 3: Добавить именованные store actions поверх чистого domain API**

Каждая action передаёт текущий state в одну domain-function и сохраняет её результат через `set()`.

- [ ] **Step 4: Запустить tests и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/dashboardStore.operations.test.ts src/__tests__/zustandDashboard.store.test.ts`

Expected: PASS.

### Task 4: Перенести Chrome storage и межвкладочную синхронизацию

**Files:**

- Create: `src/newtab/state/storage-sync/types.ts`
- Create: `src/newtab/state/storage-sync/chromeStorageAdapter.ts`
- Create: `src/newtab/state/storage-sync/controller.ts`
- Modify: `src/newtab/state/storage-sync/dashboardPersistence.ts`
- Create: `src/__tests__/storageSync.controller.test.ts`
- Modify: `src/__tests__/storageMigration.test.ts`

**Interfaces:**

```ts
export type PersistedNewtabState = {
  version: 3;
  spaces: SpaceV3[];
  currentSpaceId: number | undefined;
} & UiPreferences;

export function hydrateNewtabStores(): Promise<PersistedNewtabState>;
export function startStorageSync(): () => void;
```

- [ ] **Step 1: Написать падающие controller tests с injected Chrome adapter**

```ts
await controller.hydrate();
dashboardStore.getState().selectSpace(2);
jest.advanceTimersByTime(300);
expect(adapter.save).toHaveBeenCalledWith(expect.objectContaining({ currentSpaceId: 2 }));
```

- [ ] **Step 2: Запустить tests и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/storageSync.controller.test.ts`

Expected: FAIL, production storage controller отсутствует.

- [ ] **Step 3: Перенести v3 normalization, saving keys и BroadcastChannel в adapter/controller**

Controller гидрирует оба persisted store до запуска подписок; входящий broadcast обновляет stores без повторной записи.

- [ ] **Step 4: Запустить tests и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/storageSync.controller.test.ts src/__tests__/storageMigration.test.ts`

Expected: PASS.

### Task 5: Завершить Chrome runtime controller

**Files:**

- Create: `src/newtab/state/chrome-runtime/controller.ts`
- Create: `src/newtab/state/chrome-runtime/commands.ts`
- Modify: `src/newtab/state/chrome-runtime/chromeRuntimeStore.ts`
- Create: `src/__tests__/chromeRuntimeController.test.ts`
- Modify: `src/__tests__/chromeRuntimeStore.test.ts`

**Interfaces:**

```ts
export function startChromeRuntimeController(): () => void;
export function closeChromeTabs(tabIds: number[]): void;
```

- [ ] **Step 1: Написать падающие controller tests с mocked Chrome events**

```ts
controller.onTabUpdated(7, {}, updatedTab);
expect(chromeRuntimeStore.getState().tabs).toContainEqual(updatedTab);
```

- [ ] **Step 2: Запустить tests и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeController.test.ts`

Expected: FAIL, controller отсутствует.

- [ ] **Step 3: Перенести getTabs, startup load, listeners и close command из App**

Controller возвращает cleanup для tabs/windows listeners. Store сохраняет только runtime data.

- [ ] **Step 4: Запустить tests и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeController.test.ts src/__tests__/chromeRuntimeStore.test.ts`

Expected: PASS.

### Task 6: Перевести компоненты на selector-ы и store actions

**Files:**

- Modify: `src/newtab/components/root/App.tsx`
- Modify: `src/newtab/components/root/useKeyboardAndMouseManager.tsx`
- Modify: `src/newtab/components/common/{Bookmarks,Sidebar,TopBar,SpacesList,SearchInput,Folder,FolderGroup,FolderItem,FolderItemMenu,SidebarItem,SidebarOpenTabs,SidebarRecent,BookmarksImporter,ImportBookmarksFromSettings,Notification}/**/*.tsx`
- Modify: `src/newtab/helpers/{settingsOptions,actionsHelpersWithDOM,handleBookmarksKeyDown,recentHistoryUtils,selectionUtils,importExportHelpers,faviconUtils}.ts*`
- Create: `src/__tests__/zustandConsumers.contract.test.ts`

**Interfaces:**

```ts
const spaces = useDashboardStore((state) => state.spaces);
const search = useUiStore((state) => state.search);
const tabs = useChromeRuntimeStore((state) => state.tabs);
```

- [ ] **Step 1: Написать падающий contract test отсутствия legacy imports в components**

```ts
expect(componentSources).not.toContain("DispatchContext");
expect(componentSources).not.toContain("AppState");
expect(componentSources).toContain("useDashboardStore");
```

- [ ] **Step 2: Запустить test и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/zustandConsumers.contract.test.ts`

Expected: FAIL, компоненты ещё используют legacy context и AppState.

- [ ] **Step 3: Перевести consumers feature-by-feature**

Порядок: notification/theme/search → spaces/top bar → sidebar tabs/history → bookmarks/folders/items → import/settings/hotkeys/drag-and-drop helpers. После каждого feature использовать selector минимального среза и именованную action соответствующего store.

- [ ] **Step 4: Запустить component contracts и существующие feature tests**

Run: `npm test -- --runInBand src/__tests__/zustandConsumers.contract.test.ts src/__tests__/getBookmarksViewState.test.ts src/__tests__/processSpacesDragAndDrop.test.ts src/__tests__/importExportHelpers.v3.test.ts`

Expected: PASS.

### Task 7: Переписать startup и удалить legacy слой

**Files:**

- Modify: `src/newtab/index.tsx`
- Modify: `src/newtab/components/root/App.tsx`
- Delete: `src/newtab/state/actions.ts`
- Delete: `src/newtab/state/state.ts`
- Delete: `src/newtab/state/actionHelpers.ts` после переноса используемых helpers
- Delete: `src/newtab/state/storage.ts`
- Delete: `src/newtab/state/chrome-runtime/runtimeActionBridge.ts`
- Delete: `src/__tests__/stateReducer.collapsed.v3.test.ts`
- Delete: `src/__tests__/stateReducer.moveFolder.v3.test.ts`
- Modify: все файлы, у которых поиск находит legacy imports
- Create: `src/__tests__/legacyStateRemoval.contract.test.ts`

**Interfaces:**

```ts
await hydrateNewtabStores();
applyTheme(useUiStore.getState().colorTheme);
mountApp();
```

- [ ] **Step 1: Написать падающий removal contract test**

```ts
expect(existsSync(path.join(stateDir, "actions.ts"))).toBe(false);
expect(allSourceImports).not.toMatch(/newtab\/state\/(actions|state|storage)/);
```

- [ ] **Step 2: Запустить test и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/legacyStateRemoval.contract.test.ts`

Expected: FAIL, legacy files и imports существуют.

- [ ] **Step 3: Переключить startup на hydration stores, удалить reducer и его tests**

Перед удалением каждый legacy helper либо переносится в конкретный новый module, либо удаляется как неиспользуемый. `App.tsx` только запускает controllers и выбирает верхнеуровневый UI state.

- [ ] **Step 4: Запустить removal contract и полный test suite**

Run: `npm test -- --runInBand src/__tests__/legacyStateRemoval.contract.test.ts && npm test -- --runInBand`

Expected: PASS.

### Task 8: Финальная verification

- [ ] **Step 1: Запустить typecheck и production build**

Run: `npm run typecheck && npm run build`

Expected: PASS.

- [ ] **Step 2: Запустить watch до первой успешной компиляции**

Run: `npm run watch`

Expected: webpack сообщает `compiled successfully`; ошибки Watchpack из-за лимита файлов фиксируются отдельно от результата компиляции.

- [ ] **Step 3: Проверить рабочее дерево**

Run: `git diff --check && git status --short && rg 'newtab/state/(actions|state|storage)|DispatchContext|stateReducer|ActionPayload' src`

Expected: нет пробельных ошибок и legacy imports; `AGENTS.MD` остаётся изменением, не относящимся к миграции.
