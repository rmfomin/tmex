import { IAppState } from "../state/state";
import { findSpaceById } from "../state/actionHelpers";

export function isEmptyDashboard(
  appState: Pick<IAppState, "spaces" | "currentSpaceId" | "search">,
): boolean {
  if (appState.search !== "") {
    return false;
  }

  const currentSpace = findSpaceById(appState, appState.currentSpaceId);
  if (!currentSpace) {
    return true;
  }

  return (
    currentSpace.folders.length === 0 &&
    (currentSpace.widgets?.length ?? 0) === 0
  );
}
