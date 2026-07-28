# Delete Group Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить удаление группы с подтверждением и переносом её закладок в конец родительской папки.

**Architecture:** Чистая доменная функция изменяет одну папку: исключает group-элемент и добавляет его `groupItems` в конец `items` с новыми fractional positions. Zustand action применяет эту операцию через существующий `applyWithUndo`; компонент вызывает action только после подтверждения.

**Tech Stack:** TypeScript, React, Zustand, Jest, fractional indexes.

## Global Constraints

- Пункт меню называется `Delete group`.
- Удаление всегда требует подтверждения.
- Закладки удаляемой группы становятся обычными закладками той же папки и добавляются в её конец в прежнем порядке.
- Операция должна поддерживать Undo.
- Не выполнять `git add` и `git commit` без явного разрешения пользователя.

### Task 1: Доменное удаление группы

**Files:**
- Modify: `src/newtab/state/dashboard/domain.ts:252-291`
- Modify: `src/__tests__/dashboardDomain.operations.test.ts:1-43`

**Interfaces:**
- Produces: `deleteFolderGroup(state: DashboardState, groupId: number): DashboardState`.
- Consumes: `addItemsToFolder(insertingItems, existingItems)` для переиндексации перенесённых bookmark-элементов.

- [ ] **Step 1: Write the failing test**

```ts
test("deleteFolderGroup переносит закладки группы в конец папки", () => {
  const result = deleteFolderGroup(stateWithBookmarkAndGroup, 200);

  expect(result.spaces[0].folders[0].items).toEqual([
    expect.objectContaining({ id: 100, type: "bookmark", title: "Before" }),
    expect.objectContaining({ id: 201, type: "bookmark", title: "First in group" }),
    expect.objectContaining({ id: 202, type: "bookmark", title: "Second in group" }),
  ]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/dashboardDomain.operations.test.ts`

Expected: TypeScript error because `deleteFolderGroup` is not exported.

- [ ] **Step 3: Write minimal implementation**

```ts
export function deleteFolderGroup(
  state: DashboardState,
  groupId: number,
): DashboardState {
  const folder = findFolderByItemId(state.spaces, groupId);
  const group = folder?.items.find(
    (item): item is GroupV3 => item.type === "group" && item.id === groupId,
  );
  if (!folder || !group) return state;

  return updateFolderInState(state, folder.id, (currentFolder) => ({
    ...currentFolder,
    items: addItemsToFolder(
      group.groupItems,
      currentFolder.items.filter((item) => item.id !== groupId),
    ),
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/dashboardDomain.operations.test.ts`

Expected: PASS; группа отсутствует, закладки в конце папки и упорядочены как в группе.

### Task 2: Store action и Undo

**Files:**
- Modify: `src/newtab/state/dashboard/dashboardStore.ts:7-46,76-99`
- Modify: `src/__tests__/dashboardStore.operations.test.ts:1-72`

**Interfaces:**
- Consumes: `deleteFolderGroup(state, groupId): DashboardState` из `dashboard/domain.ts`.
- Produces: `DashboardActions.deleteFolderGroup(groupId: number): void`.

- [ ] **Step 1: Write the failing test**

```ts
test("dashboard store восстанавливает удалённую группу через undo", () => {
  const store = createDashboardStore(stateWithGroup);

  store.getState().deleteFolderGroup(200);
  expect(store.getState().spaces[0].folders[0].items).not.toContainEqual(
    expect.objectContaining({ id: 200 }),
  );

  store.getState().undo();
  expect(store.getState().spaces[0].folders[0].items).toContainEqual(
    expect.objectContaining({ id: 200, type: "group" }),
  );
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/dashboardStore.operations.test.ts`

Expected: TypeScript error because `deleteFolderGroup` is absent from `DashboardActions`.

- [ ] **Step 3: Write minimal implementation**

```ts
import { deleteFolderGroup } from "@/newtab/state/dashboard/domain";

export type DashboardActions = {
  deleteFolderGroup(groupId: number): void;
};

deleteFolderGroup: (groupId) => set((state) =>
  applyWithUndo(state, deleteFolderGroup(state, groupId)),
),
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/dashboardStore.operations.test.ts`

Expected: PASS; один Undo возвращает group-элемент с исходными `groupItems`.

### Task 3: Контекстное меню и подтверждение

**Files:**
- Modify: `src/newtab/components/common/FolderGroup/FolderGroup.tsx:25-129`
- Modify: `src/__tests__/folderHeaders.contract.test.ts:36-59`

**Interfaces:**
- Consumes: `useDashboardStore((state) => state.deleteFolderGroup)`.
- Produces: пункт `Delete group`, вызывающий `confirm` и удаляющий группу только при положительном ответе.

- [ ] **Step 1: Write the failing contract test**

```ts
expect(source).toContain("Delete group");
expect(source).toContain("deleteFolderGroup(p.group.id)");
expect(source).toContain("confirm(");
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- --runInBand src/__tests__/folderHeaders.contract.test.ts`

Expected: FAIL because the group menu lacks `Delete group`.

- [ ] **Step 3: Write minimal implementation**

```tsx
const deleteFolderGroup = useDashboardStore(
  (state) => state.deleteFolderGroup,
);

function onDelete() {
  if (confirm(`Delete group '${p.group.title}'?`)) {
    deleteFolderGroup(p.group.id);
  }
  setShowMenu(false);
}

<button className="dropdown-menu__button focusable" onClick={onDelete}>
  Delete group
</button>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- --runInBand src/__tests__/folderHeaders.contract.test.ts`

Expected: PASS; контракт подтверждает пункт меню, подтверждение и вызов action.

### Task 4: Финальная проверка

**Files:**
- Verify: `src/newtab/state/dashboard/domain.ts`
- Verify: `src/newtab/state/dashboard/dashboardStore.ts`
- Verify: `src/newtab/components/common/FolderGroup/FolderGroup.tsx`

- [ ] **Step 1: Run targeted tests**

Run: `npm test -- --runInBand src/__tests__/dashboardDomain.operations.test.ts src/__tests__/dashboardStore.operations.test.ts src/__tests__/folderHeaders.contract.test.ts`

Expected: PASS without failures.

- [ ] **Step 2: Run type check**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 3: Inspect the patch**

Run: `git diff --check && git diff -- src/newtab/state/dashboard/domain.ts src/newtab/state/dashboard/dashboardStore.ts src/newtab/components/common/FolderGroup/FolderGroup.tsx src/__tests__/dashboardDomain.operations.test.ts src/__tests__/dashboardStore.operations.test.ts src/__tests__/folderHeaders.contract.test.ts`

Expected: no whitespace errors; only the scoped implementation and tests change.
