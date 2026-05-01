import React, { useContext, useState } from "react";
import PlusIcon from "@/newtab/components/common/SpacesList/icons/plus.svg";
import DeleteIcon from "@/newtab/components/common/SpacesList/icons/delete.svg";
import { SpaceV3 } from "@/newtab/helpers/types";
import { CL } from "@/newtab/helpers/classNameHelper";
import { DispatchContext } from "@/newtab/state/actions";
import { Action } from "@/newtab/state/state";
import { SimpleEditableTitle } from "@/newtab/components/common/EditableTitle/EditableTitle";
import { DropdownMenu } from "@/newtab/components/common/DropdownMenu/DropdownMenu";
import { genUniqLocalId } from "@/newtab/state/actionHelpers";
import { insertBetween } from "@/newtab/helpers/fractionalIndexes";
import { collectBookmarksV3 } from "@/newtab/helpers/v3Traversal";
import styles from "@/newtab/components/common/SpacesList/SpacesList.module.scss";

export function SpacesList(p: {
  spaces: SpaceV3[];
  currentSpaceId: number;
  itemInEdit: number | undefined;
}) {
  const dispatch = useContext(DispatchContext);

  const [menuSpaceId, setMenuSpaceId] = useState(-1);

  const setEditingSpaceId = (spaceId: number | undefined) => {
    dispatch({
      type: Action.UpdateAppState,
      newState: { itemInEdit: spaceId },
    });
  };

  const onSpaceClick = (spaceId: number) => {
    if (p.currentSpaceId === spaceId) {
      setEditingSpaceId(spaceId);
    } else {
      dispatch({
        type: Action.SelectSpace,
        spaceId: spaceId,
      });
    }
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

  return (
    <div className={styles.spacesList}>
      {p.spaces.length === 0 && (
        <span style={{ padding: "8px" }}>no spaces</span>
      )}
      {p.spaces.map((space) => {
        return (
          <span
            key={space.id}
            className={CL(styles.item, {
              [styles.active]: space.id === p.currentSpaceId,
            })}
            onClick={() => onSpaceClick(space.id)}
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
                title="Delete space"
                onMouseDown={() => deleteSpace(space)}
              >
                <DeleteIcon />
              </button>
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
                {p.spaces.length > 1 && (
                  <button
                    className="dropdown-menu__button dropdown-menu__button--dander focusable"
                    onClick={() => deleteSpace(space)}
                  >
                    Delete space
                  </button>
                )}
              </DropdownMenu>
            )}
          </span>
        );
      })}
      {!p.itemInEdit && (
        <div
          className={styles.newButton}
          onClick={onAddSpace}
          title="Add new space"
        >
          <PlusIcon />
        </div>
      )}
    </div>
  );
}
