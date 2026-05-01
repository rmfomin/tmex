import React, { useContext } from "react";
import { handleSearchKeyDown } from "@/newtab/helpers/handleBookmarksKeyDown";
import { Action } from "@/newtab/state/state";
import { DispatchContext } from "@/newtab/state/actions";
import IconFind from "@/newtab/components/common/TopBar/icons/find.svg";
import styles from "@/newtab/components/common/SearchInput/SearchInput.module.scss";

export function SearchInput(p: { search: string }) {
  const dispatch = useContext(DispatchContext);

  function onSearchChange(event: React.ChangeEvent) {
    dispatch({ type: Action.UpdateSearch, value: (event.target as any).value });
  }

  function onClearSearch() {
    dispatch({ type: Action.UpdateSearch, value: "" });
  }

  return (
    <div className={styles.searchWrapper}>
      <IconFind className={styles.searchIcon} />
      <input
        tabIndex={1}
        className="search"
        type="text"
        placeholder="Search in Tabowski"
        value={p.search}
        onChange={onSearchChange}
        onKeyDown={(e) => handleSearchKeyDown(e, onClearSearch)}
      />
      {p.search !== "" ? (
        <button
          tabIndex={1}
          className={styles.clearSearchButton}
          onClick={onClearSearch}
        >
          ✕
        </button>
      ) : null}
    </div>
  );
}
