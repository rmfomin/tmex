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
  // initialize app.stat
  ////////////////////////////////////////////////////////////
  if (state.stat) {
    console.log("---newtab-3-stat---");
    // not first run, need to update stat
    state.stat.sessionNumber++;
    state.stat.lastVersion = chrome.runtime.getManifest().version;
  } else {
    console.log("---newtab-3-NO-stat---");
    // the most first run of the extension
    state.stat = {
      sessionNumber: 1,
      firstSessionDate: Date.now(),
      lastVersion: chrome.runtime.getManifest().version,
    };
  }

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
  state.currentWhatsNew = getAvailableWhatsNew(
    state.stat.firstSessionDate,
    state.betaMode,
  );

  ////////////////////////////////////////////////////////////
  // Apply Dark Light Themes
  ////////////////////////////////////////////////////////////
  applyTheme(state.colorTheme);

  ////////////////////////////////////////////////////////////
  // save updated stat in state
  ////////////////////////////////////////////////////////////
  saveStateThrottled(state);
}

function disableHideItemFunctionality(res: ISavingAppState) {
  res.hiddenFeatureIsEnabled = hasArchivedItemsV3(res.spaces);
}
