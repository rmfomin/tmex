import { createContext } from "react";
import {
  Action,
  ActionPayload,
  HistoryActionPayload,
  AppState,
  UndoStep,
} from "@/newtab/state/state";
import {
  BookmarkItemV3,
  ColorTheme,
  FolderItemToCreate,
  FolderV3,
  SpaceV3,
} from "@/newtab/helpers/types";
import {
  applyTheme,
  saveStateThrottled,
  savingStateKeys,
} from "@/newtab/state/storage";
import {
  insertBetween,
  sortByPosition,
} from "@/newtab/helpers/fractionalIndexes";
import {
  addItemsToFolderV3,
  addItemsToGroupV3,
  findAnyItemById,
  findFolderById,
  findFolderByItemId,
  findSpaceByFolderId,
  findSpaceById,
  genUniqLocalId,
  removeItemFromFolderItems,
  updateFolder,
  updateFolderItem,
  updateSpace,
} from "@/newtab/state/actionHelpers";
import { genNextRuntimeId, getRandomHEXColor } from "@/newtab/helpers/utils";

export const DispatchContext = createContext<ActionDispatcher>(null!);

export type ActionDispatcher = (action: ActionPayload) => void;

export function stateReducer(state: AppState, action: ActionPayload): AppState {
  // unselectAll()
  const newState = stateReducer0(state, action);

  const haveSomethingToSave = savingStateKeys.some(
    (key) => state[key] !== newState[key]
  );
  if (haveSomethingToSave) {
    if (action.type !== Action.InitDashboard || action.saveToLS) {
      saveStateThrottled(newState);
    }
  }
  return newState;
}

function stateReducer0(state: AppState, action: ActionPayload): AppState {
  //todo add error icon prop
  const showNotificationReducer = (message: string) =>
    stateReducer0(state, {
      type: Action.ShowNotification,
      message,
      isError: false,
    });
  const showErrorReducer = (message: string) =>
    stateReducer0(state, {
      type: Action.ShowNotification,
      message,
      isError: true,
    });

  switch (action.type) {
    case Action.UpdateAppState: {
      return {
        ...state,
        ...action.newState,
      };
    }

    case Action.Undo: {
      const undoStep = state.undoSteps.at(-1);
      if (undoStep) {
        const newState: AppState = {
          ...state,
          undoSteps: state.undoSteps.filter((u) => u !== undoStep),
        };
        return undoStep.subSteps.reduce(
          (state, subStepAction) => stateReducer0(state, subStepAction),
          newState
        );
      } else {
        return showNotificationReducer("Nothing to undo");
      }
    }

    case Action.ShowNotification: {
      return {
        ...state,
        notification: {
          visible: true,
          message: action.message,
          button: action.button,
          isError: action.isError,
          isLoading: action.isLoading,
        },
      };
    }

    case Action.HideNotification: {
      return {
        ...state,
        notification: { ...state.notification, visible: false },
      };
    }

    case Action.UpdateSearch: {
      return { ...state, search: action.value };
    }

    case Action.InitDashboard: {
      return {
        ...state,
        spaces: action.spaces || state.spaces,
        sidebarCollapsed:
          typeof action.sidebarCollapsed !== "undefined"
            ? action.sidebarCollapsed
            : state.sidebarCollapsed,
      };
    }

    case Action.ToggleDarkMode: {
      const curMode = state.colorTheme ?? "system";
      const options: ColorTheme[] = ["light", "system", "dark"];
      const curModeIndex = options.indexOf(curMode);
      const nextMode =
        options[curModeIndex + 1 === options.length ? 0 : curModeIndex + 1];
      applyTheme(nextMode);
      return { ...state, colorTheme: nextMode };
    }

    case Action.SetColorTheme: {
      applyTheme(action.colorTheme);
      return { ...state, colorTheme: action.colorTheme };
    }

    case Action.UpdateShowArchivedItems: {
      return {
        ...state,
        showArchived: action.value,
      };
    }

    case Action.UpdateShowNotUsedItems: {
      return {
        ...state,
        showNotUsed: action.value,
      };
    }

    case Action.UpdateTab: {
      return {
        ...state,
        tabs: state.tabs.map((t) => {
          if (t.id === action.tabId) {
            return action.opt;
          } else {
            return t;
          }
        }),
      };
    }

    case Action.CloseTabs: {
      chrome.tabs.remove(action.tabIds);
      return {
        ...state,
        tabs: state.tabs.filter((t) => !action.tabIds.includes(t.id!)),
      };
    }

    case Action.SetTabsOrHistory: {
      return {
        ...state,
        tabs: action.tabs ?? state.tabs,
        recentItems: action.recentItems ?? state.recentItems,
      };
    }

    case Action.SelectSpace: {
      const targetSpace = action.spaceIndex
        ? state.spaces[action.spaceIndex]
        : findSpaceById(state, action.spaceId);
      return {
        ...state,
        currentSpaceId: targetSpace?.id ?? state.spaces.at(0)?.id ?? -1,
      };
    }

    case Action.SwipeSpace: {
      const currentIndex = state.spaces.findIndex(
        (space) => space.id === state.currentSpaceId
      );

      if (currentIndex === -1) {
        return showErrorReducer("Current space not found");
      }

      let newIndex = currentIndex;

      if (action.direction === "left") {
        newIndex =
          currentIndex === 0 ? state.spaces.length - 1 : currentIndex - 1;
      } else if (action.direction === "right") {
        newIndex =
          currentIndex === state.spaces.length - 1 ? 0 : currentIndex + 1;
      } else {
        return state; // Invalid direction, no change
      }

      return {
        ...state,
        currentSpaceId: state.spaces[newIndex].id,
      };
    }

    /********************************************************
     * SPACES CRUD
     ********************************************************/

    case Action.CreateSpace: {
      const lastSpace = state.spaces.at(-1);

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteSpace,
        spaceId: action.spaceId,
      }));

      const newSpace = {
        id: action.spaceId,
        objectType: "space" as const,
        title: action.title,
        position:
          action?.position ?? insertBetween(lastSpace?.position ?? "", ""),
        folders: [],
      };

      return {
        ...state,
        spaces: sortByPosition([...state.spaces, newSpace]),
        undoSteps,
      };
    }

    case Action.DeleteSpace: {

      const deletingSpace = findSpaceById(state, action.spaceId);
      if (!deletingSpace) {
        return showErrorReducer("Deleting space not found");
      }

      // const undoSteps = getUndoSteps(action, state, () => ({
      //   type: Action.CreateSpace,
      //   spaceId: deletingSpace.id,
      //   ...deletingSpace // todo !!! support restoring folders with UNDO in space
      // }))

      return {
        ...state,
        currentSpaceId:
          state.currentSpaceId !== action.spaceId
            ? state.currentSpaceId
            : state.spaces[0].id,
        spaces: state.spaces.filter((s) => s.id !== action.spaceId),
        // undoSteps
      };
    }

    case Action.UpdateSpace: {
      const newProps: Partial<SpaceV3> = {};
      if (typeof action.title !== "undefined") {
        newProps.title = action.title;
      }
      if (typeof action.position !== "undefined") {
        newProps.position = action.position;
      }

      const targetSpace = findSpaceById(state, action.spaceId);

      if (!targetSpace) {
        return showErrorReducer("Updating space not found");
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateSpace,
        spaceId: action.spaceId,
        title: targetSpace.title,
        position: targetSpace.position,
      }));

      return {
        ...state,
        spaces: updateSpace(state.spaces, action.spaceId, newProps),
        undoSteps,
      };
    }

    case Action.MoveSpace: {
      const movingSpace = findSpaceById(state, action.spaceId);
      if (!movingSpace) {
        return showErrorReducer(`Moving space not found`);
      }

      const insertBeforeSpaceIndex = state.spaces.findIndex(
        (s) => s.id === action.insertBeforeSpaceId
      );
      const insertAfterSpaceIndex =
        insertBeforeSpaceIndex === -1
          ? state.spaces.length - 1
          : insertBeforeSpaceIndex - 1;

      // confusing naming detected
      const newPosition = insertBetween(
        state.spaces[insertAfterSpaceIndex]?.position ?? "",
        state.spaces[insertBeforeSpaceIndex]?.position ?? ""
      );

      const spaces = updateSpace(state.spaces, action.spaceId, {
        position: newPosition,
      });

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateSpace,
        spaceId: movingSpace.id,
        position: movingSpace.position,
      }));

      return {
        ...state,
        spaces: spaces,
        undoSteps,
      };
    }

    /********************************************************
     * FOLDERS CRUD
     ********************************************************/

    case Action.CreateFolder: {
      const currentSpace = findSpaceById(
        state,
        action.spaceId ?? state.currentSpaceId
      );
      if (!currentSpace) {
        return showErrorReducer(`Space not found`);
      }

      const lastFolder = currentSpace.folders.at(-1);
      const newFolder: FolderV3 = {
        id: action.newFolderId ?? genUniqLocalId(),
        objectType: "folder",
        title: action.title ?? "New folder",
        items: addItemsToFolderV3(action.items ?? [], []),
        color: action.color ?? getRandomHEXColor(),
        position:
          action.position ?? insertBetween(lastFolder?.position ?? "", ""),
      };

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteFolder,
        folderId: newFolder.id,
      }));

      return {
        ...state,
        spaces: updateSpace(state.spaces, currentSpace.id, {
          folders: sortByPosition([...currentSpace.folders, newFolder]),
        }),
        undoSteps,
      };
    }

    case Action.DeleteFolder: {
      const deletingFolder = findFolderById(state, action.folderId);
      const parentSpace = findSpaceByFolderId(state, action.folderId);

      if (!deletingFolder || !parentSpace) {
        return showErrorReducer(`Deleting folder or space not found`);
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.InitDashboard,
        spaces: state.spaces,
      }));

      return {
        ...state,
        spaces: updateSpace(state.spaces, parentSpace.id, (space) => {
          return {
            ...space,
            folders: space.folders.filter((f) => f.id !== action.folderId),
          };
        }),
        undoSteps,
      };
    }

    case Action.UpdateFolder: {
      const newProps: Partial<FolderV3> = {};
      if (typeof action.title !== "undefined") {
        newProps.title = action.title;
      }
      if (typeof action.archived !== "undefined") {
        newProps.archived = action.archived;
      }
      if (typeof action.color !== "undefined") {
        newProps.color = action.color;
      }
      if (typeof action.collapsed !== "undefined") {
        newProps.collapsed = action.collapsed;
      }
      if (typeof action.twoColumn !== "undefined") {
        newProps.twoColumn = action.twoColumn;
      }
      if (typeof action.position !== "undefined") {
        newProps.position = action.position;
      }

      const targetFolder = findFolderById(state, action.folderId);

      if (!targetFolder) {
        return showErrorReducer(`Updating folder not found`);
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolder,
        folderId: action.folderId,
        title: targetFolder.title,
        archived: targetFolder.archived,
        collapsed: targetFolder.collapsed,
        color: targetFolder.color,
        position: targetFolder.position,
      }));

      return {
        ...state,
        spaces: updateFolder(
          state.spaces,
          action.folderId,
          newProps,
          !!newProps.position
        ),
        undoSteps,
      };
    }

    case Action.MoveFolder: {
      const targetFolderSpace = findSpaceById(state, action.targetSpaceId);
      const prevFolderSpace = findSpaceByFolderId(state, action.folderId);
      const movingFolder = findFolderById(state, action.folderId);
      if (!targetFolderSpace || !movingFolder || !prevFolderSpace) {
        return showErrorReducer(`Space or folder not found`);
      }

      const insertBeforeFolderIndex = targetFolderSpace.folders.findIndex(
        (f) => f.id === action.insertBeforeFolderId
      );
      const insertAfterFolderIndex =
        insertBeforeFolderIndex === -1
          ? targetFolderSpace.folders.length - 1
          : insertBeforeFolderIndex - 1;

      // confusing naming detected
      const position = insertBetween(
        targetFolderSpace.folders[insertAfterFolderIndex]?.position ?? "",
        targetFolderSpace.folders[insertBeforeFolderIndex]?.position ?? ""
      );

      let spaces: SpaceV3[];
      if (prevFolderSpace.id === targetFolderSpace.id) {
        spaces = updateFolder(
          state.spaces,
          action.folderId,
          { position },
          true
        );
      } else {
        spaces = state.spaces.map((space) => {
          if (space.id === prevFolderSpace.id) {
            return {
              ...space,
              folders: space.folders.filter(
                (folder) => folder.id !== action.folderId
              ),
            };
          } else if (space.id === targetFolderSpace.id) {
            return {
              ...space,
              folders: sortByPosition([
                ...space.folders,
                {
                  ...movingFolder,
                  position,
                },
              ]),
            };
          } else {
            return space;
          }
        });
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolder,
        folderId: movingFolder.id,
        position: movingFolder.position,
      }));

      return {
        ...state,
        spaces,
        undoSteps,
      };
    }

    /********************************************************
     * FOLDER ITEMS CRUD
     ********************************************************/

    case Action.CreateFolderItem: {
      if (
        action.targetGroupId &&
        "type" in action.item &&
        action.item.type === "group"
      ) {
        return showErrorReducer("Only bookmarks can be created into group");
      }

      const spaces = updateFolder(state.spaces, action.folderId, (folder) => {
        const items = action.targetGroupId
          ? addItemsToGroupV3(
              [action.item as BookmarkItemV3 | FolderItemToCreate],
              folder.items,
              action.targetGroupId,
              action.insertBeforeItemId
            )
          : addItemsToFolderV3(
              [action.item],
              folder.items,
              action.insertBeforeItemId
            );
        return {
          ...folder,
          items,
        };
      });

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.DeleteFolderItems,
        itemIds: [action.item.id],
      }));

      return {
        ...state,
        spaces: spaces,
        undoSteps,
      };
    }

    case Action.DeleteFolderItems: {
      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.InitDashboard,
        spaces: state.spaces,
      }));

      const deleteItemsFromFolders = (
        spaces: SpaceV3[],
        itemId: number
      ): SpaceV3[] => {
        const folder = findFolderByItemId({ spaces }, itemId);
        if (folder) {
          return updateFolder(spaces, folder.id, (folder) => {
            return {
              ...folder,
              items: removeItemFromFolderItems(folder.items, itemId),
            };
          });
        } else {
          return spaces;
        }
      };

      return {
        ...state,
        spaces: action.itemIds.reduce(deleteItemsFromFolders, state.spaces),
        undoSteps,
      };
    }

    case Action.UpdateFolderItem: {
      const newProps: Partial<BookmarkItemV3> & { collapsed?: boolean } = {};
      if (typeof action.title !== "undefined") {
        newProps.title = action.title;
      }
      if (typeof action.archived !== "undefined") {
        newProps.archived = action.archived;
      }
      if (typeof action.collapsed !== "undefined") {
        newProps.collapsed = action.collapsed;
      }
      if (typeof action.url !== "undefined") {
        newProps.url = action.url;
      }
      if (typeof action.favIconUrl !== "undefined") {
        newProps.favIconUrl = action.favIconUrl;
      }

      const originalItem = findAnyItemById(state, action.itemId);
      if (!originalItem) {
        console.error("Item was not found for item:", action.itemId);
        return showErrorReducer("Item was not found");
      }
      const folderId = findFolderByItemId(state, action.itemId)?.id;
      if (!folderId) {
        console.error("Folder was not found for item:", action.itemId);
        return showErrorReducer("Folder was not found");
      }

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.UpdateFolderItem,
        itemId: originalItem.id,
        title: originalItem.title,
        archived: originalItem.archived,
        collapsed:
          originalItem.type === "group" ? originalItem.collapsed : undefined,
        url: originalItem.type === "bookmark" ? originalItem.url : undefined,
        favIconUrl:
          originalItem.type === "bookmark"
            ? originalItem.favIconUrl
            : undefined,
      }));

      return {
        ...state,
        spaces: updateFolderItem(
          state.spaces,
          action.itemId,
          newProps,
          folderId
        ),
        undoSteps,
      };
    }

    case Action.MoveFolderItems: {
      const movingItems = action.itemIds.map(
        (itemId) => findAnyItemById(state, itemId)!
      );

      if (
        action.targetGroupId &&
        movingItems.some((movingItem) => movingItem.type !== "bookmark")
      ) {
        return showErrorReducer("Only bookmarks can be moved into group");
      }

      // Store the original folder IDs and positions for undo purposes
      // const originalPositions = movingItems.map(item => ({
      //   itemId: item.id,
      //   originalFolderId: findFolderByItemId(state, item.id)!.id,
      //   originalPosition: item.position
      // }))

      const spaceWithFolderWithRemovedItems: SpaceV3[] = movingItems.reduce(
        (spaces, movingItem) => {
          const folder = findFolderByItemId({ spaces }, movingItem.id)!;
          return updateFolder(spaces, folder.id, (folder) => ({
            ...folder,
            items: removeItemFromFolderItems(folder.items, movingItem.id),
          }));
        },
        state.spaces
      );

      const spaces = updateFolder(
        spaceWithFolderWithRemovedItems,
        action.targetFolderId,
        (folder) => ({
          ...folder,
          items: action.targetGroupId
            ? addItemsToGroupV3(
                movingItems as BookmarkItemV3[],
                folder.items,
                action.targetGroupId,
                action.insertBeforeItemId
              )
            : addItemsToFolderV3(
                movingItems,
                folder.items,
                action.insertBeforeItemId
              ),
        })
      );

      const undoSteps = getUndoSteps(action, state, () => ({
        type: Action.InitDashboard,
        spaces: state.spaces,
      }));

      return {
        ...state,
        spaces: spaces,
        undoSteps,
      };
    }

    default:
      throw new Error(`Unknown action ${action["type"]}`);
  }
}

//////////////////////////////////////////////////////////////////////
// UTILS
//////////////////////////////////////////////////////////////////////

export function canShowArchived(
  appState: Pick<AppState, "search" | "showArchived">
) {
  return appState.showArchived || appState.search.length > 0;
}

export function executeCustomAction(
  actionUrl: string,
  dispatch: ActionDispatcher
): void {
  const cAction: string = actionUrl.split("//")[1] || "";
  if (cAction === "import-bookmarks") {
    // open bookmarks importing
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } });
  }
}

// There is no need in callback. I added only for better readability.
export function mergeStepsInHistory(
  callback: (historyStepId: number) => void
): void {
  callback(genNextRuntimeId());
}

function getUndoSteps(
  currentAction: HistoryActionPayload,
  state: AppState,
  callback: () => ActionPayload | ActionPayload[]
): UndoStep[] {
  const MAX_HISTORY_LENGTH = 50;

  if (currentAction.byUndo) {
    // In that case no need to add new step in history, just return current undo actions
    return state.undoSteps;
  } else {
    let actionOrActions = callback();
    if (!Array.isArray(actionOrActions)) {
      actionOrActions = [actionOrActions];
    }
    actionOrActions.forEach((a) => (a.byUndo = true));

    const existingStep = state.undoSteps.find(
      (step) => step.id === currentAction.historyStepId
    );
    if (existingStep) {
      existingStep.subSteps.push(...actionOrActions);
      // we return the same instance of array, but it should work because it is not used in ReactComponents
      return state.undoSteps;
    } else {
      const newUndoStep = {
        id: currentAction.historyStepId ?? genNextRuntimeId(),
        subSteps: actionOrActions,
      };
      const updatedUndoActions = [...state.undoSteps, newUndoStep];
      return updatedUndoActions.length > MAX_HISTORY_LENGTH
        ? updatedUndoActions.slice(-MAX_HISTORY_LENGTH)
        : updatedUndoActions;
    }
  }
}
