import { AppState } from "@/newtab/state/state";
import { findSpaceById } from "@/newtab/state/actionHelpers";

export function isEmptyDashboard(
  appState: Pick<AppState, "spaces" | "currentSpaceId" | "search">,
): boolean {
  if (appState.search !== "") {
    return false;
  }

  const currentSpace = findSpaceById(appState, appState.currentSpaceId);
  if (!currentSpace) {
    return true;
  }

  return currentSpace.folders.length === 0;
}
