import { IFolderItem, ItemV3 } from "../helpers/types";

function toLegacyDisplayItem(item: Extract<ItemV3, { type: "bookmark" }>): IFolderItem {
  return {
    id: item.id,
    remoteId: item.remoteId,
    position: item.position,
    title: item.title,
    url: item.url,
    favIconUrl: item.favIconUrl,
    archived: item.archived,
    isSection: item.isSection,
    inEdit: item.inEdit,
  };
}

export function getFolderDisplayItems(items: ItemV3[]): IFolderItem[] {
  return items.flatMap((item) => {
    if (item.type === "bookmark") {
      return [toLegacyDisplayItem(item)];
    }

    return item.groupItems.map(toLegacyDisplayItem);
  });
}
