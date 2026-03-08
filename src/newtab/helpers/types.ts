/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface IObject {
  id: number; // local id
  remoteId?: number; // server id
  position: string;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface ISpace extends IObject {
  title: string;
  folders: IFolder[];
  widgets?: IWidget[];
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface IFolder extends IObject {
  title: string;
  items: IFolderItem[];
  color?: string;
  twoColumn?: boolean;
  archived?: boolean;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export interface IFolderItem extends IObject {
  favIconUrl: string;
  title: string;
  url: string;
  archived?: boolean;
  isSection?: boolean; // todo - replace on "type later". not store bool on server
  inEdit?: boolean;
}

export type WidgetType = "Sticker";

export type IWidgetPos = {
  point: {
    x: number;
    y: number;
  };
};

export type IWidgetContent = {
  contentType: "Sticker";
  text: string;
  color: string;
  fontSize: number;
  strikethrough?: boolean;
};

export interface IWidget extends IObject {
  widgetType: WidgetType;
  pos: IWidgetPos; // this is actual {x,y} position for widgets
  content: IWidgetContent;
}

/**
 * @deprecated Legacy runtime object for data format v2.
 * Keep until the application fully switches to v3.
 */
export type IFolderItemToCreate = Pick<
  IFolderItem,
  "id" | "favIconUrl" | "url" | "title" | "isSection"
> & { position?: string };

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
  position: string;
  objectType: "space";
  title: string;
  folders: FolderV3[];
  widgets?: IWidget[];
}

export interface FolderV3 {
  id: number;
  position: string;
  objectType: "folder";
  title: string;
  items: ItemV3[];
  color?: string;
  collapsed?: boolean;
}

export interface ItemBaseV3 {
  id: number;
  position: string;
  title: string;
  type: ItemTypeV3;
  objectType?: "bookmark" | "group";
}

export interface BookmarkItemV3 extends ItemBaseV3 {
  type: "bookmark";
  objectType?: "bookmark";
  url: string;
  favIconUrl: string;
}

export interface GroupV3 extends ItemBaseV3 {
  type: "group";
  objectType?: "group";
  collapsed?: boolean;
  groupItems: BookmarkItemV3[];
}

export type ItemV3 = BookmarkItemV3 | GroupV3;
