import { isContainsSearch } from "../helpers/utils";
import { IWidget, SpaceV3, FolderV3 } from "../helpers/types";
import type { IAppState } from "../state/state";
import { findSpaceById } from "../state/actionHelpers";

export function getBookmarksViewState(
  appState: Pick<
    IAppState,
    "spaces" | "currentSpaceId" | "search" | "showArchived"
  >,
): {
  folders: FolderV3[];
  widgets: IWidget[];
} {
  const canShowArchived = appState.showArchived || appState.search.length > 0;
  let folders: FolderV3[] = [];
  let widgets: IWidget[] = [];

  if (appState.search === "") {
    const currentSpace = findSpaceById(
      appState as { spaces: SpaceV3[]; currentSpaceId: number },
      appState.currentSpaceId,
    );

    if (currentSpace) {
      folders = appState.showArchived
        ? currentSpace.folders ?? []
        : currentSpace.folders.filter(
            (folder) => canShowArchived || !folder.archived,
          );

      widgets = currentSpace.widgets ?? [];
    }
  } else {
    const searchValueLC = appState.search.toLowerCase();
    appState.spaces.forEach((space) => {
      space.folders.forEach((folder) => {
        if (
          isContainsSearch(folder, searchValueLC) ||
          folder.items.some((item) => {
            if (isContainsSearch(item, searchValueLC)) {
              return true;
            }

            if (item.type === "group") {
              return item.groupItems.some((groupItem) =>
                isContainsSearch(groupItem, searchValueLC),
              );
            }

            return false;
          })
        ) {
          folders.push(folder);
        }
      });
    });
  }

  return { folders, widgets };
}
