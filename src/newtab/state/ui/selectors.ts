import type { UiPreferences, UiStore } from "@/newtab/state/ui/uiStore";

/** Селекторы дают компонентам стабильный узкий контракт вместо полного store. */
export function searchStateSelector(state: UiStore) {
  return {
    search: state.search,
    searchFilters: state.searchFilters,
    searchFilterMode: state.searchFilterMode,
  };
}

export function persistedPreferencesSelector(state: UiStore): UiPreferences {
  return {
    sidebarCollapsed: state.sidebarCollapsed,
    openBookmarksInNewTab: state.openBookmarksInNewTab,
    colorTheme: state.colorTheme,
    showRecent: state.showRecent,
    showArchived: state.showArchived,
    showNotUsed: state.showNotUsed,
    hiddenFeatureIsEnabled: state.hiddenFeatureIsEnabled,
  };
}
