export interface FolderItemToCreate {
  id: number;
  title: string;
  url: string;
  favIconUrl: string;
  position?: string;
  isSection?: boolean;
}

export type ItemToCreateV3 = FolderItemToCreate | ItemV3;

export type ColorTheme = "light" | "system" | "dark";

export type ItemTypeV3 = "bookmark" | "group";

export type BackupBrandMarker =
  | {
      isTablo: true;
      isTabowski?: never;
      isTabme?: never;
    }
  | {
      isTablo?: never;
      isTabowski: true;
      isTabme?: never;
    }
  | {
      isTablo?: never;
      isTabowski?: never;
      isTabme: true;
    };

// v3 data

export type DataBackupV3 = BackupBrandMarker & {
  version: 3;
  spaces: SpaceV3[];
};

export type SpaceBackupV3 = BackupBrandMarker & {
  version: 3;
  objectType: "space-backup";
  space: SpaceV3;
};

export interface SpaceV3 {
  id: number;
  position: string;
  objectType: "space";
  title: string;
  folders: FolderV3[];
}

export interface FolderV3 {
  id: number;
  position: string;
  objectType: "folder";
  title: string;
  items: ItemV3[];
  color?: string;
  collapsed?: boolean;
  twoColumn?: boolean;
  archived?: boolean;
}

export interface ItemBaseV3 {
  id: number;
  position: string;
  title: string;
  type: ItemTypeV3;
  objectType?: "bookmark" | "group";
  archived?: boolean;
  inEdit?: boolean;
}

export interface BookmarkItemV3 extends ItemBaseV3 {
  type: "bookmark";
  objectType?: "bookmark";
  url: string;
  favIconUrl: string;
  isSection?: boolean;
}

export interface GroupV3 extends ItemBaseV3 {
  type: "group";
  objectType?: "group";
  collapsed?: boolean;
  groupItems: BookmarkItemV3[];
}

export type ItemV3 = BookmarkItemV3 | GroupV3;
