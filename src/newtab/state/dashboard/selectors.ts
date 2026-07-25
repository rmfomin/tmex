import type { FolderV3, SpaceV3 } from "@/newtab/helpers/types";
import type { DashboardStore } from "@/newtab/state/dashboard/dashboardStore";

/** Небольшие именованные selectors не дают UI дублировать обход дерева. */
export const selectSpaces = (state: DashboardStore): SpaceV3[] => state.spaces;

export const selectCurrentSpace = (state: DashboardStore): SpaceV3 | undefined =>
  state.spaces.find((space) => space.id === state.currentSpaceId);

export const selectCurrentFolders = (state: DashboardStore): FolderV3[] =>
  selectCurrentSpace(state)?.folders ?? [];

export const selectFolderById = (folderId: number) => (state: DashboardStore): FolderV3 | undefined =>
  state.spaces.flatMap((space) => space.folders).find((folder) => folder.id === folderId);
