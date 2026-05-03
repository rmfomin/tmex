import { unselectAllItems } from "@/newtab/helpers/selectionUtils";
import {
  setScrollByDummyClientY,
  subscribeMouseEvents,
} from "@/newtab/feature/dragging/dragAndDropUtils";
import {
  calculateFoldersDropAreas,
  createPlaceholder,
  createTabDummy,
  getDragPreviewElement,
  getFolderId,
  getIdsFromElements,
  getItemIdByIndex,
  getNewPlacementForItem,
  getOverlappedDropArea,
  PConfigItem,
  DropArea,
} from "@/newtab/feature/dragging/dragAndDrop";
import { inRange } from "@/newtab/helpers/mathUtils";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

export function processItemDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigItem,
  targetRoots: HTMLElement[],
) {
  let originalFolderId: number;
  let originalIndex: number;
  let dummy: undefined | HTMLElement = undefined;
  const placeholder: HTMLElement = createPlaceholder(true);
  const canDropIntoGroupHeader = targetRoots.every(
    (targetRoot) => targetRoot.dataset.role !== DOM_ROLE.groupHeader,
  );

  const folderEls = Array.from(
    document.querySelectorAll(
      `${
        canDropIntoGroupHeader ? `${roleSelector(DOM_ROLE.groupHeader)}, ` : ""
      }${roleSelector(DOM_ROLE.groupItems)}, ${roleSelector(
        DOM_ROLE.folderItems,
      )}`,
    ),
  );
  let dropAreas = calculateFoldersDropAreas(folderEls, true);

  let prevBoxToDrop: HTMLElement | undefined = undefined;
  let prevHighlightedGroup: HTMLElement | undefined = undefined;
  let currentDropArea: DropArea | undefined = undefined;
  let indexToDrop: number;
  let targetFolderId: number;

  const onViewportScrolled = () => {
    // recalculate drop areas if viewport was scrolled
    dropAreas = calculateFoldersDropAreas(folderEls, true);
  };

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
        e.clientY + "px"
      })`;

      // find target position
      const dropArea = getOverlappedDropArea(dropAreas, e);
      currentDropArea = dropArea;
      const curBoxToDrop = dropArea ? dropArea.element : undefined;
      if (curBoxToDrop !== prevBoxToDrop) {
        if (prevHighlightedGroup) {
          delete prevHighlightedGroup.dataset.dropTarget;
        }
        prevHighlightedGroup = undefined;

        if (curBoxToDrop) {
          if (dropArea?.insertAtEnd) {
            placeholder.remove();
            prevHighlightedGroup =
              (curBoxToDrop.closest(
                roleSelector(DOM_ROLE.folderGroup),
              ) as HTMLElement | null) ?? undefined;
            if (prevHighlightedGroup) {
              prevHighlightedGroup.dataset.dropTarget = "true";
            }
          } else {
            curBoxToDrop.appendChild(placeholder);
          }
        } else {
          placeholder.remove();
        }
        prevBoxToDrop = curBoxToDrop;
      }
      if (curBoxToDrop && dropArea) {
        const res = getNewPlacementForItem(dropArea, e);
        targetFolderId = dropArea.objectId;
        const targetGroupId = dropArea.groupId;
        const tryAddToOriginalPos =
          !targetGroupId &&
          targetFolderId === originalFolderId &&
          inRange(res.index, originalIndex, originalIndex + targetRoots.length);
        if (tryAddToOriginalPos) {
          //actual only for isFolderItem
          placeholder.style.top = `${dropArea.itemRects[originalIndex].itemTop}px`;
          indexToDrop = originalIndex;
        } else if (dropArea.insertAtEnd) {
          placeholder.remove();
          indexToDrop = dropArea.itemRects.length;
        } else {
          placeholder.style.top = `${res.placeholderY}px`;
          indexToDrop = res.index;
        }
      }

      setScrollByDummyClientY(e.clientY);
    } else {
      if (mouseMoved) {
        if (!config.onDragStarted()) {
          unsubscribeEvents();
          return;
        }
        //create dummy
        dummy = createTabDummy(
          targetRoots,
          mouseDownEvent,
          config.isFolderItem,
        );
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
          e.clientY + "px"
        })`;
        document.body.classList.add("dragging");
        document.body.append(dummy);
        if (config.isFolderItem) {
          // currently we support drag-and-drop of single folder only
          const targetRoot = targetRoots[0];
          // here we remember only first index from all selected elements
          originalIndex = Array.from(
            targetRoot.parentElement!.parentElement!.children,
          ).indexOf(targetRoot.parentElement!);
          originalFolderId = getFolderId(
            targetRoot.parentElement!.parentElement!,
          );
        }
      }
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      document.body.classList.remove("dragging");
      dummy.remove();
      placeholder.remove();
      if (prevHighlightedGroup) {
        delete prevHighlightedGroup.dataset.dropTarget;
      }
      targetRoots.forEach((el) =>
        getDragPreviewElement(el).style.removeProperty("opacity"),
      );
      const tryAddToOriginalPos =
        !currentDropArea?.groupId &&
        targetFolderId === originalFolderId &&
        inRange(indexToDrop, originalIndex, originalIndex + targetRoots.length);
      if (prevBoxToDrop && !tryAddToOriginalPos) {
        const folderId = getFolderId(prevBoxToDrop);
        const insertBeforeItemId = currentDropArea?.insertAtEnd
          ? undefined
          : getItemIdByIndex(prevBoxToDrop, indexToDrop);
        config.onDrop(
          folderId,
          insertBeforeItemId,
          getIdsFromElements(targetRoots),
          currentDropArea?.groupId,
        );
      } else {
        config.onCancel();
      }
    } else {
      // we can click only by single element
      config.onClick(getIdsFromElements(targetRoots)[0]);
    }

    unselectAllItems();
  };

  const unsubscribeEvents = subscribeMouseEvents(
    mouseDownEvent,
    onMouseMove,
    onMouseUp,
    onViewportScrolled,
  );
  return unsubscribeEvents;
}
