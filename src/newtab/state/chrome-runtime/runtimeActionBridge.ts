import type { StoreApi } from "zustand/vanilla";
import { Action, type ActionPayload, type AppState } from "@/newtab/state/state";
import type { ActionDispatcher } from "@/newtab/state/actions";
import type { ChromeRuntimeStore } from "@/newtab/state/chrome-runtime/chromeRuntimeStore";
import type { DashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import type { UiStore } from "@/newtab/state/ui/uiStore";

export type RuntimeActionBridgeDependencies = {
  runtimeStore: StoreApi<ChromeRuntimeStore>;
  dashboardStore?: StoreApi<DashboardStore>;
  uiStore?: StoreApi<UiStore>;
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
  const { runtimeStore, dashboardStore, uiStore, legacyDispatch, closeTabs } = dependencies;

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

      case Action.UpdateSearch:
        if (uiStore) {
          uiStore.getState().setSearch(action.value);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.ShowNotification:
        if (uiStore) {
          uiStore.getState().showNotification(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.HideNotification:
        if (uiStore) {
          uiStore.getState().hideNotification();
          return;
        }
        legacyDispatch(action);
        return;

      case Action.CreateSpace:
        if (dashboardStore) {
          dashboardStore.getState().createSpace({
            id: action.spaceId,
            title: action.title,
            position: action.position,
          });
          return;
        }
        legacyDispatch(action);
        return;

      case Action.InitDashboard:
        if (dashboardStore || uiStore) {
          if (dashboardStore && action.spaces) {
            const dashboard = dashboardStore.getState();
            dashboard.hydrate({ spaces: action.spaces, currentSpaceId: dashboard.currentSpaceId });
          }
          if (uiStore && action.sidebarCollapsed !== undefined) {
            uiStore.getState().setSidebarCollapsed(action.sidebarCollapsed);
          }
          return;
        }
        legacyDispatch(action);
        return;

      case Action.Undo:
        if (dashboardStore) {
          dashboardStore.getState().undo();
          return;
        }
        legacyDispatch(action);
        return;

      case Action.ToggleDarkMode:
        if (uiStore) {
          uiStore.getState().toggleColorTheme();
          return;
        }
        legacyDispatch(action);
        return;

      case Action.SetColorTheme:
        if (uiStore) {
          uiStore.getState().setColorTheme(action.colorTheme);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateShowArchivedItems:
        if (uiStore) {
          uiStore.getState().setShowArchived(action.value);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateShowNotUsedItems:
        if (uiStore) {
          uiStore.getState().setShowNotUsed(action.value);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.SelectSpace:
        if (dashboardStore) {
          const dashboard = dashboardStore.getState();
          dashboard.selectSpace(action.spaceId ?? dashboard.spaces[action.spaceIndex ?? -1]?.id ?? -1);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.DeleteSpace:
        if (dashboardStore) {
          dashboardStore.getState().deleteSpace(action.spaceId);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateSpace:
        if (dashboardStore) {
          dashboardStore.getState().updateSpace(action.spaceId, pickDefined(action, ["title", "position"]));
          return;
        }
        legacyDispatch(action);
        return;

      case Action.MoveSpace:
        if (dashboardStore) {
          dashboardStore.getState().moveSpace(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.CreateFolder:
        if (dashboardStore) {
          dashboardStore.getState().createFolder({
            id: action.newFolderId,
            title: action.title,
            color: action.color,
            position: action.position,
            items: action.items,
            spaceId: action.spaceId,
          });
          return;
        }
        legacyDispatch(action);
        return;

      case Action.DeleteFolder:
        if (dashboardStore) {
          dashboardStore.getState().deleteFolder(action.folderId);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateFolder:
        if (dashboardStore) {
          dashboardStore.getState().updateFolder(
            action.folderId,
            pickDefined(action, ["title", "color", "archived", "collapsed", "twoColumn", "position"]),
          );
          return;
        }
        legacyDispatch(action);
        return;

      case Action.MoveFolder:
        if (dashboardStore) {
          dashboardStore.getState().moveFolder(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.CreateFolderItem:
        if (dashboardStore) {
          dashboardStore.getState().createFolderItem(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.CreateFolderItems:
        if (dashboardStore) {
          dashboardStore.getState().createFolderItems(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.DeleteFolderItems:
        if (dashboardStore) {
          dashboardStore.getState().deleteFolderItems(action.itemIds);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateFolderItem:
        if (dashboardStore) {
          dashboardStore.getState().updateFolderItem(
            action.itemId,
            pickDefined(action, ["title", "archived", "collapsed", "url", "favIconUrl"]),
          );
          return;
        }
        legacyDispatch(action);
        return;

      case Action.MoveFolderItems:
        if (dashboardStore) {
          dashboardStore.getState().moveFolderItems(action);
          return;
        }
        legacyDispatch(action);
        return;

      case Action.UpdateAppState:
        routeRuntimeFields(action.newState, runtime);
        routeDashboardFields(action.newState, dashboardStore?.getState());
        routeUiFields(action.newState, uiStore?.getState());

        const legacyState = getLegacyState(action.newState, Boolean(dashboardStore), Boolean(uiStore));
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

function routeDashboardFields(newState: Partial<AppState>, dashboard: DashboardStore | undefined): void {
  if (!dashboard) return;
  if (hasOwn(newState, "spaces") || hasOwn(newState, "currentSpaceId")) {
    dashboard.hydrate({
      spaces: newState.spaces ?? dashboard.spaces,
      currentSpaceId: newState.currentSpaceId ?? dashboard.currentSpaceId,
    });
  }
}

function routeUiFields(newState: Partial<AppState>, ui: UiStore | undefined): void {
  if (!ui) return;
  if (hasOwn(newState, "search")) ui.setSearch(newState.search!);
  if (hasOwn(newState, "searchFilters")) ui.setSearchFilters(newState.searchFilters!);
  if (hasOwn(newState, "searchFilterMode")) ui.setSearchFilterMode(newState.searchFilterMode!);
  if (hasOwn(newState, "itemInEdit")) ui.setItemInEdit(newState.itemInEdit);
  if (hasOwn(newState, "page")) ui.setPage(newState.page!);
  if (hasOwn(newState, "sidebarHovered")) ui.setSidebarHovered(newState.sidebarHovered!);
  if (hasOwn(newState, "sidebarCollapsed")) ui.setSidebarCollapsed(newState.sidebarCollapsed!);
  if (hasOwn(newState, "openBookmarksInNewTab")) ui.setOpenBookmarksInNewTab(newState.openBookmarksInNewTab!);
  if (hasOwn(newState, "colorTheme")) ui.setColorTheme(newState.colorTheme ?? "system");
  if (hasOwn(newState, "showRecent")) ui.setShowRecent(newState.showRecent!);
  if (hasOwn(newState, "showArchived")) ui.setShowArchived(newState.showArchived!);
  if (hasOwn(newState, "showNotUsed")) ui.setShowNotUsed(newState.showNotUsed!);
  if (hasOwn(newState, "hiddenFeatureIsEnabled")) ui.setHiddenFeatureIsEnabled(newState.hiddenFeatureIsEnabled!);
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

function getLegacyState(
  newState: Partial<AppState>,
  hasDashboardStore: boolean,
  hasUiStore: boolean,
): Partial<AppState> {
  const legacyState = { ...newState };
  delete legacyState.tabs;
  delete legacyState.recentItems;
  delete legacyState.currentWindowId;
  delete legacyState.lastActiveTabIds;
  delete legacyState.loaded;
  if (hasDashboardStore) {
    delete legacyState.spaces;
    delete legacyState.currentSpaceId;
  }
  if (hasUiStore) {
    delete legacyState.search;
    delete legacyState.searchFilters;
    delete legacyState.searchFilterMode;
    delete legacyState.itemInEdit;
    delete legacyState.notification;
    delete legacyState.page;
    delete legacyState.sidebarHovered;
    delete legacyState.sidebarCollapsed;
    delete legacyState.openBookmarksInNewTab;
    delete legacyState.colorTheme;
    delete legacyState.showRecent;
    delete legacyState.showArchived;
    delete legacyState.showNotUsed;
    delete legacyState.hiddenFeatureIsEnabled;
  }
  return legacyState;
}

function hasOwn<ObjectType extends object>(
  object: ObjectType,
  key: PropertyKey,
): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function pickDefined<ObjectType extends object, Key extends keyof ObjectType>(
  object: ObjectType,
  keys: Key[],
): Partial<Pick<ObjectType, Key>> {
  return keys.reduce((result, key) => {
    if (object[key] !== undefined) result[key] = object[key];
    return result;
  }, {} as Partial<Pick<ObjectType, Key>>);
}
