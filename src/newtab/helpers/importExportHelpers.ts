import {
  DataBackupV3,
  FolderItemToCreate,
  SpaceBackupV3,
  SpaceV3,
} from "@/newtab/helpers/types";
import { Action } from "@/newtab/state/state";
import { ActionDispatcher } from "@/newtab/state/actions";
import {
  createNewFolderItem,
  genUniqLocalId,
  getTempFavIconUrl,
} from "@/newtab/state/actionHelpers";
import { showMessage } from "@/newtab/helpers/actionsHelpersWithDOM";
import { getTopVisitedFromHistory } from "@/newtab/helpers/utils";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import {
  isDataBackupV3,
  isSpaceV3,
  normalizeBackupV3,
} from "@/newtab/helpers/dataFormatAdapters";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";

function hasSupportedBackupMarker(data: Record<string, unknown>) {
  const markers = [data.isTablo, data.isTabowski, data.isTabme];
  return markers.filter((marker) => marker === true).length === 1;
}

function isSpaceBackupJsonV3(data: unknown): data is SpaceBackupV3 {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return false;
  }
  const backup = data as Record<string, unknown>;
  return (
    hasSupportedBackupMarker(backup) &&
    backup.version === 3 &&
    backup.objectType === "space-backup" &&
    isSpaceV3(backup.space)
  );
}

function getImportableSpaceV3(data: unknown): SpaceV3 | undefined {
  if (isSpaceBackupJsonV3(data)) {
    return data.space;
  }

  if (isDataBackupV3(data)) {
    return data.spaces.length === 1 ? data.spaces[0] : undefined;
  }

  return undefined;
}

export function importFromJson(event: any, dispatch: ActionDispatcher) {
  function receivedText(e: any) {
    let lines = e.target.result;
    try {
      const res = JSON.parse(lines);
      if (isDataBackupV3(res)) {
        dispatch({
          type: Action.InitDashboard,
          spaces: normalizeBackupV3(res).spaces,
          saveToLS: true,
        });

        dispatch({
          type: Action.SelectSpace,
          spaceId: -1, //hack to force update
        });

        showMessage("Backup has been imported", dispatch);
      } else if (isSpaceBackupJsonV3(res)) {
        dispatch({
          type: Action.ShowNotification,
          isError: true,
          message: "This is a space backup. Use Import space button to add it.",
        });
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

export function importFromJsonWithCallbacks(
  event: React.ChangeEvent<HTMLInputElement>,
  onImported: (spaces: SpaceV3[]) => void,
  onMessage: (message: string, isError?: boolean) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const parsed = JSON.parse(String(loadEvent.target?.result ?? ""));
      if (!isDataBackupV3(parsed)) {
        onMessage("Unsupported JSON format", true);
        return;
      }
      onImported(normalizeBackupV3(parsed).spaces);
      onMessage("Backup has been imported");
    } catch {
      onMessage("Unsupported JSON format", true);
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

export function createExportBackupV3(spaces: SpaceV3[]): DataBackupV3 {
  return normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces,
  });
}

export function createExportSpaceBackupV3(space: SpaceV3): SpaceBackupV3 {
  return {
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: normalizeBackupV3({
      isTablo: true,
      version: 3,
      spaces: [space],
    }).spaces[0],
  };
}

function downloadObjectAsJson(exportObj: unknown, exportName: string) {
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

export function onExportJson(spaces: SpaceV3[]) {
  const backup = createExportBackupV3(spaces);
  downloadObjectAsJson(backup, "tablo_backup");
}

export function onExportSpaceJson(space: SpaceV3) {
  const backup = createExportSpaceBackupV3(space);
  const safeTitle =
    space.title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "space";
  downloadObjectAsJson(backup, `tablo_space_${safeTitle}`);
}

function cloneSpaceForImport(
  space: SpaceV3,
  existingSpaces: SpaceV3[]
): SpaceV3 {
  const lastSpace = existingSpaces.at(-1);
  const normalized = normalizeBackupV3({
    isTablo: true,
    version: 3,
    spaces: [space],
  }).spaces[0];

  return {
    ...normalized,
    id: genUniqLocalId(),
    position: insertBetween(lastSpace?.position ?? "", ""),
    folders: normalized.folders.map((folder) => ({
      ...folder,
      id: genUniqLocalId(),
      items: folder.items.map((item) => {
        if (item.type === "bookmark") {
          return {
            ...item,
            id: genUniqLocalId(),
          };
        }

        return {
          ...item,
          id: genUniqLocalId(),
          groupItems: item.groupItems.map((groupItem) => ({
            ...groupItem,
            id: genUniqLocalId(),
          })),
        };
      }),
    })),
  };
}

export function importSpaceFromJson(
  event: any,
  dispatch: ActionDispatcher,
  existingSpaces: SpaceV3[]
) {
  function receivedText(e: any) {
    try {
      const parsed = JSON.parse(e.target.result);
      const space = getImportableSpaceV3(parsed);

      if (!space) {
        dispatch({
          type: Action.ShowNotification,
          isError: true,
          message: "Unsupported space JSON format",
        });
        return;
      }

      const importedSpace = cloneSpaceForImport(space, existingSpaces);
      dispatch({
        type: Action.InitDashboard,
        spaces: normalizeBackupV3({
          isTablo: true,
          version: 3,
          spaces: [...existingSpaces, importedSpace],
        }).spaces,
        saveToLS: true,
      });
      dispatch({ type: Action.SelectSpace, spaceId: importedSpace.id });
      showMessage("Space has been imported", dispatch);
    } catch (e) {
      console.error(e);
      dispatch({
        type: Action.ShowNotification,
        isError: true,
        message: "Unsupported space JSON format",
      });
    }
  }

  const file = event.target.files[0];
  if (!file) {
    return;
  }

  const fr = new FileReader();
  fr.onload = receivedText;
  fr.readAsText(file);
  event.target.value = "";
}

/** Новый API импорта: helper парсит файл, а caller сам решает, в какой store
 * положить space и как показать ошибку. */
export function importSpaceFromJsonWithCallback(
  event: React.ChangeEvent<HTMLInputElement>,
  existingSpaces: SpaceV3[],
  onImported: (space: SpaceV3) => void,
  onError: (message: string) => void,
): void {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (loadEvent) => {
    try {
      const space = getImportableSpaceV3(JSON.parse(String(loadEvent.target?.result ?? "")));
      if (!space) {
        onError("Unsupported space JSON format");
        return;
      }
      onImported(cloneSpaceForImport(space, existingSpaces));
    } catch {
      onError("Unsupported space JSON format");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

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
  dispatch: ActionDispatcher
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

/** Browser API adapter без state-зависимостей: ошибки и данные отдаёт caller. */
export function getBrowserBookmarksForImport(
  onReady: (res: BookmarksAsPlainList) => void,
  recentItems: RecentItem[],
  onEmpty: () => void,
): void {
  const history = getTopVisitedFromHistory(recentItems, 1000);
  chrome.bookmarks.getTree((bookmarks) => {
    const root = bookmarks[0];
    if (!root?.children) {
      onEmpty();
      return;
    }
    const plain: BookmarksAsPlainList = [];
    traverseTree(root.children, plain, [], history);
    onReady(plain);
  });
}

function traverseTree(
  nodes: CustomBookmarkTreeNode[],
  plainList: BookmarksAsPlainList,
  breadcrumbs: CustomBookmarkTreeNode[],
  history: RecentItem[]
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
        (hItem) => node.url && hItem.url?.includes(node.url)
      );
    }
  });
}

export function importBrowserBookmarks(
  records: BookmarksAsPlainList,
  dispatch: ActionDispatcher,
  skipChecked: boolean
) {
  let count = 0;
  records.forEach((rec) => {
    if (skipChecked || rec.folder.checked) {
      const items = rec.folder.children
        ?.filter((item) => (skipChecked || item.checked) && item.url)
        .map((item) =>
          createNewFolderItem(item.url, item.title, getTempFavIconUrl(item.url))
        );
      count += items?.length ?? 0;

      const newFolderId = genUniqLocalId();
      dispatch({
        type: Action.CreateFolder,
        newFolderId,
        title: rec.folder.title,
        items,
      });
    }
  });
}

export function importBrowserBookmarksWithCallback(
  records: BookmarksAsPlainList,
  skipChecked: boolean,
  onCreateFolder: (input: { id: number; title: string; items: FolderItemToCreate[] }) => void,
): void {
  records.forEach((record) => {
    if (!skipChecked && !record.folder.checked) return;
    const items = record.folder.children
      ?.filter((item) => (skipChecked || item.checked) && item.url)
      .map((item) => createNewFolderItem(item.url, item.title, getTempFavIconUrl(item.url))) ?? [];
    onCreateFolder({ id: genUniqLocalId(), title: record.folder.title, items });
  });
}
