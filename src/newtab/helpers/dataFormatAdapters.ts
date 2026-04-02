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

function convertBookmarkItemV3ToLegacy(item: BookmarkItemV3): IFolderItem {
  return {
    id: item.id,
    position: item.position,
    title: item.title,
    url: item.url,
    favIconUrl: item.favIconUrl,
  };
}

function convertFolderItemsV3ToLegacy(items: ItemV3[]): IFolderItem[] {
  return items.flatMap((item) => {
    if (item.type === "bookmark") {
      return [convertBookmarkItemV3ToLegacy(item)];
    }

    return item.groupItems.map(convertBookmarkItemV3ToLegacy);
  });
}

function convertFolderV3ToLegacy(folder: FolderV3): IFolder {
  return {
    id: folder.id,
    position: folder.position,
    title: folder.title,
    color: folder.color,
    items: convertFolderItemsV3ToLegacy(folder.items),
  };
}

function convertSpaceV3ToLegacy(space: SpaceV3): ISpace {
  return {
    id: space.id,
    position: space.position,
    title: space.title,
    widgets: space.widgets,
    folders: space.folders.map(convertFolderV3ToLegacy),
  };
}

export function convertV3BackupToLegacySpaces(data: DataBackupV3): ISpace[] {
  return normalizeBackupV3(data).spaces.map(convertSpaceV3ToLegacy);
}

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

export function convertLegacySpacesToV3Backup(spaces: ISpace[]): DataBackupV3 {
  return {
    isTabme: true,
    version: 3,
    spaces: spaces.map(convertLegacySpaceToV3),
  };
}

export function getLegacySpacesView(spaces: SpaceV3[] | ISpace[]): ISpace[] {
  const firstSpace = spaces[0];
  if (!firstSpace) {
    return [];
  }

  if ("objectType" in firstSpace && firstSpace.objectType === "space") {
    return convertV3BackupToLegacySpaces({
      isTabme: true,
      version: 3,
      spaces: spaces as SpaceV3[],
    });
  }

  return spaces as ISpace[];
}

export function getV3SpacesView(spaces: SpaceV3[] | ISpace[]): SpaceV3[] {
  const firstSpace = spaces[0];
  if (!firstSpace) {
    return [];
  }

  if ("objectType" in firstSpace && firstSpace.objectType === "space") {
    return normalizeBackupV3({
      isTabme: true,
      version: 3,
      spaces: spaces as SpaceV3[],
    }).spaces;
  }

  return convertLegacySpacesToV3Backup(spaces as ISpace[]).spaces;
}
