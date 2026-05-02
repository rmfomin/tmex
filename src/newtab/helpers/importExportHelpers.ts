import {
  DataBackupV3,
  LegacyFolder,
  LegacySpace,
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
import HistoryItem = chrome.history.HistoryItem;
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import {
  convertLegacySpacesToV3Backup,
  getV3SpacesView,
  normalizeBackupV3,
} from "@/newtab/helpers/dataFormatAdapters";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";

type LegacyBackup = {
  isTabowski?: true;
  isTabme?: true;
  version: number;
  spaces: LegacySpace[];
};

function hasSupportedBackupMarker(data: {
  isTabowski?: true;
  isTabme?: true;
}) {
  return data.isTabowski === true || data.isTabme === true;
}

// TODO(v3-migration): delete after legacy import formats are dropped.
function isLegacyImportJson(data: LegacyFolder[]) {
  return Array.isArray(data) && data[0]?.title && data[0]?.items;
}

// TODO(v3-migration): delete after version 2 backups are no longer supported.
function isImportJsonV2(data: LegacyBackup) {
  return hasSupportedBackupMarker(data) && Array.isArray(data.spaces) && data.version === 2;
}

function isImportJsonV3(data: DataBackupV3) {
  return hasSupportedBackupMarker(data) && Array.isArray(data.spaces) && data.version === 3;
}

function isSpaceBackupJsonV3(data: SpaceBackupV3) {
  return (
    hasSupportedBackupMarker(data) &&
    data.version === 3 &&
    data.objectType === "space-backup" &&
    data.space?.objectType === "space"
  );
}

function getImportableSpaceV3(data: unknown): SpaceV3 | undefined {
  if (isSpaceBackupJsonV3(data as SpaceBackupV3)) {
    return (data as SpaceBackupV3).space;
  }

  if (isImportJsonV3(data as DataBackupV3)) {
    const spaces = (data as DataBackupV3).spaces;
    return spaces.length === 1 ? spaces[0] : undefined;
  }

  return undefined;
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

        const loadedFolders = res as LegacyFolder[];
        loadedFolders.forEach((loadedFolder) => {
          dispatch({
            type: Action.CreateFolder,
            title: loadedFolder.title,
            items: loadedFolder.items,
            color: loadedFolder.color,
          });
        });

        showMessage("Backup has been imported", dispatch);
      } else if (isImportJsonV2(res)) {
        // TODO(v3-migration): delete this branch after support for version 2 backups is dropped.
        const data = res as LegacyBackup;
        dispatch({
          type: Action.InitDashboard,
          spaces: convertLegacySpacesToV3Backup(data.spaces).spaces,
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
          spaces: normalizeBackupV3(data).spaces,
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

export function createExportBackupV3(spaces: SpaceV3[]): DataBackupV3 {
  return normalizeBackupV3({
    isTabowski: true,
    version: 3,
    spaces,
  });
}

export function createExportSpaceBackupV3(space: SpaceV3): SpaceBackupV3 {
  return {
    isTabowski: true,
    version: 3,
    objectType: "space-backup",
    space: normalizeBackupV3({
      isTabowski: true,
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
  downloadObjectAsJson(backup, "tabowski_backup");
}

export function onExportSpaceJson(space: SpaceV3) {
  const backup = createExportSpaceBackupV3(space);
  const safeTitle = space.title.trim().replace(/[^a-z0-9_-]+/gi, "_") || "space";
  downloadObjectAsJson(backup, `tabowski_space_${safeTitle}`);
}

function cloneSpaceForImport(space: SpaceV3, existingSpaces: SpaceV3[]): SpaceV3 {
  const lastSpace = existingSpaces.at(-1);
  const normalized = normalizeBackupV3({
    isTabowski: true,
    version: 3,
    spaces: [space],
  }).spaces[0];

  return {
    ...normalized,
    id: genUniqLocalId(),
    remoteId: undefined,
    position: insertBetween(lastSpace?.position ?? "", ""),
    folders: normalized.folders.map((folder) => ({
      ...folder,
      id: genUniqLocalId(),
      remoteId: undefined,
      items: folder.items.map((item) => {
        if (item.type === "bookmark") {
          return {
            ...item,
            id: genUniqLocalId(),
            remoteId: undefined,
          };
        }

        return {
          ...item,
          id: genUniqLocalId(),
          remoteId: undefined,
          groupItems: item.groupItems.map((groupItem) => ({
            ...groupItem,
            id: genUniqLocalId(),
            remoteId: undefined,
          })),
        };
      }),
    })),
  };
}

export function importSpaceFromJson(
  event: any,
  dispatch: ActionDispatcher,
  existingSpaces: SpaceV3[],
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
          isTabowski: true,
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

export function onImportFromToby(
  event: any,
  dispatch: ActionDispatcher,
  onReady?: () => void,
) {
  function receivedText(e: any) {
    let lines = e.target.result;
    try {
      const tobyData = JSON.parse(lines) as TobyJson;
      const validFormat = Array.isArray(tobyData.lists);
      if (validFormat) {
        let count = 0;
        tobyData.lists.forEach((tobyFolder) => {
          dispatch({
            type: Action.CreateFolder,
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

type TobyItem = {
  title: string;
  url: string;
};
type TobyFolder = {
  title: string;
  cards: TobyItem[];
};
type TobyJson = {
  lists: TobyFolder[];
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
      });
    }
  });
}
