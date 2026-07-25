import React from "react";
import { App } from "@/newtab/components/root/App";
import "@/styles/index.scss";
import { setInitAppState } from "@/newtab/state/state";
import {
  applyTheme,
  getStateFromLS,
  SavingState,
} from "@/newtab/state/storage";
import { createRoot } from "react-dom/client";
import { getFirstSortedByPosition } from "@/newtab/helpers/fractionalIndexes";
import { faviconsStorage } from "@/newtab/helpers/faviconUtils";
import { ensureDefaultSpace } from "@/newtab/helpers/ensureDefaultSpace";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";
import { dashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { uiStore } from "@/newtab/state/ui/uiStore";
import { createBrowserStorageAdapter } from "@/newtab/state/storage-sync/chromeStorageAdapter";
import { createStorageSyncController } from "@/newtab/state/storage-sync/controller";

async function startLocally() {
  // Читает сохраненное состояние из chrome.storage.local.
  getStateFromLS((res) => {
    // Подготавливает состояние перед запуском React.
    preprocessLoadedState(res);
    hydrateZustandStores(res);
    // Кладет загруженное состояние в стартовое состояние reducer.
    setInitAppState(res);
    mountApp();
  });
}

function hydrateZustandStores(state: SavingState): void {
  dashboardStore.getState().hydrate({
    spaces: state.spaces,
    currentSpaceId: state.currentSpaceId ?? state.spaces[0]?.id ?? -1,
  });
  uiStore.getState().hydratePreferences({
    sidebarCollapsed: state.sidebarCollapsed,
    openBookmarksInNewTab: state.openBookmarksInNewTab,
    colorTheme: state.colorTheme ?? "system",
    showRecent: state.showRecent,
    showArchived: state.showArchived,
    showNotUsed: state.showNotUsed,
    hiddenFeatureIsEnabled: state.hiddenFeatureIsEnabled,
  });

  // Новый persistence controller запускается только после initial hydration,
  // поэтому пустой Zustand store не может затереть данные пользователя.
  createStorageSyncController(
    dashboardStore,
    uiStore,
    createBrowserStorageAdapter(),
  ).start();
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

  // Собирает все закладки из spaces, включая закладки внутри групп.
  collectBookmarksV3(state.spaces).forEach((item) => {
    faviconsStorage.registerInCache(item.favIconUrl, item.url);
  });

  applyTheme(state.colorTheme);
}

// Запуск
startLocally();
