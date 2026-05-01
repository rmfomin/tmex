import React, { useContext } from "react";
import { BookmarkImporter } from "@/newtab/components/common/BookmarksImporter/BookmarksImporter";
import { Action, AppState } from "@/newtab/state/state";
import { DispatchContext } from "@/newtab/state/actions";

export function ImportBookmarksFromSettings(props: { appState: AppState }) {
  const dispatch = useContext(DispatchContext);

  const onClose = () => {
    dispatch({ type: Action.UpdateAppState, newState: { page: "default" } });
  };

  return (
    <div className="welcome welcome__align-top">
      <div className="welcome-scrollable">
        <BookmarkImporter appState={props.appState} onClose={onClose} />
      </div>
    </div>
  );
}
