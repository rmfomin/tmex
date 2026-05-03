import React, { useContext, useEffect, useRef, useState } from "react";
import cn from "clsx";
import styles from "./Sidebar.module.scss";
import { SidebarOpenTabs } from "@/newtab/components/common/SidebarOpenTabs/SidebarOpenTabs";
import { isTabowskiTab } from "@/newtab/helpers/isTabowskiTab";
import {
  blurSearch,
  getCurrentData,
  isTargetSupportsDragAndDrop,
  scrollElementIntoView,
} from "@/newtab/helpers/utils";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { Action, AppState } from "@/newtab/state/state";
import { DispatchContext } from "@/newtab/state/actions";
import IconDelDuplicates from "./icons/delete-duplicates.svg";
import IconSave from "./icons/save.svg";
import IconPin from "./icons/pin.svg";
import Tab = chrome.tabs.Tab;
import {
  convertTabOrRecentToItem,
  convertTabToItem,
} from "@/newtab/state/actionHelpers";
import {
  createFolderWithStat,
  showMessage,
} from "@/newtab/helpers/actionsHelpersWithDOM";
import { SidebarRecent } from "@/newtab/components/common/SidebarRecent/SidebarRecent";
import { bindDADItemEffect } from "@/newtab/helpers/dragging/dragAndDrop";
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils";
import { SearchInput } from "@/newtab/components/common/SearchInput/SearchInput";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";

export function Sidebar(p: { appState: AppState }) {
  const dispatch = useContext(DispatchContext);
  const searchFilters = p.appState.searchFilters ?? [];
  const searchFilterMode = p.appState.searchFilterMode ?? "or";
  const keepSidebarOpened =
    !p.appState.sidebarCollapsed || p.appState.sidebarHovered;
  const sidebarCollapsed = !keepSidebarOpened;
  const sidebarRef = useRef<HTMLDivElement | null>(null);
  const openTabsHeaderRef = useRef<HTMLDivElement | null>(null);

  const [mouseDownEvent, setMouseDownEvent] = useState<
    React.MouseEvent | undefined
  >(undefined);

  useEffect(() => {
    if (mouseDownEvent) {
      // todo technically TabsIds and RecentIds can have collisions
      const onDrop = (
        folderId: number,
        insertBeforeItemId: number | undefined,
        targetTabsOrRecentIds: number[],
        targetGroupId?: number,
      ) => {
        const targetTabId = targetTabsOrRecentIds[0]; // we support D&D only single element from sidebar
        let tabOrRecentItem:
          | Tab
          | RecentItem
          | undefined = p.appState.tabs.find((t) => t.id === targetTabId);

        if (!tabOrRecentItem) {
          tabOrRecentItem = p.appState.recentItems.find(
            (hi) => hi.id === targetTabId,
          );
        }

        if (folderId === -1) {
          // we need to create new folder first
          folderId = createFolderWithStat(dispatch, {});
        }

        if (tabOrRecentItem && tabOrRecentItem.id) {
          // Add existing Tab
          const item = convertTabOrRecentToItem(tabOrRecentItem);
          dispatch({
            type: Action.CreateFolderItem,
            folderId,
            targetGroupId,
            insertBeforeItemId,
            item,
          });

          dispatch({
            type: Action.UpdateAppState,
            newState: {
              itemInEdit: item.id,
            },
          });
        } else {
          console.error("ERROR: tab not found");
        }
        setMouseDownEvent(undefined);
      };
      const onCancel = () => {
        setMouseDownEvent(undefined);
      };
      const onClick = (tabOrRecentId: number) => {
        const tab = p.appState.tabs.find((t) => t.id === tabOrRecentId);
        if (tab) {
          chrome.tabs.update(tabOrRecentId, { active: true });
          chrome.windows.update(tab.windowId, { focused: true });
        } else {
          const recent = p.appState.recentItems.find(
            (ri) => ri.id === tabOrRecentId,
          );
          if (recent && recent.url) {
            chrome.tabs.create({ url: recent.url, active: true });
          }
        }
      };
      const onDragStarted = () => {
        return true;
      };

      return bindDADItemEffect(mouseDownEvent, {
        isFolderItem: false,
        onDrop,
        onCancel,
        onClick,
        onDragStarted,
      });
    }
  }, [mouseDownEvent]);

  function onMouseDown(e: React.MouseEvent) {
    if (isTargetSupportsDragAndDrop(e)) {
      blurSearch(e);
      setMouseDownEvent(e);
    }
  }

  const onSidebarMouseEnter = () => {
    if (!p.appState.sidebarCollapsed) {
      return;
    }

    dispatch({
      type: Action.UpdateAppState,
      newState: { sidebarHovered: true },
    });
  };

  const onSidebarMouseLeave = (e: any) => {
    if (!p.appState.sidebarCollapsed) {
      return;
    }

    if (e.relatedTarget.id !== "toggle-sidebar-btn") {
      dispatch({
        type: Action.UpdateAppState,
        newState: { sidebarHovered: false },
      });
    }
  };

  function onToggleSidebar() {
    dispatch({
      type: Action.UpdateAppState,
      newState: {
        sidebarCollapsed: !p.appState.sidebarCollapsed,
        sidebarHovered: false,
      },
    });
  }

  return (
    <div
      className={cn(styles.root, {
        [styles.floating]: p.appState.sidebarCollapsed,
        [styles.collapsed]: sidebarCollapsed,
      })}
      data-role={DOM_ROLE.sidebar}
      ref={sidebarRef}
      onMouseEnter={onSidebarMouseEnter}
      onMouseLeave={onSidebarMouseLeave}
      onMouseDown={onMouseDown}
    >
      <div className={styles.search}>
        <SearchInput
          search={p.appState.search}
          searchFilters={searchFilters}
          searchFilterMode={searchFilterMode}
        />
      </div>

      <div
        className={cn(styles.header, styles.openTabsHeader)}
        ref={openTabsHeaderRef}
      >
        <span className={styles.headerText}>Open tabs</span>
        <CleanupButton tabs={p.appState.tabs} />
        <StashButton tabs={p.appState.tabs} />
        <button
          id="toggle-sidebar-btn"
          className="btn__icon"
          onClick={onToggleSidebar}
          style={
            p.appState.sidebarCollapsed ? { transform: "rotate(180deg)" } : {}
          }
          title={p.appState.sidebarCollapsed ? "Pin" : "Collapse"}
        >
          <IconPin />
        </button>
      </div>

      <SidebarOpenTabs
        tabs={p.appState.tabs}
        spaces={p.appState.spaces}
        search={p.appState.search}
        searchFilters={searchFilters}
        searchFilterMode={searchFilterMode}
        lastActiveTabIds={p.appState.lastActiveTabIds}
        currentWindowId={p.appState.currentWindowId}
        sidebarCollapsed={sidebarCollapsed}
      />
      {(p.appState.showRecent ||
        p.appState.search ||
        searchFilters.some((filter) => filter.enabled)) && (
        <SidebarRecent
          search={p.appState.search}
          searchFilters={searchFilters}
          searchFilterMode={searchFilterMode}
          recentItems={p.appState.recentItems}
          spaces={p.appState.spaces}
          sidebarCollapsed={sidebarCollapsed}
        ></SidebarRecent>
      )}
    </div>
  );
}

const StashButton = React.memo((props: { tabs: Tab[] }) => {
  const [confirmationOpened, setConfirmationOpened] = useState(false);
  const [shouldCloseTabs, setShouldCloseTabs] = useState(true);
  const dispatch = useContext(DispatchContext);

  const onStashClick = () => {
    setConfirmationOpened(!confirmationOpened);
  };

  const shelveTabs = () => {
    setConfirmationOpened(false);
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const tabsToShelve: Tab[] = [];
      tabs.forEach((t) => {
        if (t.id && !t.pinned) {
          if (!isTabowskiTab(t)) {
            tabsToShelve.push(t);
          }
          if (!t.active && shouldCloseTabs) {
            chrome.tabs.remove(t.id);
          }
        }
      });

      if (tabsToShelve.length === 0) {
        // probably all the tabs where pinned
        return;
      }

      const items = tabsToShelve.map(convertTabToItem);
      const title = `Saved ${getCurrentData()}`;
      const folderId = createFolderWithStat(dispatch, { title, items });

      dispatch({
        type: Action.ShowNotification,
        message: "All Tabs has been saved",
      });
      scrollElementIntoView(`[data-folder-id="${folderId}"]`);
    });
  };

  const filteredTabs = props.tabs.filter((t) => !t.pinned && !isTabowskiTab(t));

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <button
        className={cn("btn__icon", { active: confirmationOpened })}
        disabled={filteredTabs.length < 1}
        title="Stash open Tabs in the new Folder"
        onClick={onStashClick}
      >
        <IconSave />
      </button>
      {confirmationOpened ? (
        <DropdownMenu
          onClose={() => setConfirmationOpened(false)}
          className={styles.stashPopup}
          width={240}
          offset={{ top: 12, left: 4 }}
          skipTabIndexes={true}
        >
          <div style={{ width: "100%" }}>
            <p>Save all open Tabs to a new Folder</p>
            <p>
              <label>
                <input
                  type="checkbox"
                  checked={shouldCloseTabs}
                  onChange={(e) => setShouldCloseTabs(e.target.checked)}
                />
                and close all the tabs
              </label>
            </p>
          </div>
          <div style={{ width: "100%", display: "flex" }}>
            <button
              className="focusable btn__setting primary"
              style={{ marginRight: "8px" }}
              onClick={shelveTabs}
            >
              Stash tabs
            </button>
            <button
              className="focusable btn__setting"
              onClick={() => setConfirmationOpened(false)}
            >
              Cancel
            </button>
          </div>
        </DropdownMenu>
      ) : null}
    </div>
  );
});

const CleanupButton = React.memo((props: { tabs: Tab[] }) => {
  const [duplicateTabsCount, setDuplicateTabsCount] = useState(0);
  const dispatch = useContext(DispatchContext);

  function onCleanupTabs() {
    getDuplicatedTabs((duplicatedTabs) => {
      duplicatedTabs.forEach((t) => {
        if (t.id) {
          chrome.tabs.remove(t.id);
        }
      });
      const message =
        duplicatedTabs.length > 0
          ? `${duplicatedTabs.length} duplicate tabs was closed`
          : "There are no duplicate tabs";
      showMessage(message, dispatch);
    });
  }

  useEffect(() => {
    getDuplicatedTabs((dt) => {
      setDuplicateTabsCount(dt.length);
    });
  }, [props.tabs]);
  return (
    <button
      className="btn__icon"
      style={{ position: "relative" }}
      title="Close duplicate tabs"
      disabled={duplicateTabsCount === 0}
      onClick={onCleanupTabs}
    >
      <IconDelDuplicates />
      {duplicateTabsCount > 0 ? (
        <div className={styles.duplicateCount}>{duplicateTabsCount}</div>
      ) : null}
    </button>
  );
});

function getDuplicatedTabs(cb: (value: Tab[]) => void): void {
  const tabsByUrl = new Map<string, Tab[]>();
  chrome.windows.getCurrent((chromeWindow) => {
    chrome.tabs.query({ windowId: chromeWindow.id }, (tabs) => {
      tabs.reverse().forEach((t) => {
        if (!t.url) {
          return;
        }
        if (!tabsByUrl.has(t.url)) {
          tabsByUrl.set(t.url, []);
        }
        const groupedTabsByUrl = tabsByUrl.get(t.url)!;

        //special condition to now close current tab with Tabowski but close all others
        if (isTabowskiTab(t) && t.active) {
          groupedTabsByUrl.unshift(t);
        } else {
          groupedTabsByUrl.push(t);
        }
      });
      const duplicatedTabs: Tab[] = [];
      tabsByUrl.forEach((groupedTabs) => {
        for (let i = 1; i < groupedTabs.length; i++) {
          const duplicatedTab = groupedTabs[i];
          if (duplicatedTab.id) {
            duplicatedTabs.push(duplicatedTab);
          }
        }
      });
      cb(duplicatedTabs);
    });
  });
}
