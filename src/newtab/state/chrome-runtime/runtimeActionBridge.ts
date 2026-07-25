import type { StoreApi } from "zustand/vanilla";
import { Action, type ActionPayload, type AppState } from "@/newtab/state/state";
import type { ActionDispatcher } from "@/newtab/state/actions";
import type { ChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";

export type RuntimeActionBridgeDependencies = {
  runtimeStore: StoreApi<ChromeRuntimeStore>;
  legacyDispatch: ActionDispatcher;
  closeTabs(tabIds: number[]): void;
};

/**
 * Переходный адаптер между старым useReducer и Zustand.
 *
 * В RTK похожую роль выполнял бы middleware: он перехватывает часть actions и
 * направляет их новому владельцу state. Bridge не содержит Chrome API — это
 * остаётся обязанностью controller-слоя, переданного через closeTabs().
 */
export function createRuntimeActionBridge(
  dependencies: RuntimeActionBridgeDependencies,
): ActionDispatcher {
  const { runtimeStore, legacyDispatch, closeTabs } = dependencies;

  return (action: ActionPayload): void => {
    const runtime = runtimeStore.getState();

    switch (action.type) {
      case Action.SetTabsOrHistory:
        if (action.tabs !== undefined) {
          runtime.setTabs(action.tabs);
        }
        if (action.recentItems !== undefined) {
          runtime.setRecentItems(action.recentItems);
        }
        return;

      case Action.UpdateTab:
        runtime.updateTab(action.tabId, action.opt);
        return;

      case Action.CloseTabs:
        closeTabs(action.tabIds);
        return;

      case Action.UpdateAppState:
        routeRuntimeFields(action.newState, runtime);

        const legacyState = getLegacyState(action.newState);
        if (Object.keys(legacyState).length > 0) {
          legacyDispatch({
            type: Action.UpdateAppState,
            newState: legacyState,
          });
        }
        return;

      default:
        legacyDispatch(action);
    }
  };
}

function routeRuntimeFields(
  newState: Partial<AppState>,
  runtime: ChromeRuntimeStore,
): void {
  if (hasOwn(newState, "tabs")) {
    runtime.setTabs(newState.tabs!);
  }
  if (hasOwn(newState, "recentItems")) {
    runtime.setRecentItems(newState.recentItems!);
  }
  if (hasOwn(newState, "currentWindowId")) {
    runtime.setCurrentWindowId(newState.currentWindowId);
  }
  if (hasOwn(newState, "lastActiveTabIds")) {
    runtime.setLastActiveTabIds(newState.lastActiveTabIds!);
  }
  if (hasOwn(newState, "loaded")) {
    runtime.setLoaded(newState.loaded!);
  }
}

function getLegacyState(newState: Partial<AppState>): Partial<AppState> {
  const legacyState = { ...newState };
  delete legacyState.tabs;
  delete legacyState.recentItems;
  delete legacyState.currentWindowId;
  delete legacyState.lastActiveTabIds;
  delete legacyState.loaded;
  return legacyState;
}

function hasOwn<ObjectType extends object>(
  object: ObjectType,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}
