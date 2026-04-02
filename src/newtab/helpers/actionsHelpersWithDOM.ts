import { BookmarkItemV3, IFolderItemToCreate, SpaceV3 } from "./types";
import { ActionDispatcher, executeCustomAction } from "../state/actions";
import { Action, IAppState } from "../state/state";
import {
  findItemById,
  genUniqLocalId,
  isCustomActionItem,
} from "../state/actionHelpers";

export function showMessage(
  message: string,
  dispatch: ActionDispatcher,
  isLoading = false,
): void {
  dispatch({
    type: Action.ShowNotification,
    message: message,
    isLoading,
  });
}

export function showErrorMessage(
  errorMessage: string,
  dispatch: ActionDispatcher,
): void {
  dispatch({
    type: Action.ShowNotification,
    message: errorMessage,
    isError: true,
  });
}

type CreateFolderProps = {
  title?: string;
  color?: string;
  position?: string;
  items?: IFolderItemToCreate[];
  spaceId?: number;
  historyStepId?: number;
};

export function createFolderWithStat(
  dispatch: any,
  props: CreateFolderProps,
  statSource: string,
): number {
  const newFolderId = genUniqLocalId();
  dispatch({ type: Action.CreateFolder, newFolderId, ...props });
  return newFolderId;
}

export function showMessageWithUndo(
  message: string,
  dispatch: ActionDispatcher,
): void {
  dispatch({
    type: Action.ShowNotification,
    message: message,
    button: {
      text: "Undo",
      onClick: () => {
        dispatch({ type: Action.Undo, dispatch });
        dispatch({ type: Action.HideNotification });
      },
    },
  });
}

export function getCanDragChecker(
  search: string,
  dispatch: ActionDispatcher,
): () => boolean {
  return () => {
    if (search) {
      dispatch({
        type: Action.ShowNotification,
        message: "Sorting is unavailable in search",
      });
      return false;
    } else {
      return true;
    }
  };
}

export function clickFolderItem(
  targetId: number,
  appState: { spaces: SpaceV3[]; tabs: IAppState["tabs"] },
  dispatch: ActionDispatcher,
  openInNewTab: boolean,
  openBookmarksInNewTab: boolean,
) {
  const targetItem = findItemById(appState, targetId);
  if (targetItem?.isSection) {
    onRenameSection(targetItem);
  } else if (isCustomActionItem(targetItem) && targetItem?.url) {
    executeCustomAction(targetItem.url, dispatch);
  } else if (targetItem) {
    if (!targetItem.url) {
      showErrorMessage("Bookmark URL is empty", dispatch);
      return;
    }

    if (openInNewTab) {
      // open in new tab
      chrome.tabs.create({ url: targetItem.url, active: false });
      //TODO fix bug of not updating bold items when move to new tab in new window
    } else {
      // open in the same tab or switch to already opened
      const tab = appState.tabs.find((t) => t.url === targetItem.url);
      if (tab && tab.id) {
        chrome.tabs.update(tab.id, { active: true });
        chrome.windows.update(tab.windowId, { focused: true });
      } else {
        chrome.tabs.getCurrent((t) => {
          if (openBookmarksInNewTab) {
            chrome.tabs.create({ url: targetItem.url, active: true });
          } else {
            chrome.tabs.update(t?.id!, { url: targetItem.url });
          }
        });
      }
    }
  }

  function onRenameSection(targetItem: BookmarkItemV3) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: targetItem.id },
    });
  }
}
