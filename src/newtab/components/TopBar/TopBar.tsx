import React, { useContext, useState } from "react";
import { DropdownMenu } from "../DropdownMenu/DropdownMenu";
import { handleSearchKeyDown } from "../../helpers/handleBookmarksKeyDown";
import { Action, AppState } from "../../state/state";
import { DispatchContext } from "../../state/actions";
import { HelpOptions, SettingsOptions } from "../SettingsOptions";
import { CL } from "../../helpers/classNameHelper";
import IconHelp from "../../icons/help.svg";
import IconSettings from "../../icons/settings.svg";
import IconFind from "../../icons/find.svg";
import { SpacesList } from "../SpacesList/SpacesList";
import styles from "./TopBar.module.scss";

export function TopBar(p: { appState: AppState; isScrolled: boolean }) {
  const dispatch = useContext(DispatchContext);
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [helpMenuVisibility, setHelpMenuVisibility] = useState(false);

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility);
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  function onSearchChange(event: React.ChangeEvent) {
    dispatch({ type: Action.UpdateSearch, value: (event.target as any).value });
  }

  function onClearSearch() {
    dispatch({ type: Action.UpdateSearch, value: "" });
  }

  return (
    <div
      className={CL(styles.root, {
        [styles.scrolled]: p.isScrolled,
      })}
    >
      {p.appState.search && (
        <div className={styles.searchResultsHeader}>Search results:</div>
      )}

      {!p.appState.search && (
        <SpacesList
          spaces={p.appState.spaces}
          currentSpaceId={p.appState.currentSpaceId}
          itemInEdit={p.appState.itemInEdit}
        />
      )}

      <div className={styles.stretchingSpace}></div>

      <div className={styles.searchWrapper}>
        <IconFind className={styles.searchIcon} />
        <input
          tabIndex={1}
          className="search"
          type="text"
          placeholder="Search in Tabowski"
          value={p.appState.search}
          onChange={onSearchChange}
          onKeyDown={(e) => handleSearchKeyDown(e, onClearSearch)}
        />
        {p.appState.search !== "" ? (
          <button
            tabIndex={1}
            className={styles.clearSearchButton}
            onClick={onClearSearch}
          >
            ✕
          </button>
        ) : null}
      </div>

      <div className={styles.menuButtons}>
        <button
          className={`btn__icon ${helpMenuVisibility ? "active" : ""}`}
          onClick={onToggleHelpSettings}
        >
          <IconHelp />
        </button>

        <button
          className={`btn__icon ${settingsMenuVisibility ? "active" : ""}`}
          onClick={onToggleSettings}
        >
          <IconSettings />
        </button>

        {helpMenuVisibility && (
          <DropdownMenu
            onClose={() => {
              setHelpMenuVisibility(false);
            }}
            noSmartPositioning={true}
            alignRight={true}
            offset={{ top: 38, right: 48 }}
          >
            <HelpOptions appState={p.appState} />
          </DropdownMenu>
        )}

        {settingsMenuVisibility && (
          <DropdownMenu
            onClose={() => {
              setSettingsMenuVisibility(false);
            }}
            noSmartPositioning={true}
            alignRight={true}
            offset={{ top: 38 }}
          >
            <SettingsOptions appState={p.appState} />
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
