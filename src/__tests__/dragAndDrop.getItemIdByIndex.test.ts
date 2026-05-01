jest.mock("@/newtab/helpers/selectionUtils", () => ({
  getSelectedItemsElements: jest.fn(() => []),
  unselectAllItems: jest.fn(),
}));

jest.mock("@/newtab/helpers/dragging/processFolderDragAndDrop", () => ({
  processFolderDragAndDrop: jest.fn(),
}));

jest.mock("@/newtab/helpers/dragging/processItemDragAndDrop", () => ({
  processItemDragAndDrop: jest.fn(),
}));

jest.mock("@/newtab/helpers/dragging/processSpacesDragAndDrop", () => ({
  processSpacesDragAndDrop: jest.fn(),
}));

import { getItemIdByIndex } from "@/newtab/helpers/dragging/dragAndDrop";

test("getItemIdByIndex returns group id for top-level group drop target", () => {
  const groupEl = {
    querySelector: jest.fn((selector: string) => {
      if (selector.includes(".folder-group__header")) {
        return { dataset: { id: "100" } };
      }
      if (selector.includes(".folder-item__inner")) {
        return { dataset: { id: "101" } };
      }
      return undefined;
    }),
  };
  const folderItemsBox = ({
    children: {
      length: 1,
      item: jest.fn(() => groupEl),
    },
  } as unknown) as HTMLElement;

  expect(getItemIdByIndex(folderItemsBox, 0)).toBe(100);
});

test("getItemIdByIndex returns bookmark id for top-level bookmark drop target", () => {
  const bookmarkEl = {
    querySelector: jest.fn(() => ({ dataset: { id: "102" } })),
  };
  const folderItemsBox = ({
    children: {
      length: 1,
      item: jest.fn(() => bookmarkEl),
    },
  } as unknown) as HTMLElement;

  expect(getItemIdByIndex(folderItemsBox, 0)).toBe(102);
});
