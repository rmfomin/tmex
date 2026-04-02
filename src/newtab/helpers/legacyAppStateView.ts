import { ISpace } from "./types";
import { getLegacySpacesView } from "./dataFormatAdapters";
import { IAppState } from "../state/state";

export type AppStateLegacyView = Omit<IAppState, "spaces"> & {
  spaces: ISpace[];
};

export function getLegacyAppStateView(
  appState: IAppState,
): AppStateLegacyView {
  return {
    ...appState,
    spaces: getLegacySpacesView(appState.spaces),
  };
}
