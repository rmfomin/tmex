import React, { useEffect, useRef, useState } from "react";
import cn from "clsx";
import styles from "./Bookmarks.module.scss";
import folderStyles from "@/newtab/components/common/Folder/Folder.module.scss";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "@/newtab/helpers/utils";
import { bindDADItemEffect } from "@/newtab/feature/dragging";
import { Folder } from "@/newtab/components/common/Folder/Folder";
import { handleBookmarksKeyDown } from "@/newtab/helpers/handleBookmarksKeyDown";
import { AppState } from "@/newtab/state/state";
import { useDashboardStore } from "@/newtab/state/dashboard/dashboardStore";
import { useUiStore } from "@/newtab/state/ui/uiStore";
import { findItemById } from "@/newtab/state/actionHelpers";
import { TopBar } from "@/newtab/components/common/TopBar/TopBar";
import { getBookmarksViewState } from "./getBookmarksViewState";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";

let __prevCurrentSpaceId: number | undefined = undefined;
let __prevSearch: string | undefined = undefined;

export function Bookmarks(p: { appState: AppState }) {
  const createFolder = useDashboardStore((state) => state.createFolder);
  const moveFolderItems = useDashboardStore((state) => state.moveFolderItems);
  const moveFolder = useDashboardStore((state) => state.moveFolder);
  const selectSpace = useDashboardStore((state) => state.selectSpace);
  const updateSpace = useDashboardStore((state) => state.updateSpace);
  const setItemInEdit = useUiStore((state) => state.setItemInEdit);
  const setPage = useUiStore((state) => state.setPage);
  const showNotification = useUiStore((state) => state.showNotification);
  const [mouseDownEvent, setMouseDownEvent] = useState<
    React.MouseEvent | undefined
  >(undefined);
  const [isScrolled, setIsScrolled] = useState(false);

  const bookmarksRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      __prevCurrentSpaceId !== p.appState.currentSpaceId ||
      __prevSearch !== p.appState.search
    ) {
      __prevCurrentSpaceId = p.appState.currentSpaceId;
      __prevSearch = p.appState.search;
    }
  }, [p.appState.currentSpaceId, p.appState.search]);

  useEffect(() => {
    const handleScroll = () => {
      if (bookmarksRef.current) {
        setIsScrolled(bookmarksRef.current.scrollTop > 0);
      }
    };

    const bookmarksElement = bookmarksRef.current;
    if (bookmarksElement) {
      bookmarksElement.addEventListener("scroll", handleScroll);
    }

    return () => {
      if (bookmarksElement) {
        bookmarksElement.removeEventListener("scroll", handleScroll);
      }
    };
  }, []);

  useEffect(() => {
    if (mouseDownEvent) {
      const onDropItems = (
        folderId: number,
        insertBeforeItemId: number | undefined,
        targetsIds: number[],
        targetGroupId?: number
      ) => {
        if (folderId === -1) {
          folderId = Date.now() + Math.round(Math.random() * 10_000_000);
          createFolder({ id: folderId });
        }
        moveFolderItems({ itemIds: targetsIds, targetFolderId: folderId, targetGroupId, insertBeforeItemId });

        setMouseDownEvent(undefined);
      };
      const onDropFolder = (
        folderId: number,
        targetSpaceId: number | undefined,
        insertBeforeFolderId: number | undefined
      ) => {
        moveFolder({ folderId, targetSpaceId: targetSpaceId ?? p.appState.currentSpaceId, insertBeforeFolderId });

        setMouseDownEvent(undefined);
      };
      const onCancel = () => {
        setMouseDownEvent(undefined);
      };
      const onClick = (targetId: number) => {
        const meta =
          mouseDownEvent.metaKey ||
          mouseDownEvent.ctrlKey ||
          mouseDownEvent.button === 1;
        openFolderItem(targetId, meta);
      };

      const onChangeSpace = (spaceId: number) => {
        selectSpace(spaceId);
      };

      const onChangeSpacePosition = (spaceId: number, newPosition: string) => {
        updateSpace(spaceId, { position: newPosition });
      };

      const canDrag = () => {
        if (!p.appState.search) return true;
        showNotification({ message: "Sorting is unavailable in search" });
        return false;
      };
      return bindDADItemEffect(
        mouseDownEvent,
        {
          isFolderItem: true,
          onDrop: onDropItems,
          onCancel,
          onClick,
          onDragStarted: canDrag,
        },
        {
          onDrop: onDropFolder,
          onCancel,
          onChangeSpace,
          onDragStarted: canDrag,
        },
        {
          onChangeSpacePosition,
          canSortSpaces: () => p.appState.spaces.length > 1,
        }
      );
    }
  }, [mouseDownEvent]);

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e);
      setMouseDownEvent(e);
    }
  }

  function onCreateFolder() {
    const folderId = Date.now() + Math.round(Math.random() * 10_000_000);
    createFolder({ id: folderId });
    setItemInEdit(folderId);
  }

  function openFolderItem(itemId: number, inNewTab: boolean) {
    const item = findItemById({ spaces: p.appState.spaces }, itemId);
    if (!item) return;
    if (item.isSection) {
      setItemInEdit(item.id);
      return;
    }
    if (item.url === "tablo://import-bookmarks") {
      setPage("import");
      return;
    }
    if (!item.url) {
      showNotification({ message: "Bookmark URL is empty", isError: true });
      return;
    }
    if (inNewTab) {
      chrome.tabs.create({ url: item.url, active: false });
      return;
    }
    const openedTab = p.appState.tabs.find((tab) => tab.url === item.url);
    if (openedTab?.id) {
      chrome.tabs.update(openedTab.id, { active: true });
      chrome.windows.update(openedTab.windowId, { focused: true });
      return;
    }
    chrome.tabs.getCurrent((tab) => {
      if (p.appState.openBookmarksInNewTab) {
        chrome.tabs.create({ url: item.url, active: true });
      } else if (tab?.id) {
        chrome.tabs.update(tab.id, { url: item.url });
      }
    });
  }

  const { folders } = getBookmarksViewState(p.appState);
  const searchFilters = p.appState.searchFilters ?? [];
  const searchFilterMode = p.appState.searchFilterMode ?? "or";

  return (
    <div
      className={cn(styles.bookmarksBox, {
        [styles.withCollapsedSidebar]: p.appState.sidebarCollapsed,
      })}
      onMouseDown={onMouseDown}
    >
      <TopBar appState={p.appState} isScrolled={isScrolled} />
      <div
        className={styles.bookmarks}
        data-role={DOM_ROLE.bookmarks}
        ref={bookmarksRef}
        onKeyDown={(event) => handleBookmarksKeyDown(event, p.appState, openFolderItem)}
      >
        {folders.map((folder) => (
          <Folder
            key={folder.id}
            spaces={p.appState.spaces}
            folder={folder}
            tabs={p.appState.tabs}
            recentItems={p.appState.recentItems}
            showNotUsed={p.appState.showNotUsed}
            showArchived={p.appState.showArchived}
            search={p.appState.search}
            searchFilters={searchFilters}
            searchFilterMode={searchFilterMode}
            itemInEdit={p.appState.itemInEdit}
            hiddenFeatureIsEnabled={p.appState.hiddenFeatureIsEnabled}
          />
        ))}

        {p.appState.search === "" &&
        !searchFilters.some((filter) => filter.enabled) ? (
          <div
            className={cn(folderStyles.root, folderStyles.newFolder)}
            data-role={DOM_ROLE.folder}
            data-folder-id="-1"
            data-folder-new="true"
          >
            <h2 className={folderStyles.header} onClick={onCreateFolder}>
              New folder{" "}
              <span className={folderStyles.newText}>+ Click to add</span>
            </h2>
            <div
              className={folderStyles.items}
              data-role={DOM_ROLE.folderItems}
              data-folder-id="-1"
            />
          </div>
        ) : folders.length === 0 ? (
          <div className={styles.noBookmarksFound}>No bookmarks found</div>
        ) : null}
      </div>
    </div>
  );
}
