import { createDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/state/dashboard/types";

function createDashboardState(): DashboardState {
  return {
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Работа",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Инструменты",
            items: [],
          },
        ],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Личное",
        folders: [],
      },
    ],
  };
}

test("vanilla store доступен вне React и применяет именованные dashboard actions", () => {
  const store = createDashboardStore(createDashboardState());

  store.getState().selectSpace(2);
  store
    .getState()
    .updateFolder(10, { title: "Рабочие инструменты", collapsed: true });
  store.getState().moveFolder({ folderId: 10, targetSpaceId: 2 });

  expect(store.getState()).toMatchObject({
    currentSpaceId: 2,
    spaces: [
      { id: 1, folders: [] },
      {
        id: 2,
        folders: [
          expect.objectContaining({
            id: 10,
            title: "Рабочие инструменты",
            collapsed: true,
          }),
        ],
      },
    ],
  });
});

test("hydrate заменяет только dashboard data и сохраняет actions store", () => {
  const store = createDashboardStore(createDashboardState());

  store.getState().hydrate({ spaces: [], currentSpaceId: -1 });

  expect(store.getState()).toMatchObject({ spaces: [], currentSpaceId: -1 });
  expect(store.getState().selectSpace).toEqual(expect.any(Function));
});
