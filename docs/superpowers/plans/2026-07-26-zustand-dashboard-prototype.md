# Zustand Dashboard Prototype Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить изолированный, покрытый тестами Zustand-прототип для dashboard state, не меняя текущий runtime приложения.

**Architecture:** Чистые функции в `domain.ts` преобразуют `DashboardState`. Vanilla Zustand store вызывает эти функции только синхронно. Persistence вынесен в сервис с внедряемым adapter-интерфейсом и пока не подключён к Chrome runtime.

**Tech Stack:** TypeScript, React 18, Jest 29, Zustand.

## Global Constraints

- Не менять `App.tsx`, `src/newtab/state/actions.ts` и существующий `chrome.storage` runtime.
- Не вызывать Chrome API, DOM API, storage API или таймеры из store и domain-функций.
- Комментарии в новом коде писать на русском и объяснять архитектурное решение.
- Не выполнять `git add` и `git commit` без явного разрешения пользователя.
- Все новые production-функции реализовывать после соответствующего падающего теста.

## File Structure

- Create: `src/newtab/state/dashboard/types.ts` — минимальная форма dashboard state и аргументы операций.
- Create: `src/newtab/state/dashboard/domain.ts` — чистые операции выбора space, обновления и переноса folder.
- Create: `src/newtab/state/dashboard/dashboardStore.ts` — vanilla Zustand store и React selector-hook.
- Create: `src/newtab/state/storage-sync/dashboardPersistence.ts` — testable persistence boundary с инъецируемым адаптером.
- Create: `src/__tests__/zustandDashboard.domain.test.ts` — контракт чистых операций.
- Create: `src/__tests__/zustandDashboard.store.test.ts` — контракт vanilla store.
- Create: `src/__tests__/dashboardPersistence.test.ts` — контракт persistence boundary.
- Modify: `package.json` и `package-lock.json` — добавить `zustand`.

### Task 1: Добавить Zustand и domain-контракт

**Files:**

- Create: `src/__tests__/zustandDashboard.domain.test.ts`
- Create: `src/newtab/state/dashboard/types.ts`
- Create: `src/newtab/state/dashboard/domain.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

**Interfaces:**

- Produces: `DashboardState`, `selectSpace(state, spaceId)`, `updateFolder(state, folderId, patch)`, `moveFolder(state, input)`.

- [x] **Step 1: Добавить `zustand` в зависимости**

Run: `npm install zustand`

Expected: `package.json` и `package-lock.json` содержат `zustand`.

- [x] **Step 2: Написать падающие domain-тесты**

```ts
expect(selectSpace(state, 2).currentSpaceId).toBe(2);
expect(updateFolder(state, 10, { title: 'Переименована' }).spaces[0].folders[0].title).toBe('Переименована');
expect(moveFolder(state, { folderId: 10, targetSpaceId: 2 }).spaces[1].folders[0].id).toBe(10);
```

- [x] **Step 3: Запустить domain-тесты и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/zustandDashboard.domain.test.ts`

Expected: FAIL, потому что модуль `state/dashboard/domain` ещё отсутствует.

- [x] **Step 4: Создать минимальные чистые types и domain-функции**

```ts
export function selectSpace(state: DashboardState, spaceId: number): DashboardState;
export function updateFolder(state: DashboardState, folderId: number, patch: Partial<FolderV3>): DashboardState;
export function moveFolder(state: DashboardState, input: MoveFolderInput): DashboardState;
```

- [x] **Step 5: Запустить domain-тесты и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/zustandDashboard.domain.test.ts`

Expected: PASS.

### Task 2: Создать vanilla Zustand store

**Files:**

- Create: `src/__tests__/zustandDashboard.store.test.ts`
- Create: `src/newtab/state/dashboard/dashboardStore.ts`

**Interfaces:**

- Consumes: `DashboardState`, `selectSpace`, `updateFolder`, `moveFolder`.
- Produces: `createDashboardStore(initialState)`, `DashboardStore`, `useDashboardStore(selector)`.

- [x] **Step 1: Написать падающий store-тест**

```ts
const store = createDashboardStore(initialState);
store.getState().selectSpace(2);
expect(store.getState().currentSpaceId).toBe(2);
```

- [x] **Step 2: Запустить store-тест и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/zustandDashboard.store.test.ts`

Expected: FAIL, потому что модуль `dashboardStore` ещё отсутствует.

- [x] **Step 3: Реализовать vanilla store и actions**

```ts
export function createDashboardStore(initialState: DashboardState): StoreApi<DashboardStore>;
export const dashboardStore: StoreApi<DashboardStore>;
export function useDashboardStore<T>(selector: (state: DashboardStore) => T): T;
```

- [x] **Step 4: Запустить store-тест и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/zustandDashboard.store.test.ts`

Expected: PASS.

### Task 3: Создать persistence boundary

**Files:**

- Create: `src/__tests__/dashboardPersistence.test.ts`
- Create: `src/newtab/state/storage-sync/dashboardPersistence.ts`

**Interfaces:**

- Consumes: `StoreApi<DashboardStore>`.
- Produces: `DashboardPersistenceAdapter`, `createDashboardPersistence(adapter, delayMs)`, `hydrate(store)`, `start(store)`, `stop()`.

- [x] **Step 1: Написать падающий persistence-тест**

```ts
await persistence.hydrate(store);
persistence.start(store);
store.getState().selectSpace(2);
jest.advanceTimersByTime(300);
expect(adapter.save).toHaveBeenCalledWith({ spaces: state.spaces, currentSpaceId: 2 });
```

- [x] **Step 2: Запустить persistence-тест и подтвердить RED**

Run: `npm test -- --runInBand src/__tests__/dashboardPersistence.test.ts`

Expected: FAIL, потому что модуль `dashboardPersistence` ещё отсутствует.

- [x] **Step 3: Реализовать persistence boundary**

```ts
export type DashboardPersistenceAdapter = {
  load(): Promise<DashboardState>;
  save(state: DashboardState): Promise<void>;
  broadcastUpdated(): void;
};
```

- [x] **Step 4: Запустить persistence-тест и подтвердить GREEN**

Run: `npm test -- --runInBand src/__tests__/dashboardPersistence.test.ts`

Expected: PASS.

### Task 4: Полная проверка прототипа

**Files:**

- Modify: новые файлы из задач 1–3 только при необходимости исправить найденную проблему.

**Interfaces:**

- Consumes: все интерфейсы задач 1–3.
- Produces: подтверждённый изолированный Zustand-прототип.

- [x] **Step 1: Запустить новые тесты вместе**

Run: `npm test -- --runInBand src/__tests__/zustandDashboard.domain.test.ts src/__tests__/zustandDashboard.store.test.ts src/__tests__/dashboardPersistence.test.ts`

Expected: PASS.

- [x] **Step 2: Запустить полный test suite**

Run: `npm test -- --runInBand`

Expected: PASS.

- [x] **Step 3: Запустить typecheck**

Run: `npm run typecheck`

Expected: PASS.

- [x] **Step 4: Проверить изменённые файлы**

Run: `git diff --check && git status --short`

Expected: нет пробельных ошибок; `AGENTS.MD` остаётся единственным изменением, не принадлежащим прототипу.
