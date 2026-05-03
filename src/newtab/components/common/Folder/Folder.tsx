import React, { useContext, useEffect, useState } from "react";
import { FolderV3, SpaceV3 } from "@/newtab/helpers/types";
import {
  colors,
  DEFAULT_FOLDER_COLOR,
  SearchFilter,
  SearchFilterMode,
  scrollElementIntoView,
} from "@/newtab/helpers/utils";
import {
  DropdownMenu,
  DropdownSubMenu,
} from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { FolderItem } from "@/newtab/components/common/FolderItem/FolderItem";
import { FolderGroup } from "@/newtab/components/common/FolderGroup/FolderGroup";
import { EditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import cn from "clsx";
import { Action } from "@/newtab/state/state";
import {
  canShowArchived,
  DispatchContext,
  mergeStepsInHistory,
} from "@/newtab/state/actions";
import { Color } from "@/newtab/helpers/color";
import MenuIcon from "./icons/menu.svg";
import ChevronIcon from "./icons/shevron.svg";
import { getSpacesList } from "@/newtab/helpers/moveToHelpers";
import Tab = chrome.tabs.Tab;
import { showMessageWithUndo } from "@/newtab/helpers/actionsHelpersWithDOM";
import {
  createNewFolderItem,
  createNewSection,
  findSpaceByFolderId,
} from "@/newtab/state/actionHelpers";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import { getVisibleFolderDisplayItems } from "./getFolderDisplayItems";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";
import styles from "./Folder.module.scss";

export const Folder = React.memo(function Folder(p: {
  spaces: SpaceV3[];
  folder: FolderV3;
  tabs: Tab[];
  recentItems: RecentItem[];
  showNotUsed: boolean;
  showArchived: boolean;
  search: string;
  searchFilters: SearchFilter[];
  searchFilterMode: SearchFilterMode;
  itemInEdit: undefined | number;
  hiddenFeatureIsEnabled: boolean;
}) {
  const dispatch = useContext(DispatchContext);
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [localColor, setLocalColor] = useState<string | undefined>(undefined);
  const [localTitle, setLocalTitle] = useState<string>(p.folder.title);

  useEffect(() => {
    setLocalTitle(p.folder.title);
  }, [p.folder.title]);

  function onDelete() {
    const archivedItemsCount = p.folder.items.filter((item) => item.archived)
      .length;
    if (archivedItemsCount > 0) {
      const itemsText = archivedItemsCount > 1 ? "items" : "item";
      const res = confirm(
        `Folder contains ${archivedItemsCount} hidden ${itemsText}. Do you still want to delete it?`,
      );
      if (!res) {
        return;
      }
    }

    dispatch({
      type: Action.DeleteFolder,
      folderId: p.folder.id,
    });
    showMessageWithUndo("Folder has been deleted", dispatch);
  }

  function saveFolderTitle(newTitle: string) {
    if (p.folder.title !== newTitle) {
      dispatch({
        type: Action.UpdateFolder,
        folderId: p.folder.id,
        title: newTitle,
      });
    }
    setEditing(false);
  }

  function onArchiveOrRestore() {
    alert(
      "The “Hiding” feature will be deprecated soon due to very low usage.\n" +
        "All previously hidden folders will became visible again.\n" +
        "Sorry for the inconvenience, and thank you for understanding!",
    );

    const newArchiveState = !p.folder.archived;
    dispatch({
      type: Action.UpdateFolder,
      folderId: p.folder.id,
      archived: newArchiveState,
    });

    const message = `Folder has been ${
      newArchiveState ? "hidden" : "restored"
    }`;
    showMessageWithUndo(message, dispatch);
    setShowMenu(false);
  }

  function onAddSection() {
    const newSection = createNewSection();
    dispatch({
      type: Action.CreateFolderItem,
      folderId: p.folder.id,
      insertBeforeItemId: undefined,
      item: newSection,
    });

    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: newSection.id },
    });

    setShowMenu(false);

    scrollElementIntoView(`[data-id="${newSection.id}"]`);
  }

  function onAddBookmark() {
    const newBookmark = createNewFolderItem(undefined, "New bookmark");
    dispatch({
      type: Action.CreateFolderItem,
      folderId: p.folder.id,
      insertBeforeItemId: undefined,
      item: newBookmark,
    });

    requestAnimationFrame(() => {
      const bookmarkElement = document.querySelector(
        `[data-id="${newBookmark.id}"]`,
      );
      const menuButton = bookmarkElement?.parentElement?.querySelector(
        roleSelector(DOM_ROLE.folderItemMenu),
      ) as HTMLButtonElement;
      if (menuButton) {
        menuButton.click();
      }
    });

    setShowMenu(false);

    scrollElementIntoView(`[data-id="${newBookmark.id}"]`);
  }

  function setColorLocally(color: string) {
    setLocalColor(color);
  }

  function setColorConfirmed(color: string) {
    setLocalColor(undefined);
    dispatch({
      type: Action.UpdateFolder,
      folderId: p.folder.id,
      color: color,
    });
  }

  function onOpenAll() {
    flatFolderDisplayItems.forEach((item) => {
      if (!item.archived && !item.isSection) {
        chrome.tabs.create({ url: item.url, active: false });
      }
    });

    setShowMenu(false);
  }

  function setAllGroupsCollapsed(collapsed: boolean) {
    mergeStepsInHistory((historyStepId) => {
      p.folder.items.forEach((item) => {
        if (item.type === "group" && item.collapsed !== collapsed) {
          dispatch({
            type: Action.UpdateFolderItem,
            itemId: item.id,
            collapsed,
            historyStepId,
          });
        }
      });
    });

    setShowMenu(false);
  }

  function onCollapseAllGroups() {
    setAllGroupsCollapsed(true);
  }

  function onExpandAllGroups() {
    setAllGroupsCollapsed(false);
  }

  function onRename() {
    setEditing(true);
    setShowMenu(false);
  }

  function onToggleCollapsed(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    dispatch({
      type: Action.UpdateFolder,
      folderId: p.folder.id,
      collapsed: !p.folder.collapsed,
    });
  }

  function setEditing(val: boolean) {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: val ? p.folder.id : undefined },
    });
  }

  const visibleFolderDisplayItems = getVisibleFolderDisplayItems(
    p.folder,
    p.search,
    p.searchFilters,
    p.searchFilterMode,
  );
  const flatFolderDisplayItems = visibleFolderDisplayItems.flatMap((item) => {
    if (item.type === "bookmark") {
      return [item.item];
    }

    return item.items;
  });

  const folderItems = flatFolderDisplayItems.filter(
    (i) => canShowArchived(p) || !i.archived,
  );

  const folderIsEmptyDuringSearch =
    (p.search !== "" || p.searchFilters.some((filter) => filter.enabled)) &&
    folderItems.length === 0;

  const folderClassName = cn(styles.root, {
    [styles.twoColumn]: p.folder.twoColumn,
    [styles.empty]: folderIsEmptyDuringSearch,
  });
  const folderColor = localColor ?? p.folder.color;
  const color = new Color();
  const color2 = new Color();
  color.setColor(localColor ?? p.folder.color ?? DEFAULT_FOLDER_COLOR);
  color.setAlpha(p.folder.archived ? 0.2 : 1);
  color2.value = { ...color.value };
  color2.setSaturation(color2.value.s + 0.1);
  color2.value.h = color2.value.h + 0.05;
  const folderGradientColor = `linear-gradient(45deg, ${color.getRGBA()}, ${color2.getRGBA()})`;

  const onHeaderContextMenu = (e: React.MouseEvent) => {
    setShowMenu(!showMenu);
    e.preventDefault();
  };

  const moveFolderToSpace = (spaceId: number) => {
    dispatch({
      type: Action.MoveFolder,
      folderId: p.folder.id,
      targetSpaceId: spaceId,
      insertBeforeFolderId: undefined,
    });

    dispatch({
      type: Action.SelectSpace,
      spaceId: spaceId,
    });

    dispatch({
      type: Action.ShowNotification,
      message: "Folder has been moved",
    });

    scrollElementIntoView(`[data-folder-id="${p.folder.id}"]`);

    setShowMenu(false);
  };

  return (
    <div
      className={folderClassName}
      data-role={DOM_ROLE.folder}
      data-folder-id={p.folder.id}
    >
      <h2
        style={{
          background: folderIsEmptyDuringSearch
            ? "transparent"
            : folderGradientColor,
          outline: p.folder.archived ? "1px solid rgba(0, 0, 0, 0.3)" : "none",
        }}
        className={cn("draggable-folder", styles.header, styles.dragHandle)}
        onContextMenu={onHeaderContextMenu}
      >
        <button
          className={cn(styles.collapseToggle, {
            [styles.collapseToggleCollapsed]: p.folder.collapsed,
          })}
          onClick={onToggleCollapsed}
          title={p.folder.collapsed ? "Expand folder" : "Collapse folder"}
        >
          <ChevronIcon />
        </button>
        <EditableTitle
          className={styles.titleText}
          inEdit={p.folder.id === p.itemInEdit}
          localTitle={localTitle}
          setLocalTitle={setLocalTitle}
          onSaveTitle={saveFolderTitle}
          search={p.search}
          onDoubleClick={() => setEditing(true)}
        />
        {p.folder.archived ? <span> [hidden]</span> : ""}
        <span
          className={cn(styles.menuButton, {
            [styles.menuButtonVisible]: showMenu,
          })}
          onClick={() => setShowMenu(!showMenu)}
        >
          <MenuIcon />
        </span>

        {showMenu ? (
          <DropdownMenu
            onClose={() => setShowMenu(false)}
            className={"dropdown-menu--folder"}
            offset={{ top: 5, left: 150, bottom: 38 }}
          >
            <div
              className="dropdown-menu__colors-row"
              style={{ marginTop: "4px" }}
            >
              <PresetColor
                color={PRESET_COLORS[0]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[1]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[2]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[3]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
            </div>
            <div
              className="dropdown-menu__colors-row"
              style={{ marginBottom: "4px" }}
            >
              <PresetColor
                color={PRESET_COLORS[4]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[5]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <PresetColor
                color={PRESET_COLORS[6]}
                onClick={setColorConfirmed}
                currentColor={folderColor}
              />
              <CustomColorInput
                onChange={setColorLocally}
                onBlur={setColorConfirmed}
                currentColor={folderColor}
              />
            </div>
            <button
              className="dropdown-menu__button focusable"
              onClick={onAddBookmark}
            >
              + Add Bookmark
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onAddSection}
            >
              + Add Group
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onOpenAll}
            >
              Open All
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onCollapseAllGroups}
            >
              Collapse all
            </button>
            <button
              className="dropdown-menu__button focusable"
              onClick={onExpandAllGroups}
            >
              Expand All
            </button>
            {p.hiddenFeatureIsEnabled && (
              <button
                className="dropdown-menu__button focusable"
                onClick={onArchiveOrRestore}
              >
                {p.folder.archived ? "Unhide" : "Hide"}
              </button>
            )}
            {p.spaces.length > 1 ? (
              <DropdownSubMenu
                menuId={1}
                title={"Move to space"}
                submenuContent={getSpacesList(
                  p.spaces,
                  moveFolderToSpace,
                  findSpaceByFolderId(p, p.folder.id)?.id,
                )}
              />
            ) : null}

            <button
              className="dropdown-menu__button focusable"
              onClick={onRename}
            >
              Rename
            </button>
            <button
              className="dropdown-menu__button dropdown-menu__button--dander focusable"
              onClick={onDelete}
            >
              Delete
            </button>
          </DropdownMenu>
        ) : null}
      </h2>

      {folderItems.length === 0 &&
      !folderIsEmptyDuringSearch &&
      !p.folder.collapsed ? (
        <div className={styles.emptyTip}>
          To add bookmark, drop an item form the sidebar
        </div>
      ) : null}

      <div
        className={styles.items}
        data-role={DOM_ROLE.folderItems}
        data-folder-id={p.folder.id}
        style={p.folder.collapsed ? { display: "none" } : undefined}
      >
        {visibleFolderDisplayItems.map((item) => {
          if (item.type === "bookmark") {
            if (!canShowArchived(p) && item.item.archived) {
              return null;
            }

            return (
              <FolderItem
                key={item.item.id}
                spaces={p.spaces}
                item={item.item}
                inEdit={item.item.id === p.itemInEdit}
                tabs={p.tabs}
                recentItems={p.recentItems}
                showNotUsed={p.showNotUsed}
                search={p.search}
                hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
              />
            );
          }

          const visibleGroupItems = item.items.filter(
            (groupItem) => canShowArchived(p) || !groupItem.archived,
          );

          if (p.search !== "" && visibleGroupItems.length === 0) {
            return null;
          }

          return (
            <FolderGroup
              key={item.group.id}
              spaces={p.spaces}
              folderId={p.folder.id}
              group={item.group}
              items={visibleGroupItems}
              tabs={p.tabs}
              recentItems={p.recentItems}
              showNotUsed={p.showNotUsed}
              search={p.search}
              itemInEdit={p.itemInEdit}
              hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
            />
          );
        })}
      </div>
    </div>
  );
});

const PRESET_COLORS = [...colors];
PRESET_COLORS.length = 7;

function PresetColor(p: {
  onClick: (color: string) => void;
  color: string;
  currentColor?: string;
}) {
  const borderColor = window.pSBC(-0.5, p.color);
  const onClick = () => {
    p.onClick(p.color);
  };
  const active = p.color === p.currentColor;
  return (
    <button
      className={"dropdown-menu__preset_color " + (active ? "selected" : "")}
      tabIndex={0}
      onClick={onClick}
    >
      <span style={{ backgroundColor: p.color, borderColor }}></span>
    </button>
  );
}

function CustomColorInput(p: {
  onChange: (color: string) => void;
  onBlur: (color: string) => void;
  currentColor?: string;
}) {
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onChange(e.target.value);
  };
  const onBlur = (e: React.ChangeEvent<HTMLInputElement>) => {
    p.onBlur(e.target.value);
  };

  const active = !PRESET_COLORS.includes(p.currentColor!);
  return (
    <div className={"color-picker-container " + (active ? "selected" : "")}>
      <input
        type="color"
        id="colorInput"
        value={p.currentColor}
        onChange={(e) => onChange(e)}
        onBlur={(e) => onBlur(e)}
      />
      <label htmlFor="colorInput" className="custom-color-picker"></label>
    </div>
  );
}
