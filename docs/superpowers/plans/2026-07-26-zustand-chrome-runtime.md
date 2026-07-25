# Zustand Chrome Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Подключить Zustand к runtime-данным Chrome в работающем расширении, сохранив старый reducer для dashboard CRUD.

**Architecture:** Vanilla `chromeRuntimeStore` владеет runtime data. Action bridge маршрутизирует совместимые legacy actions в этот store. `App.tsx` запускает Chrome effect-код и подписывается на Zustand для построения текущего `AppState`.

**Tech Stack:** TypeScript, React 18, Zustand 5, Jest 29, Chrome Extensions API.

## Global Constraints

- `chromeRuntimeStore` и action bridge не вызывают Chrome API, storage, DOM или таймеры.
- Chrome API остаётся в controller-слое `App.tsx`.
- Dashboard CRUD, undo и storage-sync не мигрируются в этой задаче.
- Комментарии в новых архитектурных файлах пишутся на русском и объясняют назначение кода.
- Не выполнять `git add` и `git commit` без явного разрешения пользователя.

### Task 1: Runtime store

**Files:**

- Create: `src/newtab/state/chrome-runtime/chromeRuntimeStore.ts`
- Create: `src/__tests__/chromeRuntimeStore.test.ts`

**Interfaces:**

- Produces: `ChromeRuntimeState`, `ChromeRuntimeStore`, `createChromeRuntimeStore(initialState)`.

- [x] **Step 1: Написать падающий test store**

```ts
const store = createChromeRuntimeStore();
store.getState().setTabs([tab]);
store.getState().updateTab(tab.id!, { ...tab, title: 'Новый title' });
expect(store.getState().tabs[0].title).toBe('Новый title');
```

- [x] **Step 2: Запустить test и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeStore.test.ts`

Expected: FAIL, модуль store отсутствует.

- [x] **Step 3: Реализовать vanilla runtime store**

```ts
export function createChromeRuntimeStore(initialState?: Partial<ChromeRuntimeState>): StoreApi<ChromeRuntimeStore>;
```

- [x] **Step 4: Запустить test и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeStore.test.ts`

Expected: PASS.

### Task 2: Action bridge

**Files:**

- Create: `src/newtab/state/chrome-runtime/runtimeActionBridge.ts`
- Create: `src/__tests__/runtimeActionBridge.test.ts`

**Interfaces:**

- Consumes: `StoreApi<ChromeRuntimeStore>`, `ActionDispatcher`.
- Produces: `createRuntimeActionBridge({ runtimeStore, legacyDispatch, closeTabs })`.

- [x] **Step 1: Написать падающий test bridge**

```ts
bridge({ type: Action.SetTabsOrHistory, tabs: [tab] });
expect(runtimeStore.getState().tabs).toEqual([tab]);
expect(legacyDispatch).not.toHaveBeenCalled();
```

- [x] **Step 2: Запустить test и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/runtimeActionBridge.test.ts`

Expected: FAIL, модуль bridge отсутствует.

- [x] **Step 3: Реализовать bridge и routing CloseTabs/UpdateAppState**

```ts
export function createRuntimeActionBridge(dependencies: RuntimeActionBridgeDependencies): ActionDispatcher;
```

- [x] **Step 4: Запустить test и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/runtimeActionBridge.test.ts`

Expected: PASS.

### Task 3: Подключение App

**Files:**

- Modify: `src/newtab/components/root/App.tsx`

**Interfaces:**

- Consumes: `chromeRuntimeStore`, `useChromeRuntimeStore`, `createRuntimeActionBridge`.
- Produces: runtime-данные UI читаются из Zustand, Chrome callbacks обновляют runtime store через bridge.

- [x] **Step 1: Добавить App integration contract test**

```ts
expect(appSource).toContain('useChromeRuntimeStore');
expect(appSource).toContain('createRuntimeActionBridge');
```

- [x] **Step 2: Запустить test и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeApp.contract.test.ts`

Expected: FAIL, App ещё не подключён к runtime store.

- [x] **Step 3: Подключить runtime store в App**

```ts
const tabs = useChromeRuntimeStore((state) => state.tabs);
const appState: AppState = { ...legacyAppState, tabs, recentItems, currentWindowId, lastActiveTabIds, loaded };
```

- [x] **Step 4: Запустить contract test и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/chromeRuntimeApp.contract.test.ts`

Expected: PASS.

### Task 4: Полная проверка

- [x] **Step 1: Запустить полный suite**

Run: `npm test -- --runInBand`

Expected: PASS.

- [x] **Step 2: Запустить typecheck и production build**

Run: `npm run typecheck && npm run build`

Expected: PASS.

- [x] **Step 3: Проверить diff**

Run: `git diff --check && git status --short`

Expected: отсутствуют пробельные ошибки; `AGENTS.MD` не изменён прототипом.
