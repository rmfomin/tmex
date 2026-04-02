import React from "react";
import { App } from "./components/App";
import { setInitAppState } from "./state/state";
import {
  applyTheme,
  getStateFromLS,
  ISavingAppState,
  isBetaMode,
  saveStateThrottled,
} from "./state/storage";
import { apiGetDashboard, loadFromNetwork } from "../api/api";
import { createRoot } from "react-dom/client";
import { getFirstSortedByPosition } from "./helpers/fractionalIndexes";
import { faviconsStorage } from "./helpers/faviconUtils";
import { getAvailableWhatsNew } from "./helpers/whats-new";
import { ensureDefaultSpace } from "./helpers/ensureDefaultSpace";
import { collectBookmarksV3, hasArchivedItemsV3 } from "./helpers/v3Traversal";

if (loadFromNetwork()) {
  getStateFromLS((res) => {
    apiGetDashboard()
      .then((dashboard) => {
        console.log(dashboard.spaces);
        setInitAppState(res);
        mountApp();
      })
      .catch((error) => {
        console.error(error);
        runLocally();
      });
  });
} else {
  runLocally();
}

async function runLocally() {
  getStateFromLS((res) => {
    preprocessLoadedState(res);
    disableHideItemFunctionality(res);
    setInitAppState(res);
    mountApp();
  });
}

function mountApp() {
  const root = createRoot(document.getElementById("root")!);
  root.render(
    // <React.StrictMode>
    <App />,
    // </React.StrictMode>
  );
}

function preprocessLoadedState(state: ISavingAppState): void {
  ensureDefaultSpace(state);

  ////////////////////////////////////////////////////////////
  // Making sure that selected space exists
  ////////////////////////////////////////////////////////////
  const selectedSpace = state.spaces.find((s) => s.id === state.currentSpaceId);
  if (!selectedSpace) {
    const firstSortedSpace = getFirstSortedByPosition(state.spaces);
    if (firstSortedSpace) {
      state.currentSpaceId = firstSortedSpace.id;
    }
  }

  ////////////////////////////////////////////////////////////
  // Process FavIcons
  ////////////////////////////////////////////////////////////

  collectBookmarksV3(state.spaces).forEach((item) => {
    faviconsStorage.registerInCache(item.favIconUrl, item.url);
  });

  ////////////////////////////////////////////////////////////
  // Check if user in betaMode
  ////////////////////////////////////////////////////////////
  state.betaMode = isBetaMode();

  ////////////////////////////////////////////////////////////
  // Init available "Whats new"
  ////////////////////////////////////////////////////////////
  state.currentWhatsNew = getAvailableWhatsNew(state.betaMode);

  ////////////////////////////////////////////////////////////
  // Apply Dark Light Themes
  ////////////////////////////////////////////////////////////
  applyTheme(state.colorTheme);

  ////////////////////////////////////////////////////////////
  // save normalized startup state
  ////////////////////////////////////////////////////////////
  saveStateThrottled(state);
}

function disableHideItemFunctionality(res: ISavingAppState) {
  res.hiddenFeatureIsEnabled = hasArchivedItemsV3(res.spaces);
}
