import { BookmarkItemV3 } from "@/newtab/helpers/types";
import { getGlobalAppState } from "@/newtab/components/root/App";
import { findItemById } from "@/newtab/state/actionHelpers";

let selectedItemsElements: HTMLElement[] = [];
const SELECTED_ATTR = "selected";
const FIRST_SELECTED_ATTR = "firstSelected";

export function selectItems(elements: HTMLElement[]) {
  unselectAllItems();

  elements.forEach((el: HTMLElement) => {
    el.dataset[SELECTED_ATTR] = "true";
    if (el.parentElement) {
      el.parentElement.dataset[SELECTED_ATTR] = "true";
    }
  });

  const prevSelectedElement = document.querySelector(
    `[data-first-selected="true"]`
  );
  const newFirstSelectedElement = document.querySelector(
    `[data-selected="true"]`
  );
  if (
    newFirstSelectedElement &&
    prevSelectedElement !== newFirstSelectedElement
  ) {
    (newFirstSelectedElement as HTMLElement).dataset[FIRST_SELECTED_ATTR] =
      "true";
  }
  if (prevSelectedElement) {
    delete (prevSelectedElement as HTMLElement).dataset[FIRST_SELECTED_ATTR];
  }

  selectedItemsElements = elements;
}

function unselectItemForced(el: HTMLElement) {
  delete el.dataset[SELECTED_ATTR];
  if (el.parentElement) {
    delete el.parentElement.dataset[SELECTED_ATTR];
  }
  document
    .querySelector(`[data-first-selected="true"]`)
    ?.removeAttribute("data-first-selected");
}

export function unselectAllItems() {
  selectedItemsElements.forEach((item) => unselectItemForced(item));
  selectedItemsElements.length = 0;
}

export function getSelectedItemsElements(): HTMLElement[] {
  return selectedItemsElements;
}

export function getSelectedItemsIds(): number[] {
  return selectedItemsElements.map((el) => getId(el));
}

export function getSelectedItems(): BookmarkItemV3[] {
  const state = getGlobalAppState();
  return selectedItemsElements.map((el) => findItemById(state, getId(el))!);
}

function getId(el: HTMLElement): number {
  return parseInt(el.dataset.id || "", 10);
}
