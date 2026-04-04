import React, { useContext, useEffect, useRef, useState } from "react";
import styles from "./Bookmarks.module.scss";
import {
  blurSearch,
  isTargetSupportsDragAndDrop,
} from "../../helpers/utils";
import { bindDADItemEffect } from "../../dragging/dragAndDrop";
import { Folder } from "../Folder/Folder";
import { handleBookmarksKeyDown } from "../../helpers/handleBookmarksKeyDown";
import { Action, AppState } from "../../state/state";
import {
  DispatchContext,
  mergeStepsInHistory,
} from "../../state/actions";
import {
  clickFolderItem,
  createFolderWithStat,
  getCanDragChecker,
} from "../../helpers/actionsHelpersWithDOM";
import { TopBar } from "../TopBar/TopBar";
import { importFromJson } from "../../helpers/importExportHelpers";
import { isEmptyDashboard } from "./isEmptyDashboard";
import { getBookmarksViewState } from "./getBookmarksViewState";

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
      ) => {
        mergeStepsInHistory((historyStepId) => {
          if (folderId === -1) {
            folderId = createFolderWithStat(
              dispatch,
              { historyStepId },
              "by-drag-in-new-folder--bookmarks",
            );
          }

          dispatch({
            type: Action.MoveFolderItems,
            itemIds: targetsIds,
            targetFolderId: folderId,
            insertBeforeItemId: insertBeforeItemId,
            historyStepId,
          });
        });

        setMouseDownEvent(undefined);
      };
      const onDropFolder = (
        folderId: number,
        targetSpaceId: number | undefined,
        insertBeforeFolderId: number | undefined,
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
          p.appState.openBookmarksInNewTab,
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
        },
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
    const folderId = createFolderWithStat(
      dispatch,
      {},
      "by-click-new-in-bookmarks",
    );
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

  return (
    <div className="bookmarks-box" onMouseDown={onMouseDown}>
      <TopBar appState={p.appState} isScrolled={isScrolled} />
      <div
        className="bookmarks"
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
            itemInEdit={p.appState.itemInEdit}
            hiddenFeatureIsEnabled={p.appState.hiddenFeatureIsEnabled}
          />
        ))}

        {showEmptyImport ? (
          <div className="empty-dashboard">
            <button
              className="welcome-button empty-dashboard__button"
              onClick={onOpenJsonImport}
            >
              Import from JSON
            </button>
          </div>
        ) : p.appState.search === "" ? (
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
