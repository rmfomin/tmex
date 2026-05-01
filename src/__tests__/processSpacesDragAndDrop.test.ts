jest.mock("@/newtab/helpers/dragging/dragAndDropUtils", () => ({
  subscribeMouseEvents: jest.fn(),
}));

jest.mock("@/newtab/helpers/selectionUtils", () => ({
  unselectAllItems: jest.fn(),
}));

import { shouldUpdateSpaceInsertPreview } from "@/newtab/helpers/dragging/processSpacesDragAndDrop";

test("space drag preview updates when the hovered space changes", () => {
  const previous = {} as HTMLElement;
  const next = {} as HTMLElement;

  expect(
    shouldUpdateSpaceInsertPreview(previous, "before", next, "before")
  ).toBe(true);
});

test("space drag preview updates when insert side changes on the same space", () => {
  const space = {} as HTMLElement;

  expect(shouldUpdateSpaceInsertPreview(space, "before", space, "after")).toBe(
    true
  );
});

test("space drag preview stays unchanged for the same space and insert side", () => {
  const space = {} as HTMLElement;

  expect(shouldUpdateSpaceInsertPreview(space, "before", space, "before")).toBe(
    false
  );
});
