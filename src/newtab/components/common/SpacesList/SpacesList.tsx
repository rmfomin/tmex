import React, { useContext, useRef, useState } from "react";
import PlusIcon from "./icons/plus.svg";
import { SpaceV3 } from "@/newtab/helpers/types";
import cn from "clsx";
import { DispatchContext } from "@/newtab/state/actions";
import { Action } from "@/newtab/state/state";
import { SimpleEditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { genUniqLocalId } from "@/newtab/state/actionHelpers";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";
import {
  importSpaceFromJson,
  onExportSpaceJson,
} from "@/newtab/helpers/importExportHelpers";
import { DOM_ROLE } from "@/newtab/helpers/domRoles";
import styles from "./SpacesList.module.scss";

export function SpacesList(p: {
  spaces: SpaceV3[];
  currentSpaceId: number;
  itemInEdit: number | undefined;
}) {
  const dispatch = useContext(DispatchContext);
  const importSpaceInputRef = useRef<HTMLInputElement>(null);

  const [menuSpaceId, setMenuSpaceId] = useState(-1);

  const setEditingSpaceId = (spaceId: number | undefined) => {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: spaceId },
    });
  };

  const onSpaceClick = (spaceId: number) => {
    dispatch({
      type: Action.SelectSpace,
      spaceId: spaceId,
    });
  };

  const onSaveNewSpaceTitle = (spaceId: number, title: string) => {
    dispatch({
      type: Action.UpdateSpace,
      spaceId,
      title,
    });
    setEditingSpaceId(undefined);
  };

  const onSpaceTitleElementUnmount = () => {
    setEditingSpaceId(undefined);
  };

  const onRenameSpace = (spaceId: number) => {
    setMenuSpaceId(-1);
    setEditingSpaceId(spaceId);
  };

  const onExportSpace = (space: SpaceV3) => {
    setMenuSpaceId(-1);
    onExportSpaceJson(space);
  };

  const deleteSpace = (space: SpaceV3) => {
    const bookmarksCount = collectBookmarksV3([space]).length;
    let res = true;
    if (bookmarksCount > 0) {
      res = confirm(`Delete the space '${space.title}'?`);
    }
    if (res) {
      dispatch({
        type: Action.DeleteSpace,
        spaceId: space.id,
      });
    }
  };

  const onAddSpace = () => {
    const lastSpace = p.spaces.at(-1);
    const spaceId = genUniqLocalId();
    dispatch({
      type: Action.CreateSpace,
      spaceId: spaceId,
      title: `New space`,
      position: insertBetween(lastSpace?.position ?? "", ""),
    });

    dispatch({
      type: Action.SelectSpace,
      spaceId: spaceId,
    });

    setEditingSpaceId(spaceId);
  };

  const onImportSpaceClick = () => {
    importSpaceInputRef.current?.click();
  };

  return (
    <div className={styles.spacesList} data-role={DOM_ROLE.spacesList}>
      {p.spaces.length === 0 && (
        <span style={{ padding: "8px" }}>no spaces</span>
      )}
      {p.spaces.map((space) => {
        return (
          <span
            key={space.id}
            className={cn(styles.item, {
              [styles.active]: space.id === p.currentSpaceId,
            })}
            data-role={DOM_ROLE.spaceItem}
            onClick={() => onSpaceClick(space.id)}
            onDoubleClick={() => setEditingSpaceId(space.id)}
            data-position={space.position}
            data-space-id={space.id}
          >
            <SimpleEditableTitle
              inEdit={space.id === p.itemInEdit}
              onContextMenu={() => setMenuSpaceId(space.id)}
              value={space.title || "untitled"}
              onSave={(title) => onSaveNewSpaceTitle(space.id, title)}
              onUnmount={onSpaceTitleElementUnmount}
            />
            {space.id === p.itemInEdit && p.spaces.length > 1 && (
              <button
                className={styles.deleteButton}
                data-role={DOM_ROLE.spaceDelete}
                title="Delete space"
                onMouseDown={() => deleteSpace(space)}
              ></button>
            )}
            {menuSpaceId === space.id && (
              <DropdownMenu
                onClose={() => {
                  setMenuSpaceId(-1);
                }}
                className={"dropdown-menu--folder"}
                offset={{ top: 2, left: -16 }}
              >
                <button
                  className="dropdown-menu__button focusable"
                  onClick={() => onRenameSpace(space.id)}
                >
                  Rename space
                </button>
                <button
                  className="dropdown-menu__button focusable"
                  onClick={() => onExportSpace(space)}
                >
                  Export space
                </button>
                {p.spaces.length > 1 && (
                  <button
                    className="dropdown-menu__button dropdown-menu__button--dander focusable"
                    onClick={() => deleteSpace(space)}
                  >
                    <span>Delete space</span>
                  </button>
                )}
              </DropdownMenu>
            )}
          </span>
        );
      })}
      {!p.itemInEdit && (
        <>
          <input
            ref={importSpaceInputRef}
            type="file"
            accept=".json,application/json"
            className={styles.importInput}
            onChange={(e) => importSpaceFromJson(e, dispatch, p.spaces)}
          />
          <button
            type="button"
            className={styles.importButton}
            onClick={onImportSpaceClick}
            title="Import space"
          >
            Import space
          </button>
          <div
            className={styles.newButton}
            onClick={onAddSpace}
            title="Add new space"
          >
            <PlusIcon />
          </div>
        </>
      )}
    </div>
  );
}
