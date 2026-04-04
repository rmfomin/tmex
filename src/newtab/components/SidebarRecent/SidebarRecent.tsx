import React, { useCallback, useContext, useEffect, useState } from "react";
import { filterRecentItemsBySearch } from "../../helpers/utils";
import { CL } from "../../helpers/classNameHelper";
import {
  confluenceHashRegExp,
  figmaBoardRegExp,
  figmaDesignHashRegExp,
  figmaSlidesRegExp,
  RecentItem,
  getBaseFilteredRecentItems,
  getCleanMiroTitle,
  getCleanTitle,
  getFilteredRecentItems,
  githubPRHashRegExp,
  googleDocHashRegExp,
  googleFormsHashRegExp,
  googlePresentationHashRegExp,
  googleSpreadsheetsHashRegExp,
  hashGetterFactory,
  RecentFilter,
  jiraHashRegExp,
  loomHashRegExp,
  miroHashRegExp,
  tryLoadMoreHistory,
  youtubeHashRegExp,
} from "../../helpers/recentHistoryUtils";
import IconFilter from "../../icons/filter.svg";
import IconNonFilter from "../../icons/no-filter-thin.svg";
import { getTempFavIconUrl } from "../../state/actionHelpers";
import { DispatchContext } from "../../state/actions";
import { TabOrRecentItem } from "../SidebarItem/SidebarItem";
import { SpaceV3 } from "../../helpers/types";
import styles from "./SidebarRecent.module.scss";

const PAGE_SIZE = 100;

const RecentList = React.memo(
  (p: { items: RecentItem[]; spaces: SpaceV3[]; search: string }) => {
    const dispatch = useContext(DispatchContext);
    const [displayedItems, setDisplayedItems] = useState<RecentItem[]>([]);
    const [page, setPage] = useState<number>(1);

    useEffect(() => {
      setDisplayedItems(p.items.slice(0, PAGE_SIZE));
      setPage(1);
    }, [p.items]);

    const loadMore = useCallback(() => {
      const nextPage = page + 1;
      const nextItems = p.items.slice(0, nextPage * PAGE_SIZE);
      if (nextItems.length > displayedItems.length) {
        setDisplayedItems(nextItems);
        setPage(nextPage);
      }
      tryLoadMoreHistory(dispatch);
    }, [page, p.items, displayedItems, dispatch]);

    const handleScroll = useCallback(() => {
      const sidebar = document.querySelector(".app-sidebar")!;
      if (sidebar) {
        const { scrollTop, scrollHeight, clientHeight } = sidebar;
        if (scrollTop + clientHeight >= scrollHeight - 200) {
          loadMore();
        }
      }
    }, [loadMore]);

    useEffect(() => {
      const sidebar = document.querySelector(".app-sidebar")!;
      if (sidebar) {
        sidebar.addEventListener("scroll", handleScroll);
      }
      return () => {
        if (sidebar) {
          sidebar.removeEventListener("scroll", handleScroll);
        }
      };
    }, [handleScroll]);

    return (
      <div>
        {displayedItems.map((item) => {
          return (
            <TabOrRecentItem
              lastActiveTabId={0}
              key={item.id}
              data={item}
              spaces={p.spaces}
              search={p.search}
            />
          );
        })}
      </div>
    );
  },
);

export const SidebarRecent = React.memo(
  (p: {
    recentItems: RecentItem[];
    search: string;
    spaces: SpaceV3[];
  }) => {
    const dispatch = useContext(DispatchContext);
    const [filterByDomainEnabled, setFilterByDomainEnabled] = React.useState(
      false,
    );
    const [enabledFilers, setEnabledFilters] = useState<RecentFilter[]>(
      historyFilters,
    );
    const enabledFiltersCount = enabledFilers.reduce(
      (prevVal, filter) => prevVal + (filter.enabled ? 1 : 0),
      0,
    );

    const itemsFilteredBySearch = filterRecentItemsBySearch(
      p.recentItems,
      p.search,
    );

    const itemsFilteredBySearchAndFilter =
      filterByDomainEnabled && enabledFiltersCount
        ? getFilteredRecentItems(itemsFilteredBySearch, enabledFilers)
        : getBaseFilteredRecentItems(itemsFilteredBySearch);

    const moreSearchResultsCount =
      p.search !== "" && enabledFiltersCount > 0
        ? itemsFilteredBySearch.length - itemsFilteredBySearchAndFilter.length
        : 0;

    const onFiltersPanelClick = () => {
      setFilterByDomainEnabled(!filterByDomainEnabled);
      tryLoadMoreHistory(dispatch);
    };

    const onFilterClick = (filter: RecentFilter) => {
      setEnabledFilters(
        enabledFilers.map((f) => {
          if (f.pattern === filter.pattern) {
            return {
              ...f,
              enabled: !f.enabled,
            };
          } else {
            return {
              ...f,
              enabled: false,
            };
          }
        }),
      );
    };

    const onClearFilters = () => {
      setEnabledFilters(
        enabledFilers.map((f) => {
          return {
            ...f,
            enabled: false,
          };
        }),
      );
    };

    return (
      <div className={styles.recentList}>
        <div
          className={CL("app-sidebar__header app-sidebar__header--recent", {
            "filters-opened": filterByDomainEnabled,
          })}
        >
          <div className="inner-header">
            <span className="app-sidebar__header__text">Recent</span>
            <button
              className={CL("btn__icon", { active: filterByDomainEnabled })}
              style={{ position: "relative" }}
              title="Filter recent by domain"
              onClick={onFiltersPanelClick}
            >
              <IconFilter />
            </button>
          </div>

          {filterByDomainEnabled && (
            <div className={styles.recentFilterPanel}>
              <button
                className={CL(styles.recentListPanelBtn, {
                  [styles.active]: enabledFiltersCount === 0,
                })}
                title="Toggle filters"
                onClick={onClearFilters}
              >
                <IconNonFilter />
              </button>
              {enabledFilers.map((filter) => {
                return (
                  <button
                    key={filter.pattern}
                    className={CL(styles.recentListPanelBtn, {
                      [styles.active]: filter.enabled,
                    })}
                    title={filter.title}
                    onClick={() => onFilterClick(filter)}
                  >
                    <img
                      src={filter.icon ?? getTempFavIconUrl(filter.pattern)}
                      alt=""
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <RecentList
          items={itemsFilteredBySearchAndFilter}
          search={p.search}
          spaces={p.spaces}
        />
        {Boolean(moreSearchResultsCount) ? (
          <div className="sidebar-message">
            <span>
              <span className="sidebar-message__btn" onClick={onClearFilters}>
                Remove
              </span>{" "}
              filtering to see {moreSearchResultsCount} more results
            </span>
          </div>
        ) : (
          <div className="sidebar-message">
            <span>History is limited by 2 month</span>
          </div>
        )}
      </div>
    );
  },
);

const historyFilters: RecentFilter[] = [
  {
    title: "Miro",
    icon:
      "https://miro.com/static/favicons/favicon.ico?cbh=29b45061748a5faabb42beed5d529ef9",
    pattern: "https://miro.com/",
    getHash: hashGetterFactory([miroHashRegExp]),
    cleanTitle: getCleanMiroTitle,
    enabled: true,
  },
  {
    title: "Figma",
    icon: "https://static.figma.com/app/icon/1/favicon.svg",
    pattern: "https://www.figma.com/",
    getHash: hashGetterFactory([
      figmaDesignHashRegExp,
      figmaSlidesRegExp,
      figmaBoardRegExp,
    ]),
    cleanTitle: getCleanTitle,
  },
  {
    title: "Google Docs",
    icon: "https://ssl.gstatic.com/docs/doclist/images/drive_2022q3_32dp.png",
    pattern: "https://docs.google.com/",
    getHash: hashGetterFactory([
      googleDocHashRegExp,
      googlePresentationHashRegExp,
      googleFormsHashRegExp,
      googleSpreadsheetsHashRegExp,
    ]),
    cleanTitle: getCleanTitle,
  },
  {
    title: "Miro Jira & Confluence",
    icon: "https://miro.atlassian.net/favicon.ico",
    pattern: "https://miro.atlassian.net/",
    getHash: hashGetterFactory([jiraHashRegExp, confluenceHashRegExp]),
    cleanTitle: getCleanTitle,
  },
  {
    title: "Github",
    icon: "https://github.com/favicon.ico",
    pattern: "https://github.com/",
    getHash: hashGetterFactory([githubPRHashRegExp]),
    cleanTitle: getCleanTitle,
  },
  {
    title: "Youtube",
    icon:
      "https://www.gstatic.com/youtube/img/creator/favicon/favicon_32_v2.png",
    pattern: "https://www.youtube.com/",
    getHash: hashGetterFactory([youtubeHashRegExp]),
    cleanTitle: getCleanTitle,
  },
  {
    title: "Loom",
    icon: "https://cdn.loom.com/assets/favicons-loom/favicon.ico",
    pattern: "https://www.loom.com/",
    getHash: hashGetterFactory([loomHashRegExp]),
    cleanTitle: getCleanTitle,
  },
];
