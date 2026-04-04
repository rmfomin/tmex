import React, { useEffect, useReducer } from "react";
import { Bookmarks } from "./Bookmarks";
import { Sidebar } from "./Sidebar";
import { Notification } from "./Notification/Notification";
import { KeyboardAndMouseManager } from "./KeyboardAndMouseManager";
import { ImportBookmarksFromSettings } from "./ImportBookmarksFromSettings";
import { Action, getInitAppState, AppState } from "../state/state";
import { DispatchContext, stateReducer } from "../state/actions";
import { getBC, getStateFromLS } from "../state/storage";
import { executeAPICall } from "../../api/serverCommands";
import Tab = chrome.tabs.Tab;
import { CL } from "../helpers/classNameHelper";
import { getHistory, tryLoadMoreHistory } from "../helpers/recentHistoryUtils";

let notificationTimeout: number | undefined;
let globalAppState: AppState;

export function getGlobalAppState(): AppState {
  return globalAppState;
}

function invalidateStats(
  newState: AppState,
  prevState: AppState | undefined,
) {
  if (newState.tabs !== prevState?.tabs) {
    const uniqWinIds: number[] = [];
    newState.tabs.forEach((tab) => {
      if (!uniqWinIds.includes(tab.windowId)) {
        uniqWinIds.push(tab.windowId);
      }
    });
  }
}

export function App() {
  const [appState, dispatch] = useReducer(stateReducer, getInitAppState());

  useEffect(() => {
    invalidateStats(appState, globalAppState);
    // hack for getting last instance of appState in "getBC().onmessage" callback
    globalAppState = appState;
  });

  useEffect(() => {
    if (appState.loaded) {
      requestAnimationFrame(() => {
        document.body.classList.add("app-loaded");
      });
    }
  }, [appState.loaded]);

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

    function onTabUpdated(tabId: number, info: Partial<Tab>, tab: Tab) {
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

  useEffect(() => {
    // here we run the next command if any
    if (!appState.apiCommandId && appState.apiCommandsQueue.length > 0) {
      // take the new command from queue
      dispatch({
        type: Action.UpdateAppState,
        newState: { apiCommandId: appState.apiCommandsQueue[0].commandId },
      });
    }
  }, [appState.apiCommandsQueue, appState.apiCommandId]);

  useEffect(() => {
    if (appState.apiCommandId) {
      const currentCommand = appState.apiCommandsQueue.find(
        (cmd) => cmd.commandId === appState.apiCommandId,
      );
      if (currentCommand) {
        executeAPICall(currentCommand, dispatch);
      } else {
        throw new Error("Unacceptable flow, no currentCommand");
      }
    }
  }, [appState.apiCommandId]);

  return (
    <DispatchContext.Provider value={dispatch}>
      {appState.loaded && (
        <div
          className={CL("app", {
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
              <KeyboardAndMouseManager
                search={appState.search}
                selectedWidgetIds={appState.selectedWidgetIds}
              />
            </>
          )}
        </div>
      )}
    </DispatchContext.Provider>
  );
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

declare global {
  interface Window {
    pSBC: any;
  }
}
