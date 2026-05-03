import React, { useContext, useEffect, useState } from "react";
import { BookmarkItemV3, SpaceV3 } from "@/newtab/helpers/types";
import { findTabsByURL, isFolderItemNotUsed } from "@/newtab/helpers/utils";
import { EditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import { Action } from "@/newtab/state/state";
import { DispatchContext } from "@/newtab/state/actions";
import cn from "clsx";
import IconClose from "@/newtab/components/common/FolderItem/icons/close.svg";
import IconMore from "@/newtab/components/common/FolderItem/icons/more.svg";
import { FolderItemMenu } from "@/newtab/components/common/FolderItemMenu/FolderItemMenu";
import { getBrokenImgSVG, loadFaviconUrl } from "@/newtab/helpers/faviconUtils";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import "@/newtab/components/common/FolderItem/FolderItem.module.scss";
import Tab = chrome.tabs.Tab;

export const FolderItem = React.memo(
  (p: {
    spaces: SpaceV3[];
    item: BookmarkItemV3;
    inEdit: boolean;
    tabs: Tab[];
    recentItems: RecentItem[];
    showNotUsed: boolean;
    search: string;
    hiddenFeatureIsEnabled: boolean;
  }) => {
    const dispatch = useContext(DispatchContext);
    const [showMenu, setShowMenu] = useState<boolean>(false);
    const [localTitle, setLocalTitle] = useState<string>(p.item.title);

    useEffect(() => {
      setLocalTitle(p.item.title);
    }, [p.item.title]);

    function trySaveTitleAndURL(newTitle: string, newUrl?: string) {
      const titleChanged = p.item.title !== newTitle;
      const urlChanged = newUrl && p.item.url !== newUrl;
      if (titleChanged || urlChanged) {
        dispatch({
          type: Action.UpdateFolderItem,
          itemId: p.item.id,
          title: newTitle,
          url: newUrl ?? p.item.url,
        });

        if (urlChanged) {
          loadFaviconUrl(newUrl).then((faviconUrl) => {
            dispatch({
              type: Action.UpdateFolderItem,
              itemId: p.item.id,
              favIconUrl: faviconUrl,
            });
          });
        }
      }
    }

    function setEditing(val: boolean) {
      dispatch({
        type: Action.UpdateAppState,
        newState: { itemInEdit: val ? p.item.id : undefined },
      });
    }

    function onContextMenu(e: React.MouseEvent) {
      setShowMenu(true);
      e.preventDefault();
    }

    function onCloseTab() {
      const tabs = findTabsByURL(p.item.url, p.tabs);
      const tabIds = tabs.filter((t) => t.id).map((t) => t.id!);
      dispatch({
        type: Action.CloseTabs,
        tabIds: tabIds,
      });
    }

    function handleImageError(e: React.SyntheticEvent) {
      const imgElement = e.target as HTMLImageElement;
      imgElement.src = getBrokenImgSVG();
    }

    const folderItemOpened = findTabsByURL(p.item.url, p.tabs).length !== 0;

    return (
      <div
        className={cn("folder-item", {
          section: p.item.isSection,
          selected: showMenu,
          archived: p.item.archived,
        })}
      >
        {showMenu ? (
          <FolderItemMenu
            spaces={p.spaces}
            item={p.item}
            hiddenFeatureIsEnabled={p.hiddenFeatureIsEnabled}
            localTitle={localTitle}
            setLocalTitle={setLocalTitle}
            onSave={trySaveTitleAndURL}
            onClose={() => setShowMenu(false)}
          />
        ) : null}
        <button
          className="folder-item__menu"
          onContextMenu={onContextMenu}
          onClick={() => setShowMenu(!showMenu)}
        >
          <IconMore />
        </button>

        <a
          className={cn("folder-item__inner draggable-item", {
            section: p.item.isSection,
            open: folderItemOpened,
          })}
          onDragStart={(e) => {
            e.preventDefault();
          }}
          tabIndex={2}
          data-id={p.item.id}
          onClick={(e) => e.preventDefault()}
          title={p.item.url}
          href={p.item.url}
          onContextMenu={onContextMenu}
        >
          <img src={p.item.favIconUrl} alt="" onError={handleImageError} />
          <EditableTitle
            className={cn("folder-item__inner__title", {
              "not-used":
                p.showNotUsed && isFolderItemNotUsed(p.item, p.recentItems),
            })}
            inEdit={p.inEdit}
            setEditing={setEditing}
            localTitle={localTitle}
            setLocalTitle={setLocalTitle}
            onSaveTitle={trySaveTitleAndURL}
            search={p.search}
          />
          {folderItemOpened ? (
            <button
              className="btn__close-tab stop-dad-propagation"
              tabIndex={2}
              title="Close tab"
              onClick={onCloseTab}
            >
              <IconClose></IconClose>
            </button>
          ) : null}
        </a>
      </div>
    );
  }
);
