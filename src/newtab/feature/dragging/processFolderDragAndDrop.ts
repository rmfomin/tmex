import {
  calculateFoldersDropAreas,
  calculateSpacesDropAreas,
  calculateTargetInsertBeforeFolderId,
  createDropPreview,
  createFolderDummy,
  DropArea,
  getFolderId,
  getOverlappedDropArea,
  getOverlappedSpaceDropArea,
  placeDropPreview,
  PConfigFolder,
  removeDropPreview,
  setDragSourceHidden,
} from "@/newtab/feature/dragging/dragAndDrop";
import {
  setScrollByDummyClientY,
  subscribeMouseEvents,
} from "@/newtab/feature/dragging/dragAndDropUtils";
import { DOM_ROLE, roleSelector } from "@/newtab/helpers/domRoles";

export function processFolderDragAndDrop(
  mouseDownEvent: React.MouseEvent,
  config: PConfigFolder,
  targetRoot: HTMLElement
) {
  let dummy: undefined | HTMLElement = undefined;
  let previews: HTMLElement[] = [];
  let previewContainer: HTMLElement | undefined = undefined;
  let previewIndex: number | undefined = undefined;
  let restoreSource = () => {};
  const folderEls = Array.from(
    document.querySelectorAll(
      `${roleSelector(DOM_ROLE.folder)}:not([data-folder-new="true"])`
    )
  );
  let dropFoldersAreas = calculateFoldersDropAreas(folderEls);
  let dropSpacesAreas = calculateSpacesDropAreas();
  let prevSpaceDropArea: DropArea | undefined = undefined;
  let dropArea: DropArea | undefined = undefined;
  const draggingFolderId = getFolderId(targetRoot);
  let targetInsertBeforeFolderId: number | undefined;
  let lastSelectedSpaceId: number | undefined;

  const clearPreview = () => {
    removeDropPreview(previews);
    previews = [];
    previewContainer = undefined;
    previewIndex = undefined;
  };

  const onViewportScrolled = () => {
    const folderEls = Array.from(
      document.querySelectorAll(
        `${roleSelector(DOM_ROLE.folder)}:not([data-folder-new="true"])`
      )
    );
    dropFoldersAreas = calculateFoldersDropAreas(folderEls);
  };

  const onMouseMove = (e: MouseEvent, mouseMoved: boolean) => {
    if (dummy) {
      // move dummy
      dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
        e.clientY + "px"
      })`;

      const spaceDropArea = getOverlappedSpaceDropArea(dropSpacesAreas, e);

      if (spaceDropArea) {
        if (spaceDropArea !== prevSpaceDropArea) {
          prevSpaceDropArea = spaceDropArea;
          config.onChangeSpace(spaceDropArea.objectId);
          lastSelectedSpaceId = spaceDropArea.objectId;
          requestAnimationFrame(onViewportScrolled); // to recalculate dropFoldersAreas
        }
        clearPreview();
        dropArea = undefined;
      } else {
        prevSpaceDropArea = undefined;
        dropArea = getOverlappedDropArea(dropFoldersAreas, e);
        if (dropArea) {
          const insertBefore =
            e.clientX < dropArea.rect.left + dropArea.rect.width / 2;
          targetInsertBeforeFolderId = calculateTargetInsertBeforeFolderId(
            dropFoldersAreas,
            dropArea,
            insertBefore
          );

          if (dropArea.objectId !== draggingFolderId) {
            const container = dropArea.element.parentElement;
            if (container) {
              const targetIndex = Array.from(container.children)
                .filter(
                  (child) =>
                    (child as HTMLElement).dataset.dadPreview !== "true"
                )
                .indexOf(dropArea.element);
              const nextPreviewIndex = targetIndex + (insertBefore ? 0 : 1);
              if (
                container !== previewContainer ||
                nextPreviewIndex !== previewIndex
              ) {
                clearPreview();
                previews = createDropPreview([targetRoot]);
                placeDropPreview(container, previews, nextPreviewIndex);
                previewContainer = container;
                previewIndex = nextPreviewIndex;
              }
            }
          } else {
            clearPreview();
          }
        } else {
          clearPreview();
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
        dummy = createFolderDummy(targetRoot, mouseDownEvent);
        dummy.style.transform = `translateX(${e.clientX + "px"}) translateY(${
          e.clientY + "px"
        })`;
        restoreSource = setDragSourceHidden([targetRoot]);
        document.body.classList.add("dragging");
        document.body.append(dummy);
        onMouseMove(e, true);
      }
    }
  };
  const onMouseUp = () => {
    if (dummy) {
      document.body.classList.remove("dragging");
      dummy.remove();
      clearPreview();
      restoreSource();
      if (dropArea) {
        config.onDrop(
          draggingFolderId,
          lastSelectedSpaceId,
          targetInsertBeforeFolderId
        );
      } else {
        config.onCancel();
      }
    }
  };

  const unsubscribeEvents = subscribeMouseEvents(
    mouseDownEvent,
    onMouseMove,
    onMouseUp,
    onViewportScrolled
  );
  return unsubscribeEvents;
}
