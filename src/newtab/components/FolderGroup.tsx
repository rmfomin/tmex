import React from "react";
import { BookmarkItemV3, GroupV3, SpaceV3 } from "../helpers/types";
import { RecentItem } from "../helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;
import { FolderItem } from "./FolderItem";
import { hlSearch } from "../helpers/utils";

function toLegacyDisplayItem(item: BookmarkItemV3) {
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

export const FolderGroup = React.memo(function FolderGroup(p: {
  spaces: SpaceV3[];
  group: GroupV3;
  items: BookmarkItemV3[];
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  search: string;
  itemInEdit: number | undefined;
  hiddenFeatureIsEnabled: boolean;
}) {
  return (
    <div className="folder-group" data-group-id={p.group.id}>
      <div
        className="folder-group__title"
        dangerouslySetInnerHTML={hlSearch(p.group.title, p.search)}
      />
      <div className="folder-group__items">
        {p.items.map((item) => (
          <FolderItem
            key={item.id}
            spaces={p.spaces}
            item={toLegacyDisplayItem(item)}
            inEdit={item.id === p.itemInEdit}
            tabs={p.tabs}
            recentItems={p.recentItems}
            showNotUsed={p.showNotUsed}
            search={p.search}
            hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
          />
        ))}
      </div>
    </div>
  );
});
