import React, { useState } from "react";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { AppState } from "@/newtab/state/state";
import { HelpOptions, SettingsOptions } from "@/newtab/helpers/settingsOptions";
import cn from "clsx";
import { hasSearch } from "@/newtab/helpers/utils";
import IconHelp from "@/newtab/components/common/TopBar/icons/help.svg";
import IconSettings from "@/newtab/components/common/TopBar/icons/settings.svg";
import { SpacesList } from "@/newtab/components/common/SpacesList/SpacesList";
import styles from "@/newtab/components/common/TopBar/TopBar.module.scss";

export function TopBar(p: { appState: AppState; isScrolled: boolean }) {
  const [settingsMenuVisibility, setSettingsMenuVisibility] = useState(false);
  const [helpMenuVisibility, setHelpMenuVisibility] = useState(false);
  const searchActive = hasSearch(
    p.appState.search,
    p.appState.searchFilters ?? []
  );

  function onToggleHelpSettings() {
    setHelpMenuVisibility(!helpMenuVisibility);
  }

  function onToggleSettings() {
    setSettingsMenuVisibility(!settingsMenuVisibility);
  }

  return (
    <div
      className={cn(styles.root, {
        [styles.scrolled]: p.isScrolled,
      })}
    >
      {searchActive && (
        <div className={styles.searchResultsHeader}>Search results:</div>
      )}

      {!searchActive && (
        <SpacesList
          spaces={p.appState.spaces}
          currentSpaceId={p.appState.currentSpaceId}
          itemInEdit={p.appState.itemInEdit}
        />
      )}

      <div className={styles.stretchingSpace}></div>

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
