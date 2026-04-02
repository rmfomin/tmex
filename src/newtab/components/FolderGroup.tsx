import React, { useContext } from "react";
import { BookmarkItemV3, GroupV3, SpaceV3 } from "../helpers/types";
import { RecentItem } from "../helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;
import { FolderItem } from "./FolderItem";
import { hlSearch } from "../helpers/utils";
import { DispatchContext } from "../state/actions";
import { Action } from "../state/state";

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
  const dispatch = useContext(DispatchContext);

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: Action.UpdateFolderItem,
      itemId: p.group.id,
      collapsed: !p.group.collapsed,
    });
  }

  return (
    <div className="folder-group" data-group-id={p.group.id}>
      <div className="folder-group__header">
        <button
          className="folder-group__toggle"
          onClick={onToggleCollapsed}
          title={p.group.collapsed ? "Expand group" : "Collapse group"}
        >
          {p.group.collapsed ? "▸" : "▾"}
        </button>
        <div
          className="folder-group__title"
          dangerouslySetInnerHTML={hlSearch(p.group.title, p.search)}
        />
      </div>
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
