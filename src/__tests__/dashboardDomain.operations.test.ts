import {
  createFolder,
  createSpace,
  createFolderItem,
  deleteFolderItems,
  moveFolderItems,
} from "@/newtab/state/dashboard/domain";
import type { DashboardState } from "@/newtab/state/dashboard/types";

const state: DashboardState = { spaces: [], currentSpaceId: -1 };

test("dashboard domain создаёт space, folder и bookmark item", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const result = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(result.spaces[0].folders[0].items[0]).toEqual(expect.objectContaining({ id: 100, type: "bookmark" }));
});

test("deleteFolderItems удаляет bookmark из folder", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const withItem = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(deleteFolderItems(withItem, [100]).spaces[0].folders[0].items).toEqual([]);
});

test("moveFolderItems оставляет дерево без изменений, если папка назначения не существует", () => {
  const withSpace = createSpace(state, { id: 1, title: "Работа" });
  const withFolder = createFolder(withSpace, { id: 10, spaceId: 1, title: "Инфраструктура", color: "#fff" });
  const withItem = createFolderItem(withFolder, {
    folderId: 10,
    item: { id: 100, title: "Grafana", url: "https://grafana.example", favIconUrl: "" },
  });

  expect(moveFolderItems(withItem, { itemIds: [100], targetFolderId: 999 })).toBe(withItem);
});
