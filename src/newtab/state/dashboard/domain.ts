import { insertBetween, sortByPosition } from "@/newtab/helpers/fractionalIndexes";
import type { FolderV3 } from "@/newtab/helpers/types";
import type {
  DashboardState,
  FolderPatch,
  MoveFolderInput,
} from "@/newtab/state/dashboard/types";

/**
 * Чистые операции дашборда.
 *
 * В RTK им соответствовали бы reducer-функции внутри createSlice. Здесь они
 * вынесены отдельно, чтобы их можно было тестировать без Zustand и чтобы
 * vanilla store оставался тонким адаптером над предметной логикой.
 */

export function selectSpace(
  state: DashboardState,
  spaceId: number,
): DashboardState {
  const selectedSpace = state.spaces.find((space) => space.id === spaceId);
  const currentSpaceId = selectedSpace?.id ?? state.spaces[0]?.id ?? -1;

  return currentSpaceId === state.currentSpaceId
    ? state
    : { ...state, currentSpaceId };
}

export function updateFolder(
  state: DashboardState,
  folderId: number,
  patch: FolderPatch,
): DashboardState {
  let isUpdated = false;
  const spaces = state.spaces.map((space) => {
    const folderIndex = space.folders.findIndex(
      (folder) => folder.id === folderId,
    );
    if (folderIndex === -1) {
      return space;
    }

    isUpdated = true;
    const folders = [...space.folders];
    folders[folderIndex] = { ...folders[folderIndex], ...patch };
    return { ...space, folders };
  });

  return isUpdated ? { ...state, spaces } : state;
}

export function moveFolder(
  state: DashboardState,
  input: MoveFolderInput,
): DashboardState {
  const sourceSpace = state.spaces.find((space) =>
    space.folders.some((folder) => folder.id === input.folderId),
  );
  const targetSpace = state.spaces.find(
    (space) => space.id === input.targetSpaceId,
  );
  const folder = sourceSpace?.folders.find(
    (candidate) => candidate.id === input.folderId,
  );

  if (!sourceSpace || !targetSpace || !folder) {
    return state;
  }

  const spacesWithoutFolder = state.spaces.map((space) => {
    if (space.id !== sourceSpace.id) {
      return space;
    }

    return {
      ...space,
      folders: space.folders.filter(
        (candidate) => candidate.id !== input.folderId,
      ),
    };
  });
  const targetWithoutFolder = spacesWithoutFolder.find(
    (space) => space.id === input.targetSpaceId,
  )!;
  const lastFolder = getLastFolder(targetWithoutFolder.folders);
  const movedFolder: FolderV3 = {
    ...folder,
    position: insertBetween(lastFolder?.position ?? "", ""),
  };

  return {
    ...state,
    spaces: spacesWithoutFolder.map((space) => {
      if (space.id !== input.targetSpaceId) {
        return space;
      }

      return {
        ...space,
        folders: sortByPosition([...space.folders, movedFolder]),
      };
    }),
  };
}

function getLastFolder(folders: FolderV3[]): FolderV3 | undefined {
  return sortByPosition(folders).at(-1);
}
