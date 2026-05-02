import {
  getSelectedItemsElements,
  unselectAllItems,
} from "@/newtab/helpers/selectionUtils";
import {
  isSomeParentHaveClass,
  isTargetInputOrTextArea,
  isTargetSupportsDragAndDrop,
} from "@/newtab/helpers/utils";
import { Point } from "@/newtab/helpers/mathTypes";
import { processFolderDragAndDrop } from "@/newtab/helpers/dragging/processFolderDragAndDrop";
import { processItemDragAndDrop } from "@/newtab/helpers/dragging/processItemDragAndDrop";
import { processSpacesDragAndDrop } from "@/newtab/helpers/dragging/processSpacesDragAndDrop";

export type DropArea = {
  objectId: number;
  groupId?: number;
  insertAtEnd?: boolean;
  element: HTMLElement;
  rect: DOMRect;
  itemRects: { thresholdY: number; itemTop: number; itemHeight: number }[];
};

export type PConfigItem = {
  isFolderItem: boolean; // otherwise we drag-and-drop from sidebar
  onDrop: (
    folderId: number,
    insertBeforeItemId: number | undefined,
    targetsIds: number[],
    targetGroupId?: number
  ) => void;
  onCancel: () => void;
  onClick: (targetId: number) => void;
  onDragStarted: () => boolean; // return false to prevent action. Previously was named canDrag()
};

export type PConfigFolder = {
  onDrop: (
    draggedFolderId: number,
    targetSpaceId: number | undefined,
    insertBeforeFolderId: number | undefined
  ) => void;
  onCancel: () => void;
  onChangeSpace: (spaceId: number) => void;
  onDragStarted: () => boolean; // return false to prevent action. Previously was named canDrag()
};

export type PConfigSpaces = {
  onChangeSpacePosition: (spaceId: number, newPosition: string) => void;
  canSortSpaces: () => boolean;
};

export function bindDADItemEffect(
  mouseDownEvent: React.MouseEvent,
  itemConfig: PConfigItem,
  folderConfig?: PConfigFolder,
  spacesConfig?: PConfigSpaces
) {
  const target = mouseDownEvent.target as HTMLElement;
  const targetRoot = findRootOfDraggableItem(target);
  const clickOnUIElement = isSomeParentHaveClass(target, [
    "dropdown-menu",
    "modal-wrapper",
  ]);
  const targetFolderHeader = findRootOfDraggableFolder(target);

  if (isTargetInputOrTextArea(target) || clickOnUIElement) {
    return;
  }

  if (mouseDownEvent.button === 0) {
    // LEFT_CLICK
    if (targetRoot) {
      // checking if we start d&d one of selected item
      let targetRoots = [targetRoot];
      if (getSelectedItemsElements().includes(targetRoot)) {
        targetRoots = getSelectedItemsElements();
      }
      return processItemDragAndDrop(mouseDownEvent, itemConfig, targetRoots);
    } else if (targetFolderHeader && folderConfig) {
      unselectAllItems();
      return processFolderDragAndDrop(
        mouseDownEvent,
        folderConfig,
        targetFolderHeader.parentElement!
      );
    } else if (
      spacesConfig &&
      isSomeParentHaveClass(target, "spaces-list__item")
    ) {
      if (
        !isSomeParentHaveClass(target, "spaces-list__delete-button") &&
        spacesConfig.canSortSpaces()
      ) {
        processSpacesDragAndDrop(mouseDownEvent, spacesConfig);
      }
    }
  }
}

const FOLDER_TOP_OFFSET = 50;
const FOLDER_BOTTOM_OFFSET = 20;

export function getOverlappedDropArea(
  dropAreas: DropArea[],
  e: MouseEvent
): DropArea | undefined {
  const realRectAreas = dropAreas.filter((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top < e.clientY &&
      e.clientY < da.rect.bottom
    );
  });

  if (realRectAreas.length > 0) {
    return realRectAreas.sort(compareDropAreasByPriority)[0];
  }

  const overlappedAreas = dropAreas.filter((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top - FOLDER_TOP_OFFSET < e.clientY &&
      e.clientY < da.rect.bottom + FOLDER_BOTTOM_OFFSET
    );
  });

  return overlappedAreas.sort(compareDropAreasByPriority)[0];
}

function compareDropAreasByPriority(a: DropArea, b: DropArea): number {
  return a.rect.width * a.rect.height - b.rect.width * b.rect.height;
}

export function getOverlappedSpaceDropArea(
  dropAreas: DropArea[],
  e: MouseEvent
): DropArea | undefined {
  return dropAreas.find((da) => {
    return (
      da.rect.left < e.clientX &&
      e.clientX < da.rect.right &&
      da.rect.top < e.clientY &&
      e.clientY < da.rect.bottom
    );
  });
}

export function getNewPlacementForItem(
  dropArea: DropArea,
  e: MouseEvent
): { placeholderY: number; index: number } {
  const deltaY = e.clientY - dropArea.rect.y;

  const index = dropArea.itemRects.findIndex((r) => deltaY < r.thresholdY);
  if (index === -1) {
    const len = dropArea.itemRects.length;
    return {
      index: len,
      placeholderY:
        len > 0
          ? dropArea.itemRects[len - 1].itemTop +
            dropArea.itemRects[len - 1].itemHeight
          : 0,
    };
  } else {
    return {
      index,
      placeholderY: dropArea.itemRects[index].itemTop,
    };
  }
}

/**
 * "undefined" result means we should insert Folder to the very end
 */
export function calculateTargetInsertBeforeFolderId(
  dropAreas: DropArea[],
  dropArea: DropArea,
  insertBefore: boolean
): number | undefined {
  if (insertBefore) {
    return dropArea.objectId;
  } else {
    const indexOfNextDropArea = dropAreas.indexOf(dropArea) + 1;
    return indexOfNextDropArea < dropAreas.length
      ? dropAreas[indexOfNextDropArea].objectId
      : undefined;
  }
}

function findRootOfDraggableFolder(
  targetElement: HTMLElement
): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null;
  }

  if (isDraggableFolderHeader(targetElement)) {
    return targetElement;
  }

  if (isDraggableFolderHeader(targetElement.parentElement)) {
    return targetElement.parentElement;
  }

  return null;
}

function findRootOfDraggableItem(
  targetElement: HTMLElement
): HTMLElement | null {
  if (doStopPropagation(targetElement)) {
    return null;
  }

  if (isDraggableItemRoot(targetElement)) {
    return targetElement;
  }
  if (isDraggableItemRoot(targetElement.parentElement)) {
    return targetElement.parentElement;
  }
  if (
    targetElement.parentElement &&
    isDraggableItemRoot(targetElement.parentElement.parentElement)
  ) {
    return targetElement.parentElement.parentElement;
  }
  return null;
}

function isDraggableItemRoot(targetElement: HTMLElement | null): boolean {
  return targetElement
    ? targetElement.classList.contains("draggable-item")
    : false;
}

export function isDraggableFolderHeader(
  targetElement: HTMLElement | null
): boolean {
  return targetElement
    ? targetElement.classList.contains("draggable-folder")
    : false;
}

export function doStopPropagation(targetElement: HTMLElement | null): boolean {
  return isSomeParentHaveClass(targetElement, "stop-dad-propagation");
}

export function getFolderId(dropAreaElement: HTMLElement): number {
  return getDropAreaFolderId(dropAreaElement);
}

export function getDropAreaFolderId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.folderId!);
}

export function getDropAreaGroupId(
  dropAreaElement: HTMLElement
): number | undefined {
  const groupId = dropAreaElement.dataset.groupId;
  return groupId ? parseInt(groupId, 10) : undefined;
}

export function getSpaceId(dropAreaElement: HTMLElement): number {
  return parseInt(dropAreaElement.dataset.spaceId!);
}

export function getPosFromElement(el: HTMLElement): Point {
  return {
    x: parseFloat(el.style.left),
    y: parseFloat(el.style.top),
  };
}

export function getIdsFromElements(targets: HTMLElement[]): number[] {
  return targets.map(getIdFromElement);
}

export function getIdFromElement(target: HTMLElement): number {
  return parseInt(target.dataset.id!, 10);
}

export function getItemIdByIndex(
  currentBoxToDrop: HTMLElement,
  index: number
): number | undefined {
  const children = currentBoxToDrop.children;
  if (index >= children.length) {
    return undefined; //means paste last
  } else {
    const child = children.item(index)!;
    const item = child.querySelector(
      ":scope > .folder-item__inner, :scope > .folder-group__header"
    ) as HTMLElement;
    return parseInt(item.dataset.id!, 10);
  }
}

export function createTabDummy(
  targetRoots: HTMLElement[],
  mouseDownEvent: React.MouseEvent,
  isFolderItem: boolean
): HTMLElement {
  const dummy = document.createElement("div");
  targetRoots.forEach((selectedEl) => {
    const previewEl = getDragPreviewElement(selectedEl);
    const clonedNode = previewEl.cloneNode(true) as HTMLElement;
    clonedNode.classList.add("folder-item__inner--selected");
    dummy.append(clonedNode);
    if (isFolderItem) {
      previewEl.style.opacity = "0";
    }
  });
  const rect = getDragPreviewElement(targetRoots[0]).getBoundingClientRect();
  dummy.style.width = `${rect.width + 4}px`;
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`;
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`;
  dummy.classList.add("dad-dummy");
  if (isFolderItem) {
    dummy.classList.add("dad-dummy--folder-item");
  }

  return dummy;
}

export function getDragPreviewElement(targetRoot: HTMLElement): HTMLElement {
  if (targetRoot.classList.contains("folder-group__header")) {
    return targetRoot.parentElement!;
  }

  return targetRoot;
}

export function calculateFoldersDropAreas(
  folderEls: Element[],
  calcItemRects = false
): DropArea[] {
  return folderEls.map((el) => ({
    objectId: getDropAreaFolderId(el as HTMLElement),
    groupId: getDropAreaGroupId(el as HTMLElement),
    insertAtEnd: (el as HTMLElement).dataset.dropInsert === "end",
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: calcItemRects
      ? Array.from(el.children).map((item) => {
          //todo support grid
          const offsetTop = (item as HTMLElement).offsetTop;
          return {
            thresholdY: offsetTop + item.clientHeight / 2,
            itemTop: offsetTop,
            itemHeight: item.clientHeight,
          };
        })
      : null!,
  }));
}

export function calculateSpacesDropAreas(): DropArea[] {
  const spacesEls = Array.from(document.querySelectorAll(".spaces-list__item"));
  return spacesEls.map((el) => ({
    objectId: getSpaceId(el as HTMLElement),
    element: el as HTMLElement,
    rect: el.getBoundingClientRect(),
    itemRects: null!,
  }));
}

export function createFolderDummy(
  targetRoot: HTMLElement,
  mouseDownEvent: React.MouseEvent
): HTMLElement {
  // targetRoot.style.opacity = `0.4`
  const dummy = document.createElement("div");
  dummy.append(targetRoot.cloneNode(true));
  dummy.style.opacity = "0.8";
  const itemsBoxEl = dummy.querySelector<HTMLElement>(".folder-items-box")!;
  itemsBoxEl.style.visibility = "hidden";

  const rect = targetRoot.getBoundingClientRect();
  // dummy.style.width = `${rect.width + 4}px`
  dummy.style.marginTop = `${rect.top - mouseDownEvent.clientY}px`;
  dummy.style.marginLeft = `${rect.left - mouseDownEvent.clientX}px`;
  dummy.classList.add("dad-dummy");
  return dummy;
}

export function createPlaceholder(forItem: boolean) {
  const dummy = document.createElement("div");
  dummy.classList.add(
    forItem ? "bm-item-placeholder" : "bm-folder-placeholder"
  );
  return dummy;
}
