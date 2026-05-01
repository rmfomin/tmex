import React, { useContext, useEffect } from "react";
import {
  getSelectedItemsElements,
  getSelectedItemsIds,
} from "@/newtab/helpers/selectionUtils";
import { DispatchContext } from "@/newtab/state/actions";
import { Action } from "@/newtab/state/state";
import { showMessageWithUndo } from "@/newtab/helpers/actionsHelpersWithDOM";
import { isSomeModalOpened } from "@/newtab/components/common/Modal/Modal";
import { isTargetInputOrTextArea } from "@/newtab/helpers/utils";

export const KeyboardAndMouseManager = React.memo((p: { search: string }) => {
  const dispatch = useContext(DispatchContext);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (isSomeModalOpened()) {
        // disabling hotkeys when any Modal open
        return;
      }

      if (
        document.activeElement &&
        isTargetInputOrTextArea(document.activeElement)
      ) {
        return;
      }

      if (getSelectedItemsElements().length > 0) {
        if (e.code === "Backspace" || e.code === "Delete") {
          dispatch({
            type: Action.DeleteFolderItems,
            itemIds: getSelectedItemsIds(),
          });
          showMessageWithUndo("Bookmark has been deleted", dispatch);
          return;
        }
      }

      if (e.code === "KeyF" && (e.ctrlKey || e.metaKey)) {
        (document.querySelector("input.search") as HTMLElement).focus();
        e.preventDefault();
        return;
      }

      if (e.code === "KeyZ" && (e.metaKey || e.ctrlKey)) {
        dispatch({
          type: Action.Undo,
          dispatch,
        });
        return;
      }

      if (document.activeElement === document.body) {
        if (e.code === "ArrowDown") {
          (document.querySelector("input.search") as HTMLElement).focus();
          return;
        }

        if (e.code.startsWith("Digit")) {
          if (e.ctrlKey || e.altKey) {
            const spaceIndex = parseInt(e.code.at(5) ?? "", 10);
            if (spaceIndex > 0 && spaceIndex < 10) {
              dispatch({
                type: Action.SelectSpace,
                spaceIndex: spaceIndex - 1,
              });
              return;
            }
          }
        }
      }
    };
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [p.search]);
  return null;
});
