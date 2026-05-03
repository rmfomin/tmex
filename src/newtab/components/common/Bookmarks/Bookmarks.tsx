import React, { useContext, useEffect, useRef, useState } from "react";
import styles from "@/newtab/components/common/Bookmarks/Bookmarks.module.scss";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "@/newtab/helpers/utils";
import { bindDADItemEffect } from "@/newtab/helpers/dragging/dragAndDrop";
import { Folder } from "@/newtab/components/common/Folder/Folder";
import { handleBookmarksKeyDown } from "@/newtab/helpers/handleBookmarksKeyDown";
import { Action, AppState } from "@/newtab/state/state";
import { DispatchContext, mergeStepsInHistory } from "@/newtab/state/actions";
import {
  clickFolderItem,
  createFolderWithStat,
  getCanDragChecker,
} from "@/newtab/helpers/actionsHelpersWithDOM";
import { TopBar } from "@/newtab/components/common/TopBar/TopBar";
import { importFromJson } from "@/newtab/helpers/importExportHelpers";
import { isEmptyDashboard } from "@/newtab/components/common/Bookmarks/isEmptyDashboard";
import { getBookmarksViewState } from "@/newtab/components/common/Bookmarks/getBookmarksViewState";

let __prevCurrentSpaceId: number | undefined = undefined;
let __prevSearch: string | undefined = undefined;

export function Bookmarks(p: { appState: AppState }) {
  const dispatch = useContext(DispatchContext);
  const [mouseDownEvent, setMouseDownEvent] = useState<
    React.MouseEvent | undefined
  >(undefined);
  const [isScrolled, setIsScrolled] = useState(false);

  const bookmarksRef = useRef<HTMLDivElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

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
        mergeStepsInHistory((historyStepId) => {
          if (folderId === -1) {
            folderId = createFolderWithStat(dispatch, { historyStepId });
          }

          dispatch({
            type: Action.MoveFolderItems,
            itemIds: targetsIds,
            targetFolderId: folderId,
            targetGroupId,
            insertBeforeItemId: insertBeforeItemId,
            historyStepId,
          });
        });

        setMouseDownEvent(undefined);
      };
      const onDropFolder = (
        folderId: number,
        targetSpaceId: number | undefined,
        insertBeforeFolderId: number | undefined
      ) => {
        dispatch({
          type: Action.MoveFolder,
          folderId,
          targetSpaceId: targetSpaceId ?? p.appState.currentSpaceId,
          insertBeforeFolderId,
        });

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
        clickFolderItem(
          targetId,
          p.appState,
          dispatch,
          meta,
          p.appState.openBookmarksInNewTab
        );
      };

      const onChangeSpace = (spaceId: number) => {
        dispatch({
          type: Action.SelectSpace,
          spaceId,
        });
      };

      const onChangeSpacePosition = (spaceId: number, newPosition: string) => {
        dispatch({
          type: Action.UpdateSpace,
          spaceId: spaceId,
          position: newPosition,
        });
      };

      const canDrag = getCanDragChecker(p.appState.search, dispatch);
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
    const folderId = createFolderWithStat(dispatch, {});
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: folderId },
    });
  }

  function onOpenJsonImport() {
    importInputRef.current?.click();
  }

  const { folders } = getBookmarksViewState(p.appState);
  const showEmptyImport = isEmptyDashboard(p.appState);
  const searchFilters = p.appState.searchFilters ?? [];
  const searchFilterMode = p.appState.searchFilterMode ?? "or";

  return (
    <div className={styles.bookmarksBox} onMouseDown={onMouseDown}>
      <TopBar appState={p.appState} isScrolled={isScrolled} />
      <div
        className={`${styles.bookmarks} bookmarks`}
        ref={bookmarksRef}
        onKeyDown={(e) => handleBookmarksKeyDown(e, p.appState, dispatch)}
      >
        <input
          ref={importInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => importFromJson(e, dispatch)}
        />

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

        {showEmptyImport ? (
          <div className={styles.emptyDashboard}>
            <button
              className={`welcome-button ${styles.emptyDashboardButton}`}
              onClick={onOpenJsonImport}
            >
              Import from JSON
            </button>
          </div>
        ) : p.appState.search === "" &&
          !searchFilters.some((filter) => filter.enabled) ? (
          <div className="folder folder--new">
            <h2 onClick={onCreateFolder}>
              New folder <span>+ Click to add</span>
            </h2>
            <div className="folder-items-box" data-folder-id="-1" />
          </div>
        ) : folders.length === 0 ? (
          <div className={styles.noBookmarksFound}>No bookmarks found</div>
        ) : null}
      </div>
    </div>
  );
}
