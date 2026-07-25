import React, { useEffect, useMemo, useReducer } from "react";
import { Bookmarks } from "@/newtab/components/common/Bookmarks/Bookmarks";
import { Sidebar } from "@/newtab/components/common/Sidebar/Sidebar";
import { Notification } from "@/newtab/components/common/Notification/Notification";
import { KeyboardAndMouseManager } from "./useKeyboardAndMouseManager";
import { ImportBookmarksFromSettings } from "@/newtab/components/common/ImportBookmarksFromSettings/ImportBookmarksFromSettings";
import { Action, getInitAppState, AppState } from "@/newtab/state/state";
import { DispatchContext, stateReducer } from "@/newtab/state/actions";
import { getBC, getStateFromLS } from "@/newtab/state/storage";
import Tab = chrome.tabs.Tab;
import cn from "clsx";
import {
  getHistory,
  tryLoadMoreHistory,
} from "@/newtab/helpers/recentHistoryUtils";
import {
  chromeRuntimeStore,
  useChromeRuntimeStore,
} from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import { createRuntimeActionBridge } from "@/newtab/state/chrome-runtime/runtimeActionBridge";

let notificationTimeout: number | undefined;
let globalAppState: AppState;

export function getGlobalAppState(): AppState {
  return globalAppState;
}

function invalidateStats(newState: AppState, prevState: AppState | undefined) {
  if (newState.tabs !== prevState?.tabs) {
    const uniqWinIds: number[] = [];
    newState.tabs.forEach((tab) => {
      if (!uniqWinIds.includes(tab.windowId)) {
        uniqWinIds.push(tab.windowId);
      }
    });
  }
}

function getTabs() {
  return new Promise<Tab[]>((res) => {
    chrome.tabs.query({}, (tabs) => {
      const openedTabs = tabs.reverse();
      res(openedTabs);
    });
  });
}

function getLastActiveTabsIds() {
  return new Promise<number[]>((res) => {
    chrome.runtime.sendMessage(
      { type: "get-last-active-tabs" },
      function (response) {
        if (response) {
          res(response.tabs);
        } else {
          res([]);
        }
      },
    );
  });
}

function getCurrentWindow() {
  return new Promise<number>((res) => {
    chrome.windows.getCurrent((window) => {
      res(window.id);
    });
  });
}

export function App() {
  const [legacyAppState, legacyDispatch] = useReducer(
    stateReducer,
    getInitAppState(),
  );
  const tabs = useChromeRuntimeStore((state) => state.tabs);
  const recentItems = useChromeRuntimeStore((state) => state.recentItems);
  const currentWindowId = useChromeRuntimeStore(
    (state) => state.currentWindowId,
  );
  const lastActiveTabIds = useChromeRuntimeStore(
    (state) => state.lastActiveTabIds,
  );
  const loaded = useChromeRuntimeStore((state) => state.loaded);

  /**
   * Временный compatibility state для компонентов, которые пока принимают
   * полный AppState через props. Runtime-поля уже принадлежат Zustand: старые
   * одноимённые поля reducer здесь намеренно перекрываются и не читаются UI.
   */
  const appState: AppState = {
    ...legacyAppState,
    tabs,
    recentItems,
    currentWindowId,
    lastActiveTabIds,
    loaded,
  };

  const dispatch = useMemo(
    () =>
      createRuntimeActionBridge({
        runtimeStore: chromeRuntimeStore,
        legacyDispatch,
        // Chrome API — внешний эффект. Он остаётся в controller-слое App, а
        // store получает только синхронное изменение своего state.
        closeTabs: (tabIds) => {
          chrome.tabs.remove(tabIds);
          chromeRuntimeStore.getState().closeTabs(tabIds);
        },
      }),
    [legacyDispatch],
  );

  // Обновляет глобальную ссылку на актуальное состояние приложения.
  useEffect(() => {
    invalidateStats(appState, globalAppState);
    // hack for getting last instance of appState in "getBC().onmessage" callback
    globalAppState = appState;
  });

  // Добавляет класс загрузки на body после инициализации приложения.
  useEffect(() => {
    if (appState.loaded) {
      requestAnimationFrame(() => {
        document.body.classList.add("app-loaded");
      });
    }
  }, [appState.loaded]);

  // Загружает начальные данные и подписывается на события Chrome.
  useEffect(function () {
    Promise.all([
      getTabs(),
      getHistory(), // TODO: !!!! now history updated only once, when app loaded. Fix it next time
      getLastActiveTabsIds(),
      getCurrentWindow(),
    ]).then(([tabs, historyItems, lastActiveTabIds, currentWindowId]) => {
      dispatch({
        type: Action.SetTabsOrHistory,
        tabs: tabs,
        recentItems: historyItems,
      });
      dispatch({ type: Action.UpdateAppState, newState: { lastActiveTabIds } });
      dispatch({ type: Action.UpdateAppState, newState: { currentWindowId } });
      dispatch({ type: Action.UpdateAppState, newState: { version: 3 } });
      dispatch({ type: Action.UpdateAppState, newState: { loaded: true } });

      requestAnimationFrame(() => {
        setTimeout(() => {
          // preload more history
          tryLoadMoreHistory(dispatch);
        }, 2000);
      });
    });

    function onTabUpdated(tabId: number, _info: Partial<Tab>, tab: Tab) {
      dispatch({ type: Action.UpdateTab, tabId, opt: tab });
    }

    function updateTabs() {
      getTabs().then((tabs) => {
        dispatch({ type: Action.SetTabsOrHistory, tabs });
      });
    }

    chrome.tabs.onCreated.addListener(() => updateTabs());
    chrome.tabs.onRemoved.addListener(() => updateTabs());
    chrome.tabs.onUpdated.addListener(onTabUpdated);

    getBC().onmessage = function (ev: MessageEvent) {
      if (ev.data?.type === "folders-updated") {
        getStateFromLS((res) => {
          if (globalAppState.sidebarCollapsed !== res.sidebarCollapsed) {
            dispatch({
              type: Action.InitDashboard,
              sidebarCollapsed: res.sidebarCollapsed,
              saveToLS: false,
            });
          }
          if (
            JSON.stringify(globalAppState.spaces) !== JSON.stringify(res.spaces)
          ) {
            dispatch({
              type: Action.InitDashboard,
              spaces: res.spaces,
              saveToLS: false,
            });
          }
        });
      }

      if (ev.data?.type === "last-active-tabs-updated") {
        dispatch({
          type: Action.UpdateAppState,
          newState: { lastActiveTabIds: ev.data.tabs },
        });
      }
    };

    chrome.windows.onFocusChanged.addListener((windowId) => {
      if (windowId !== -1) {
        // to don't do useless jumps when switch between browser and other windows
        dispatch({
          type: Action.UpdateAppState,
          newState: { currentWindowId: windowId },
        });
      }
    });
  }, []);

  // Автоматически скрывает уведомление после короткой задержки.
  useEffect(() => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      notificationTimeout = undefined;
    }

    if (appState.notification.visible && !appState.notification.isLoading) {
      notificationTimeout = window.setTimeout(() => {
        dispatch({ type: Action.HideNotification });
      }, 3500);
    }
  }, [appState.notification]);

  return (
    <DispatchContext.Provider value={dispatch}>
      {appState.loaded && (
        <div
          className={cn("app", {
            "collapsible-sidebar": appState.sidebarCollapsed,
          })}
        >
          <Notification notification={appState.notification} />
          {appState.page === "import" && (
            <ImportBookmarksFromSettings appState={appState} />
          )}
          {appState.page === "default" && (
            <>
              <Sidebar appState={appState} />
              <Bookmarks appState={appState} />
              <KeyboardAndMouseManager search={appState.search} />
            </>
          )}
        </div>
      )}
    </DispatchContext.Provider>
  );
}
