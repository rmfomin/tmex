import type { StoreApi } from "zustand/vanilla";
import type { DashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import type { DashboardState } from "@/newtab/state/dashboard/types";
import type { StorageSyncAdapter, PersistedNewtabState } from "@/newtab/state/storage-sync/types";
import type { UiStore } from "@/newtab/state/ui/uiStore";

export type StorageSyncController = {
  hydrate(): Promise<void>;
  start(): void;
  stop(): void;
};

/**
 * Zustand-аналог RTK listener middleware: подписывается на два vanilla store,
 * а внешний storage/BroadcastChannel эффект остаётся здесь, а не в actions.
 */
export function createStorageSyncController(
  dashboardStore: StoreApi<DashboardStore>,
  uiStore: StoreApi<UiStore>,
  adapter: StorageSyncAdapter,
  delayMs = 300,
): StorageSyncController {
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let stopDashboard: (() => void) | undefined;
  let stopUi: (() => void) | undefined;
  let stopBroadcast: (() => void) | undefined;
  let isHydrating = false;

  async function hydrate(): Promise<void> {
    isHydrating = true;
    try {
      applyPersistedState(await adapter.load());
    } finally {
      isHydrating = false;
    }
  }

  function applyPersistedState(state: PersistedNewtabState): void {
    dashboardStore.getState().hydrate({
      spaces: state.spaces,
      currentSpaceId: state.currentSpaceId ?? state.spaces[0]?.id ?? -1,
    });
    uiStore.getState().hydratePreferences({
      sidebarCollapsed: state.sidebarCollapsed,
      openBookmarksInNewTab: state.openBookmarksInNewTab,
      colorTheme: state.colorTheme,
      showRecent: state.showRecent,
      showArchived: state.showArchived,
      showNotUsed: state.showNotUsed,
      hiddenFeatureIsEnabled: state.hiddenFeatureIsEnabled,
    });
  }

  function scheduleSave(): void {
    if (isHydrating) return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      saveTimer = undefined;
      void adapter.save(toPersistedState(dashboardStore.getState(), uiStore.getState()))
        .then(() => adapter.broadcastUpdated());
    }, delayMs);
  }

  return {
    hydrate,
    start() {
      this.stop();
      stopDashboard = dashboardStore.subscribe((state, previous) => {
        if (state.spaces !== previous.spaces || state.currentSpaceId !== previous.currentSpaceId) scheduleSave();
      });
      stopUi = uiStore.subscribe((state, previous) => {
        if (hasPersistedPreferencesChanged(state, previous)) scheduleSave();
      });
      stopBroadcast = adapter.onUpdated(() => { void hydrate(); });
    },
    stop() {
      stopDashboard?.();
      stopUi?.();
      stopBroadcast?.();
      stopDashboard = undefined;
      stopUi = undefined;
      stopBroadcast = undefined;
      if (saveTimer) clearTimeout(saveTimer);
      saveTimer = undefined;
    },
  };
}

function toPersistedState(dashboard: DashboardState, ui: UiStore): PersistedNewtabState {
  return {
    version: 3,
    spaces: dashboard.spaces,
    currentSpaceId: dashboard.currentSpaceId === -1 ? undefined : dashboard.currentSpaceId,
    sidebarCollapsed: ui.sidebarCollapsed,
    openBookmarksInNewTab: ui.openBookmarksInNewTab,
    colorTheme: ui.colorTheme,
    showRecent: ui.showRecent,
    showArchived: ui.showArchived,
    showNotUsed: ui.showNotUsed,
    hiddenFeatureIsEnabled: ui.hiddenFeatureIsEnabled,
  };
}

function hasPersistedPreferencesChanged(current: UiStore, previous: UiStore): boolean {
  return current.sidebarCollapsed !== previous.sidebarCollapsed
    || current.openBookmarksInNewTab !== previous.openBookmarksInNewTab
    || current.colorTheme !== previous.colorTheme
    || current.showRecent !== previous.showRecent
    || current.showArchived !== previous.showArchived
    || current.showNotUsed !== previous.showNotUsed
    || current.hiddenFeatureIsEnabled !== previous.hiddenFeatureIsEnabled;
}
