let onMouseMove: ((event: MouseEvent, mouseMoved: boolean) => void) | undefined;

const dropArea = {
  objectId: 20,
  element: {
    parentElement: {
      children: [],
    },
    getBoundingClientRect: jest.fn(),
  },
  rect: { left: 0, width: 200 },
};

jest.mock("@/newtab/feature/dragging/dragAndDropUtils", () => ({
  setScrollByDummyClientY: jest.fn(),
  subscribeMouseEvents: jest.fn(
    (_event, onMove: (event: MouseEvent, mouseMoved: boolean) => void) => {
      onMouseMove = onMove;
      return jest.fn();
    }
  ),
}));

jest.mock("@/newtab/helpers/selectionUtils", () => ({
  unselectAllItems: jest.fn(),
}));

jest.mock("@/newtab/feature/dragging/dragAndDrop", () => ({
  calculateFoldersDropAreas: jest.fn(() => [dropArea]),
  calculateSpacesDropAreas: jest.fn(() => []),
  calculateTargetInsertBeforeFolderId: jest.fn(),
  createDropPreview: jest.fn(() => [{}]),
  createFolderDummy: jest.fn(() => ({ style: {} })),
  getFolderId: jest.fn(() => 10),
  getOverlappedDropArea: jest.fn(() => dropArea),
  getOverlappedSpaceDropArea: jest.fn(),
  placeDropPreview: jest.fn(),
  removeDropPreview: jest.fn(),
  setDragSourceHidden: jest.fn(() => jest.fn()),
}));

import { placeDropPreview } from "@/newtab/feature/dragging/dragAndDrop";
import { processFolderDragAndDrop } from "@/newtab/feature/dragging/processFolderDragAndDrop";

test("first drag movement renders folder preview at current cursor position", () => {
  const body = {
    classList: { add: jest.fn(), remove: jest.fn() },
    append: jest.fn(),
  };
  (global as any).document = {
    body,
    querySelectorAll: jest.fn(() => []),
  };

  processFolderDragAndDrop(
    { clientX: 0, clientY: 0 } as React.MouseEvent,
    {
      onChangeSpace: jest.fn(),
      onDragStarted: jest.fn(() => true),
      onCancel: jest.fn(),
      onDrop: jest.fn(),
    },
    ({ dataset: {}, style: {} } as unknown) as HTMLElement
  );

  onMouseMove!({ clientX: 100, clientY: 100 } as MouseEvent, true);

  expect(placeDropPreview).toHaveBeenCalledTimes(1);
});
