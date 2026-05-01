import React from "react";
import { App } from "./components/App";
import "../styles/index.scss";
import { setInitAppState } from "./state/state";
import {
  applyTheme,
  getStateFromLS,
  SavingState,
  saveStateThrottled,
} from "./state/storage";
import { createRoot } from "react-dom/client";
import { getFirstSortedByPosition } from "./helpers/fractionalIndexes";
import { faviconsStorage } from "./helpers/faviconUtils";
import { ensureDefaultSpace } from "./helpers/ensureDefaultSpace";
import { collectBookmarksV3 } from "./helpers/v3Traversal";

runLocally();

async function runLocally() {
  getStateFromLS((res) => {
    preprocessLoadedState(res);
    setInitAppState(res);
    mountApp();
  });
}

function mountApp() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    <React.StrictMode>
      <App />,
    </React.StrictMode>,
  );
}

function preprocessLoadedState(state: SavingState): void {
  ensureDefaultSpace(state);

  const selectedSpace = state.spaces.find((s) => s.id === state.currentSpaceId);
  if (!selectedSpace) {
    const firstSortedSpace = getFirstSortedByPosition(state.spaces);
    if (firstSortedSpace) {
      state.currentSpaceId = firstSortedSpace.id;
    }
  }

  collectBookmarksV3(state.spaces).forEach((item) => {
    faviconsStorage.registerInCache(item.favIconUrl, item.url);
  });

  applyTheme(state.colorTheme);

  saveStateThrottled(state);
}
