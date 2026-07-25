import {
  selectCurrentFolders,
  selectCurrentSpace,
  selectFolderById,
} from "@/newtab/state/dashboard/selectors";
import { createDashboardStore } from "@/newtab/state/dashboard/dashboardStore";

test("dashboard selectors возвращают минимальный срез текущего space", () => {
  const state = createDashboardStore({
    currentSpaceId: 1,
    spaces: [{
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Работа",
      folders: [{ id: 10, position: "a0", objectType: "folder", title: "Инструменты", items: [] }],
    }],
  }).getState();

  expect(selectCurrentSpace(state)).toEqual(expect.objectContaining({ id: 1 }));
  expect(selectCurrentFolders(state)).toEqual([expect.objectContaining({ id: 10 })]);
  expect(selectFolderById(10)(state)).toEqual(expect.objectContaining({ title: "Инструменты" }));
});
