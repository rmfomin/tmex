import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;

export type ChromeRuntimeState = {
  tabs: Tab[];
  recentItems: RecentItem[];
  currentWindowId: number | undefined;
  lastActiveTabIds: number[];
  loaded: boolean;
};

export type ChromeRuntimeActions = {
  setTabs(tabs: Tab[]): void;
  setRecentItems(recentItems: RecentItem[]): void;
  updateTab(tabId: number, tab: Tab): void;
  closeTabs(tabIds: number[]): void;
  setCurrentWindowId(windowId: number | undefined): void;
  setLastActiveTabIds(tabIds: number[]): void;
  setLoaded(loaded: boolean): void;
};

export type ChromeRuntimeStore = ChromeRuntimeState & ChromeRuntimeActions;

const initialChromeRuntimeState: ChromeRuntimeState = {
  tabs: [],
  recentItems: [],
  currentWindowId: undefined,
  lastActiveTabIds: [],
  loaded: false,
};

/**
 * Runtime-срез не сохраняется в chrome.storage: вкладки и история принадлежат
 * браузеру и должны обновляться только его событиями. Это Zustand-аналог RTK
 * slice: store содержит данные и именованные синхронные actions, но не эффекты.
 */
export function createChromeRuntimeStore(
  initialState: Partial<ChromeRuntimeState> = {},
): StoreApi<ChromeRuntimeStore> {
  return createStore<ChromeRuntimeStore>()((set) => ({
    ...initialChromeRuntimeState,
    ...initialState,

    setTabs: (tabs) => set({ tabs }),
    setRecentItems: (recentItems) => set({ recentItems }),
    updateTab: (tabId, tab) => {
      set((state) => ({
        tabs: state.tabs.map((currentTab) =>
          currentTab.id === tabId ? tab : currentTab,
        ),
      }));
    },
    closeTabs: (tabIds) => {
      set((state) => ({
        tabs: state.tabs.filter((tab) => !tabIds.includes(tab.id ?? -1)),
      }));
    },
    setCurrentWindowId: (currentWindowId) => set({ currentWindowId }),
    setLastActiveTabIds: (lastActiveTabIds) => set({ lastActiveTabIds }),
    setLoaded: (loaded) => set({ loaded }),
  }));
}

/**
 * Singleton нужен controller-коду вне React. Компоненты ниже подписываются
 * через selector, как через RTK useSelector, и не читают весь store целиком.
 */
export const chromeRuntimeStore = createChromeRuntimeStore();

export function useChromeRuntimeStore<T>(
  selector: (state: ChromeRuntimeStore) => T,
): T {
  return useStore(chromeRuntimeStore, selector);
}
