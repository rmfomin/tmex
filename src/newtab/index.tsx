import React from "react";
import { App } from "@/newtab/components/root/App";
import "@/styles/index.scss";
import { setInitAppState } from "@/newtab/state/state";
import {
  applyTheme,
  getStateFromLS,
  SavingState,
  saveStateThrottled,
} from "@/newtab/state/storage";
import { createRoot } from "react-dom/client";
import { getFirstSortedByPosition } from "@/newtab/helpers/fractionalIndexes";
import { faviconsStorage } from "@/newtab/helpers/faviconUtils";
import { ensureDefaultSpace } from "@/newtab/helpers/ensureDefaultSpace";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";

async function startLocally() {
  // Читает сохраненное состояние из chrome.storage.local.
  getStateFromLS((res) => {
    // Подготавливает состояние перед запуском React.
    preprocessLoadedState(res);
    // Кладет загруженное состояние в стартовое состояние reducer.
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

  // Собирает все закладки из spaces, включая закладки внутри групп.
  collectBookmarksV3(state.spaces).forEach((item) => {
    faviconsStorage.registerInCache(item.favIconUrl, item.url);
  });

  applyTheme(state.colorTheme);
  // Сохраняет подготовленное состояние с задержкой, чтобы не писать слишком часто.
  saveStateThrottled(state);
}

// Запуск
// Здесь будет развилка на startFromNetwork
startLocally();
