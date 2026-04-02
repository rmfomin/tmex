/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface LegacyObject {
  id: number; // local id
  remoteId?: number; // server id
  position: string;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface LegacySpace extends LegacyObject {
  title: string;
  folders: LegacyFolder[];
  widgets?: Widget[];
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface LegacyFolder extends LegacyObject {
  title: string;
  items: LegacyFolderItem[];
  color?: string;
  twoColumn?: boolean;
  archived?: boolean;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface LegacyFolderItem extends LegacyObject {
  favIconUrl: string;
  title: string;
  url: string;
  archived?: boolean;
  isSection?: boolean; // todo - replace on "type later". not store bool on server
  inEdit?: boolean;
}

export type WidgetType = "Sticker";

export type WidgetPos = {
  point: {
    x: number;
    y: number;
  };
};

export type WidgetContent = {
  contentType: "Sticker";
  text: string;
  color: string;
  fontSize: number;
  strikethrough?: boolean;
};

export interface Widget extends LegacyObject {
  widgetType: WidgetType;
  pos: WidgetPos; // this is actual {x,y} position for widgets
  content: WidgetContent;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export type FolderItemToCreate = Pick<
  LegacyFolderItem,
  "id" | "favIconUrl" | "url" | "title" | "isSection"
> & { position?: string };

/**
 * Compatibility-only payload shape for legacy API/import boundaries.
 * Do not use as a runtime source of truth.
 */
export type LegacyFolderItemApiPayload = Pick<
  LegacyFolderItem,
  "id" | "position" | "favIconUrl" | "title" | "url" | "archived" | "isSection"
>;

/**
 * Compatibility-only payload shape for legacy API/import boundaries.
 * Do not use as a runtime source of truth.
 */
export type LegacyFolderApiPayload = Pick<
  LegacyFolder,
  "id" | "position" | "title" | "items" | "color" | "twoColumn" | "archived"
>;

// undefined === 'system'
export type ColorTheme = "light" | "dark" | undefined;

export type ItemTypeV3 = "bookmark" | "group";

// v3 data

export interface DataBackupV3 {
  isTabme: true;
  version: 3;
  spaces: SpaceV3[];
}

export interface SpaceV3 {
  id: number;
  remoteId?: number;
  position: string;
  objectType: "space";
  title: string;
  folders: FolderV3[];
  widgets?: Widget[];
}

export interface FolderV3 {
  id: number;
  remoteId?: number;
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
  remoteId?: number;
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
