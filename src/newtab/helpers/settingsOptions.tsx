import React, { useContext, useRef, useState } from "react";
import { hasItemsToHighlight } from "@/newtab/helpers/utils";
import { Action, AppState } from "@/newtab/state/state";
import { DispatchContext } from "@/newtab/state/actions";
import Switch from "react-switch";
import {
  showErrorMessage,
  showMessage,
} from "@/newtab/helpers/actionsHelpersWithDOM";
import {
  importFromJson,
  onExportJson,
  onImportFromToby,
} from "@/newtab/helpers/importExportHelpers";
import { ImportConfirmationModal } from "@/newtab/components/common/ImportConfirmationModal/ImportConfirmationModal";
import { loadFaviconUrl } from "@/newtab/helpers/faviconUtils";
import { ShortcutsModal } from "@/newtab/components/common/ShortcutsModal/ShortcutsModal";
import {
  getThemeOptionButtonStyle,
  ThemeOptionIcon,
} from "@/newtab/components/common/ThemeOptionIcon/ThemeOptionIcon";
import { BookmarkItemV3, ColorTheme } from "@/newtab/helpers/types";
import cn from "clsx";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";

type OnClickOption = {
  onClick: (e: any) => void;
  title: string;
  text: string;
  hidden?: boolean;
  isFile?: boolean;
  dangerStyle?: boolean;
};
type OnToggleOption = {
  onToggle: () => void;
  value: boolean;
  title: string;
  text: string;
  hidden?: boolean;
};
type SegmentedOption<T extends string> = {
  onSelect: (value: T) => void;
  value: T;
  title: string;
  text: string;
  items: Array<{
    value: T;
    text: string;
    title?: string;
    icon?: React.ReactNode;
    buttonStyle?: (isActive: boolean) => React.CSSProperties;
  }>;
  hidden?: boolean;
};
export type OptionsConfig = Array<
  OnClickOption | OnToggleOption | SegmentedOption<any> | { separator: true }
>;

export const HelpOptions = (p: { appState: AppState }) => {
  const dispatch = useContext(DispatchContext);
  // const [isJoinBetaModalOpen, setJoinBetaModalOpen] = useState(false);
  const [isShortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  function onGithubOpen() {
    chrome.tabs.create({
      url: "https://github.com/",
      active: true,
    });
  }

  function showShortcutsModal() {
    setShortcutsModalOpen(true);
  }

  function invalidateFavicon(folderItem: BookmarkItemV3): Promise<void> {
    if (folderItem.url) {
      return loadFaviconUrl(folderItem.url).then((newFaviconUrl) => {
        if (newFaviconUrl !== folderItem.favIconUrl) {
          dispatch({
            type: Action.UpdateFolderItem,
            itemId: folderItem.id,
            favIconUrl: newFaviconUrl,
          });
        }
      });
    } else {
      return Promise.resolve();
    }
  }

  function minTimeoutPromise() {
    return new Promise((resolve) => setTimeout(resolve, 500));
  }

  function invalidateBrokenIcons() {
    const promises: Promise<unknown>[] = [minTimeoutPromise()];
    const currentSpace = p.appState.spaces.find(
      (s) => s.id === p.appState.currentSpaceId
    );
    if (currentSpace) {
      promises.push(
        ...collectBookmarksV3([currentSpace]).map(invalidateFavicon)
      );
    }

    showMessage("updating...", dispatch, true);
    Promise.all(promises).then(() => {
      showMessage("Favicons are updated", dispatch);
    });
  }

  type OnClickOption = {
    onClick: (e: any) => void;
    title: string;
    text: string;
    hidden?: boolean;
    isFile?: boolean;
  };

  type OnToggleOption = {
    onToggle: () => void;
    value: boolean;
    title: string;
    text: string;
    hidden?: boolean;
  };

  const settingsOptions: Array<
    OnClickOption | OnToggleOption | { separator: true }
  > = [
    {
      onClick: showShortcutsModal,
      title: "Keyboard shortcuts",
      text: "Keyboard shortcuts",
    },
    {
      onClick: invalidateBrokenIcons,
      title:
        "Sometimes favicons are not showing, this option may help to fix it. Applied only for bookmarks in the current space.",
      text: "Reload favicons",
    },
    {
      onClick: onGithubOpen,
      title: "Open Github",
      text: "Open Github (example)",
    },
  ];

  return (
    <>
      <Options optionsConfig={settingsOptions} />

      {isShortcutsModalOpen && (
        <ShortcutsModal setOpen={setShortcutsModalOpen} />
      )}
    </>
  );
};

export const SettingsOptions = (p: { appState: AppState }) => {
  const [importConfirmationOpen, setImportConfirmationOpen] = useState(false);
  const fileEvent = useRef(null);
  const dispatch = useContext(DispatchContext);

  function onToggleNotUsed() {
    if (p.appState.showNotUsed) {
      dispatch({ type: Action.UpdateShowNotUsedItems, value: false });
      showMessage("Highlighting canceled", dispatch);
    } else {
      if (hasItemsToHighlight(p.appState.spaces, p.appState.recentItems)) {
        dispatch({ type: Action.UpdateShowNotUsedItems, value: true });
        showMessage(
          "Unused items for the past 60 days are highlighted",
          dispatch
        );
      } else {
        showErrorMessage(`There are no unused items to highlight`, dispatch);
      }
    }
  }

  function onToggleHidden() {
    dispatch({
      type: Action.UpdateShowArchivedItems,
      value: !p.appState.showArchived,
    });
    const message = !p.appState.showArchived
      ? "Hidden items are visible"
      : "Hidden items are hidden";
    showMessage(message, dispatch);
  }

  function onImportExistingBookmarks() {
    dispatch({ type: Action.UpdateAppState, newState: { page: "import" } });
  }

  function onToggleRecentVisibility() {
    dispatch({
      type: Action.UpdateAppState,
      newState: { showRecent: !p.appState.showRecent },
    });
  }

  function onSelectColorTheme(colorTheme: ColorTheme) {
    dispatch({ type: Action.SetColorTheme, colorTheme });
  }

  function onToggleOpenInTheNewTab() {
    dispatch({
      type: Action.UpdateAppState,
      newState: { openBookmarksInNewTab: !p.appState.openBookmarksInNewTab },
    });
  }

  function onImportClick(e: any) {
    fileEvent.current = e;
    setImportConfirmationOpen(true);
  }

  function onImportTypeConfirmed(opt: string) {
    setImportConfirmationOpen(false);
    if (opt === "import") {
      importFromJson(fileEvent.current, dispatch);
    }
  }

  const settingsOptions: OptionsConfig = [
    {
      onSelect: onSelectColorTheme,
      value: p.appState.colorTheme ?? "system",
      title: "Choose light theme, system theme, or dark theme",
      text: "Theme",
      items: [
        {
          value: "light",
          text: "Light",
          title: "Always use light theme",
          icon: <ThemeOptionIcon theme="light" />,
          buttonStyle: getThemeOptionButtonStyle,
        },
        {
          value: "system",
          text: "Auto",
          title: "Use system theme",
          icon: <ThemeOptionIcon theme="system" />,
          buttonStyle: getThemeOptionButtonStyle,
        },
        {
          value: "dark",
          text: "Dark",
          title: "Always use dark theme",
          icon: <ThemeOptionIcon theme="dark" />,
          buttonStyle: getThemeOptionButtonStyle,
        },
      ],
    },
    {
      separator: true,
    },
    {
      onToggle: onToggleNotUsed,
      value: p.appState.showNotUsed,
      title:
        "Highlight not used in past 60 days to archive them. It helps to keep workspace clean.",
      text: p.appState.showNotUsed
        ? "Unhighlight not used"
        : "Highlight not used",
    },
    {
      onToggle: onToggleHidden,
      value: p.appState.showArchived,
      title: "You can hide unused folders and bookmarks to keep space clean",
      text: "Show hidden items",
      hidden: !p.appState.hiddenFeatureIsEnabled,
    },
    {
      onToggle: onToggleRecentVisibility,
      value: p.appState.showRecent,
      title:
        "Show recently closed tabs in the sidebar. When off, they appear only during search.",
      text: "Show Recent in Sidebar",
    },
    {
      onToggle: onToggleOpenInTheNewTab,
      value: !p.appState.openBookmarksInNewTab,
      title:
        "You can also open bookmarks on the new tab with pressed CMD or CTRL",
      text: "Open bookmarks on the same tab",
    },
    {
      separator: true,
    },
    {
      onClick: onImportExistingBookmarks,
      title: "Import existing Chrome bookmarks into Tabowski",
      text: "Import from browser bookmarks",
    },
    {
      onClick: (e) => {
        onImportFromToby(e, dispatch, () => {
          showMessage("Bookmarks has been imported", dispatch);
        });
      },
      title:
        "To get Toby`s 'JSON file' go to Account -> Export -> Json in the Toby App",
      text: "Import from Toby App JSON",
      isFile: true,
    },
    {
      onClick: (e) => onImportClick(e),
      title: "Open exported Tabowski JSON file",
      text: "Import from JSON",
      isFile: true,
    },
    {
      onClick: () => {
        onExportJson(p.appState.spaces);
      },
      title: "Export all Folders and Bookmarks to JSON file",
      text: "Export to JSON",
    },
  ];

  return (
    <>
      <Options optionsConfig={settingsOptions} />

      {importConfirmationOpen && (
        <ImportConfirmationModal onClose={onImportTypeConfirmed} />
      )}

      {/* {isOverrideModalOpen && <OverrideModal setOpen={setOverrideModalOpen} />} */}
    </>
  );
};

export const Options = (props: {
  optionsConfig: OptionsConfig | (() => OptionsConfig);
}) => {
  function isSeparator(opt: any): opt is { separator: boolean } {
    return opt.hasOwnProperty("separator");
  }

  function isToggle(opt: any): opt is OnToggleOption {
    return opt.hasOwnProperty("onToggle");
  }

  function isClick(opt: any): opt is OnClickOption {
    return opt.hasOwnProperty("onClick");
  }

  function isSegmented(opt: any): opt is SegmentedOption<string> {
    return opt.hasOwnProperty("onSelect");
  }

  const options =
    typeof props.optionsConfig === "function"
      ? props.optionsConfig()
      : props.optionsConfig;

  return (
    <>
      {options.map((option, index) => {
        if ((option as any).hidden) {
          return null;
        }

        if (isSeparator(option)) {
          return <div key={index} className="dropdown-menu__separator" />;
        } else if (isSegmented(option)) {
          return (
            <div
              key={index}
              className="dropdown-menu__segmented-row"
              title={option.title}
            >
              <span className="dropdown-menu__segmented-label">
                {option.text}
              </span>
              <div className="dropdown-menu__segmented-control">
                {option.items.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={cn("dropdown-menu__segmented-button focusable", {
                      active: item.value === option.value,
                    })}
                    title={item.title}
                    aria-label={item.text}
                    style={item.buttonStyle?.(item.value === option.value)}
                    onClick={() => option.onSelect(item.value)}
                  >
                    {item.icon ?? item.text}
                  </button>
                ))}
              </div>
            </div>
          );
        } else if (isToggle(option)) {
          return (
            <label
              key={index}
              className="dropdown-menu__button focusable"
              title={option.title}
            >
              <Switch
                className={"switch"}
                height={16}
                width={28}
                onColor={"#0066FF"}
                offColor={"#cbcbcb"}
                checkedIcon={false}
                uncheckedIcon={false}
                checked={option.value}
                onChange={option.onToggle}
              />
              <span>{option.text}</span>
            </label>
          );
        } else if (isClick(option)) {
          if (option.isFile) {
            return (
              <label
                key={index}
                className="dropdown-menu__button focusable"
                style={{ position: "relative" }}
                title={option.title}
                tabIndex={0}
              >
                <span>{option.text}</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden-file-input"
                  onChange={option.onClick}
                  tabIndex={-1}
                />
              </label>
            );
          } else {
            return (
              <button
                key={index}
                className={cn("dropdown-menu__button focusable", {
                  "dropdown-menu__button--dander": option.dangerStyle,
                })}
                onClick={option.onClick}
                title={option.title}
              >
                {option.text}
              </button>
            );
          }
        }
      })}
    </>
  );
};
