import {
  BookmarkItemV3,
  DataBackupV3,
  FolderV3,
  GroupV3,
  IFolder,
  IFolderItem,
  ISpace,
  ItemV3,
  SpaceV3,
} from "./types";
import { Action } from "../state/state";
import { ActionDispatcher } from "../state/actions";
import {
  createNewFolderItem,
  genUniqLocalId,
  getTempFavIconUrl,
} from "../state/actionHelpers";
import { showMessage } from "./actionsHelpersWithDOM";
import { getTopVisitedFromHistory } from "./utils";
import HistoryItem = chrome.history.HistoryItem;
import { RecentItem } from "./recentHistoryUtils";

type IBackup = {
  isTabme: true;
  version: number;
  spaces: ISpace[];
};

// TODO(v3-migration): delete after legacy import formats are dropped.
function isLegacyImportJson(data: IFolder[]) {
  return Array.isArray(data) && data[0]?.title && data[0]?.items;
}

// TODO(v3-migration): delete after version 2 backups are no longer supported.
function isImportJsonV2(data: IBackup) {
  return data.isTabme && Array.isArray(data.spaces) && data.version === 2;
}

function isImportJsonV3(data: DataBackupV3) {
  return data.isTabme && Array.isArray(data.spaces) && data.version === 3;
}

function normalizeBookmarkItemV3(item: BookmarkItemV3): BookmarkItemV3 {
  return {
    ...item,
    objectType: "bookmark",
  };
}

function normalizeGroupV3(item: GroupV3): GroupV3 {
  return {
    ...item,
    objectType: "group",
    groupItems: item.groupItems.map(normalizeBookmarkItemV3),
  };
}

function normalizeItemV3(item: ItemV3): ItemV3 {
  if (item.type === "group") {
    return normalizeGroupV3(item);
  }

  return normalizeBookmarkItemV3(item);
}

function normalizeFolderV3(folder: FolderV3): FolderV3 {
  return {
    ...folder,
    objectType: "folder",
    items: folder.items.map(normalizeItemV3),
  };
}

function normalizeSpaceV3(space: SpaceV3): SpaceV3 {
  return {
    ...space,
    objectType: "space",
    folders: space.folders.map(normalizeFolderV3),
  };
}

export function normalizeBackupV3(data: DataBackupV3): DataBackupV3 {
  return {
    ...data,
    spaces: data.spaces.map(normalizeSpaceV3),
  };
}

// TODO(v3-migration): delete after app state and UI switch from legacy ISpace/IFolder/IFolderItem to v3 types.
function convertBookmarkItemV3ToLegacy(item: BookmarkItemV3): IFolderItem {
  return {
    id: item.id,
    position: item.position,
    title: item.title,
    url: item.url,
    favIconUrl: item.favIconUrl,
  };
}

// TODO(v3-migration): rewrite when UI/state support ItemV3 directly; current adapter flattens groups and loses structure.
function convertFolderItemsV3ToLegacy(items: ItemV3[]): IFolderItem[] {
  return items.flatMap((item) => {
    if (item.type === "bookmark") {
      return [convertBookmarkItemV3ToLegacy(item)];
    }

    return item.groupItems.map(convertBookmarkItemV3ToLegacy);
  });
}

// TODO(v3-migration): delete after app state and UI switch from legacy ISpace/IFolder/IFolderItem to v3 types.
function convertFolderV3ToLegacy(folder: FolderV3): IFolder {
  return {
    id: folder.id,
    position: folder.position,
    title: folder.title,
    color: folder.color,
    items: convertFolderItemsV3ToLegacy(folder.items),
  };
}

// TODO(v3-migration): delete after app state and UI switch from legacy ISpace/IFolder/IFolderItem to v3 types.
function convertSpaceV3ToLegacy(space: SpaceV3): ISpace {
  return {
    id: space.id,
    position: space.position,
    title: space.title,
    widgets: space.widgets,
    folders: space.folders.map(convertFolderV3ToLegacy),
  };
}

// TODO(v3-migration): delete after import pipeline initializes app state from DataBackupV3 directly.
export function convertV3BackupToLegacySpaces(data: DataBackupV3): ISpace[] {
  return normalizeBackupV3(data).spaces.map(convertSpaceV3ToLegacy);
}

// TODO(v3-migration): rewrite export once legacy runtime model is removed; this cannot represent groups or sections faithfully.
function convertLegacyFolderItemToV3(item: IFolderItem): BookmarkItemV3 {
  return {
    id: item.id,
    position: item.position,
    title: item.title,
    type: "bookmark",
    objectType: "bookmark",
    url: item.url,
    favIconUrl: item.favIconUrl,
  };
}

// TODO(v3-migration): rewrite export once runtime folders are FolderV3 and no lossy conversion is needed.
function convertLegacyFolderToV3(folder: IFolder): FolderV3 {
  return {
    id: folder.id,
    position: folder.position,
    objectType: "folder",
    title: folder.title,
    items: folder.items.map(convertLegacyFolderItemToV3),
    color: folder.color,
  };
}

// TODO(v3-migration): rewrite export once runtime spaces are SpaceV3 and no lossy conversion is needed.
function convertLegacySpaceToV3(space: ISpace): SpaceV3 {
  return {
    id: space.id,
    position: space.position,
    objectType: "space",
    title: space.title,
    folders: space.folders.map(convertLegacyFolderToV3),
    widgets: space.widgets,
  };
}

// TODO(v3-migration): keep for step 2, then simplify or inline after runtime moves to v3.
export function convertLegacySpacesToV3Backup(spaces: ISpace[]): DataBackupV3 {
  return {
    isTabme: true,
    version: 3,
    spaces: spaces.map(convertLegacySpaceToV3),
  };
}

export function importFromJson(event: any, dispatch: ActionDispatcher) {
  function receivedText(e: any) {
    let lines = e.target.result;
    try {
      const res = JSON.parse(lines);
      if (isLegacyImportJson(res)) {
        // TODO(v3-migration): delete this branch after support for legacy array backups is dropped.
        dispatch({
          // clear existing folders
          type: Action.InitDashboard,
          spaces: [],
          saveToLS: true,
        });

        const defaultSpaceId = genUniqLocalId();
        dispatch({
          type: Action.CreateSpace,
          spaceId: defaultSpaceId,
          title: "Bookmarks",
        });
        dispatch({ type: Action.SelectSpace, spaceId: defaultSpaceId });

        const loadedFolders = res as IFolder[];
        loadedFolders.forEach((loadedFolder) => {
          dispatch({
            type: Action.CreateFolder, // intentionally does not send additional stat here
            title: loadedFolder.title,
            items: loadedFolder.items,
            color: loadedFolder.color,
          });
        });

        showMessage("Backup has been imported", dispatch);
      } else if (isImportJsonV2(res)) {
        // TODO(v3-migration): delete this branch after support for version 2 backups is dropped.
        const data = res as IBackup;
        dispatch({
          type: Action.InitDashboard,
          spaces: data.spaces,
          saveToLS: true,
        });

        dispatch({
          type: Action.SelectSpace,
          spaceId: -1, //hack to force update
        });

        showMessage("Backup has been imported", dispatch);
      } else if (isImportJsonV3(res)) {
        const data = res as DataBackupV3;
        dispatch({
          type: Action.InitDashboard,
          // TODO(v3-migration): replace with direct v3 initialization once app state stops using legacy space types.
          spaces: convertV3BackupToLegacySpaces(data),
          saveToLS: true,
        });

        dispatch({
          type: Action.SelectSpace,
          spaceId: -1, //hack to force update
        });

        showMessage("Backup has been imported", dispatch);
      } else {
        dispatch({
          type: Action.ShowNotification,
          isError: true,
          message: "Unsupported JSON format",
        });
      }
    } catch (e) {
      console.error(e);
      dispatch({
        type: Action.ShowNotification,
        isError: true,
        message: "Unsupported JSON format",
      });
    }
  }

  const file = event.target.files[0];
  const fr = new FileReader();
  fr.onload = receivedText;
  fr.readAsText(file);
}

export function onExportJson(spaces: ISpace[]) {
  function downloadObjectAsJson(exportObj: any, exportName: string) {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(exportObj));
    const downloadAnchorNode = document.createElement("a");
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  }

  const backup = convertLegacySpacesToV3Backup(spaces);
  downloadObjectAsJson(backup, "tabme_backup");
}

export function onImportFromToby(
  event: any,
  dispatch: ActionDispatcher,
  onReady?: () => void,
) {
  function receivedText(e: any) {
    let lines = e.target.result;
    try {
      const tobyData = JSON.parse(lines) as ITobyJson;
      const validFormat = Array.isArray(tobyData.lists);
      if (validFormat) {
        let count = 0;
        tobyData.lists.forEach((tobyFolder) => {
          dispatch({
            type: Action.CreateFolder, // intentionally does not send additional stat here
            title: tobyFolder.title,
            items: tobyFolder.cards.map((card) => ({
              id: genUniqLocalId(),
              title: card.title,
              url: card.url,
              favIconUrl: getTempFavIconUrl(card.url),
            })),
          });
          count += tobyFolder.cards.length;
        });
        onReady && onReady();
      } else {
        dispatch({
          type: Action.ShowNotification,
          isError: true,
          message: "Unsupported JSON format",
        });
      }
    } catch (e) {
      console.error(e);
      dispatch({
        type: Action.ShowNotification,
        isError: true,
        message: "Unsupported JSON format",
      });
    }
  }

  const file = event.target.files[0];
  const fr = new FileReader();
  fr.onload = receivedText;
  fr.readAsText(file);
}

type ITobyItem = {
  title: string;
  url: string;
};
type ITobyFolder = {
  title: string;
  cards: ITobyItem[];
};
type ITobyJson = {
  lists: ITobyFolder[];
};

//////////////////////////////////////////////////////////////////////
// IMPORT BROWSER BOOKMARKS HELPERS
//////////////////////////////////////////////////////////////////////

// copy-paste Chrome types
export type CustomBookmarkTreeNode = {
  checked?: boolean;
  mostVisited?: boolean;

  /** Optional. The 0-based position of this node within its parent folder.  */
  index?: number;
  /** Optional. When this node was created, in milliseconds since the epoch (new Date(dateAdded)).  */
  dateAdded?: number;
  /** The text displayed for the node. */
  title: string;
  /** Optional. The URL navigated to when a user clicks the bookmark. Omitted for folders.   */
  url?: string;
  /** Optional. When the contents of this folder last changed, in milliseconds since the epoch.   */
  dateGroupModified?: number;
  /** The unique identifier for the node. IDs are unique within the current profile, and they remain valid even after the browser is restarted.  */
  id: string;
  /** Optional. The id of the parent folder. Omitted for the root node.   */
  parentId?: string;
  /** Optional. An ordered list of children of this node.  */
  children?: CustomBookmarkTreeNode[];
  /**
   * Optional.
   * Since Chrome 37.
   * Indicates the reason why this node is unmodifiable. The managed value indicates that this node was configured by the system administrator or by the custodian of a supervised
   * user. Omitted if the node can be modified by the user and the extension (default).
   */
  unmodifiable?: any;
};

export type PlainListRecord = {
  breadcrumbs: CustomBookmarkTreeNode[];
  folder: CustomBookmarkTreeNode;
};
export type BookmarksAsPlainList = PlainListRecord[];

export function getBrowserBookmarks(
  onReady: (res: BookmarksAsPlainList) => void,
  recentItems: RecentItem[],
  dispatch: ActionDispatcher,
): void {
  const history = getTopVisitedFromHistory(recentItems, 1000);

  // Fetch bookmark folders from Chrome API
  chrome.bookmarks.getTree((bookmarks) => {
    const root = bookmarks[0];
    if (root.children) {
      const plain: BookmarksAsPlainList = [];
      traverseTree(root.children, plain, [], history);
      onReady(plain);
    } else {
      dispatch({
        type: Action.ShowNotification,
        message: "No browser bookmarks found",
        isError: true,
      });
    }
  });
}

function traverseTree(
  nodes: CustomBookmarkTreeNode[],
  plainList: BookmarksAsPlainList,
  breadcrumbs: CustomBookmarkTreeNode[],
  history: RecentItem[],
) {
  nodes.forEach((node) => {
    if (node.children && node.children.length > 0) {
      plainList.push({
        breadcrumbs,
        folder: node,
      });
      traverseTree(node.children, plainList, [...breadcrumbs, node], history);
    } else {
      node.mostVisited = history.some(
        (hItem) => node.url && hItem.url?.includes(node.url),
      );
    }
  });
}

export function importBrowserBookmarks(
  records: BookmarksAsPlainList,
  dispatch: ActionDispatcher,
  skipChecked: boolean,
) {
  let count = 0;
  records.forEach((rec) => {
    if (skipChecked || rec.folder.checked) {
      const items = rec.folder.children
        ?.filter((item) => (skipChecked || item.checked) && item.url)
        .map((item) =>
          createNewFolderItem(
            item.url,
            item.title,
            getTempFavIconUrl(item.url),
          ),
        );
      count += items?.length ?? 0;

      const newFolderId = genUniqLocalId();
      dispatch({
        type: Action.CreateFolder,
        newFolderId,
        title: rec.folder.title,
        items,
      }); // intentionally does not send additional stat here
    }
  });
}
