import { BookmarkItemV3, FolderV3, GroupV3 } from "@/newtab/helpers/types";
import { isContainsSearch } from "@/newtab/helpers/utils";

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

export function getVisibleFolderDisplayItems(
  folder: FolderV3,
  search: string,
): FolderDisplayItem[] {
  const displayItems = getFolderDisplayItems(folder);
  if (search === "") {
    return displayItems;
  }

  const searchLC = search.toLowerCase();
  const result: FolderDisplayItem[] = [];

  displayItems.forEach((item) => {
    if (item.type === "bookmark") {
      if (isContainsSearch(item.item, searchLC)) {
        result.push(item);
      }
      return;
    }

    const groupMatched = isContainsSearch(item.group, searchLC);
    const matchedItems = item.group.groupItems.filter((groupItem) =>
      isContainsSearch(groupItem, searchLC),
    );

    if (!groupMatched && matchedItems.length === 0) {
      return;
    }

    result.push({
      ...item,
      items: groupMatched ? item.group.groupItems : matchedItems,
    });
  });

  return result;
}
