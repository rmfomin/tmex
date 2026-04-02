import { BookmarkItemV3, FolderV3, GroupV3 } from "../helpers/types";

export type FolderDisplayItem =
  | {
      type: "bookmark";
      item: BookmarkItemV3;
    }
  | {
      type: "group";
      group: GroupV3;
      items: BookmarkItemV3[];
    };

export function getFolderDisplayItems(folder: FolderV3): FolderDisplayItem[] {
  if (folder.collapsed) {
    return [];
  }

  return folder.items.map((item) => {
    if (item.type === "bookmark") {
      return {
        type: "bookmark",
        item,
      };
    }

    return {
      type: "group",
      group: item,
      items: item.collapsed ? [] : item.groupItems,
    };
  });
}
