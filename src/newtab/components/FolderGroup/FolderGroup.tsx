import React, { useContext, useEffect, useState } from "react";
import { BookmarkItemV3, GroupV3, SpaceV3 } from "@/newtab/helpers/types";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import Tab = chrome.tabs.Tab;
import { FolderItem } from "@/newtab/components/FolderItem/FolderItem";
import { EditableTitle } from "@/newtab/components/EditableTitle/EditableTitle";
import { DispatchContext } from "@/newtab/state/actions";
import { Action } from "@/newtab/state/state";
import { CL } from "@/newtab/helpers/classNameHelper";
import { DropdownMenu } from "@/newtab/components/DropdownMenu/DropdownMenu";
import ChevronIcon from "@/newtab/components/FolderGroup/icons/shevron.svg";
import "@/newtab/components/FolderGroup/FolderGroup.module.scss";

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
  const [showMenu, setShowMenu] = useState(false);
  const [localTitle, setLocalTitle] = useState(p.group.title);

  useEffect(() => {
    setLocalTitle(p.group.title);
  }, [p.group.title]);

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: Action.UpdateFolderItem,
      itemId: p.group.id,
      collapsed: !p.group.collapsed,
    });
  }

  function setEditing(value: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: value ? p.group.id : undefined },
    });
  }

  function saveGroupTitle(title: string) {
    if (title !== p.group.title) {
      dispatch({
        type: Action.UpdateFolderItem,
        itemId: p.group.id,
        title,
      });
    }
    setEditing(false);
  }

  function onRename() {
    setEditing(true);
    setShowMenu(false);
  }

  function onOpenAllTabs() {
    setShowMenu(false);
  }

  function onHeaderContextMenu(e: React.MouseEvent) {
    e.preventDefault();
    setShowMenu(true);
  }

  return (
    <div className="folder-group" data-group-id={p.group.id}>
      <div
        className="folder-group__header draggable-item"
        data-id={p.group.id}
        onContextMenu={onHeaderContextMenu}
        onDragStart={(e) => {
          e.preventDefault();
        }}
      >
        <button
          className={CL("folder-group__toggle", {
            "folder-group__toggle--collapsed": p.group.collapsed,
          })}
          onClick={onToggleCollapsed}
          title={p.group.collapsed ? "Expand group" : "Collapse group"}
        >
          <ChevronIcon />
        </button>
        <EditableTitle
          className="folder-group__title"
          inEdit={p.group.id === p.itemInEdit}
          setEditing={setEditing}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSaveTitle={saveGroupTitle}
          search={p.search}
          onDoubleClick={() => setEditing(true)}
        />
        {showMenu ? (
          <DropdownMenu
            onClose={() => setShowMenu(false)}
            className="dropdown-menu--folder-group"
            offset={{ top: 4, left: 24, bottom: 20 }}
          >
            <button
              className="dropdown-menu__button focusable"
              onClick={onRename}
            >
              Rename
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAllTabs}
            >
              Open all tabs
            </button>
          </DropdownMenu>
        ) : null}
      </div>
      <div className="folder-group__items">
        {p.items.map((item) => (
          <FolderItem
            key={item.id}
            spaces={p.spaces}
            item={item}
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
