import { AppState } from "@/newtab/state/state";
import { findSpaceById } from "@/newtab/state/actionHelpers";
import { hasSearch } from "@/newtab/helpers/utils";

export function isEmptyDashboard(
  appState: Pick<
    AppState,
    "spaces" | "currentSpaceId" | "search" | "searchFilters"
  >
): boolean {
  if (hasSearch(appState.search, appState.searchFilters ?? [])) {
    return false;
  }

  const currentSpace = findSpaceById(appState, appState.currentSpaceId);
  if (!currentSpace) {
    return true;
  }

  return currentSpace.folders.length === 0;
}
