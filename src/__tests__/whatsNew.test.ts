import {
  getAvailableWhatsNew,
  markWhatsNewAsSeen,
  WhatsNewKey,
} from "../newtab/helpers/whats-new";

const localStorageMock = {
  getItem: jest.fn<string | null, [string]>(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

beforeEach(() => {
  localStorageMock.getItem.mockReset();
  localStorageMock.setItem.mockReset();
  localStorageMock.removeItem.mockReset();
  localStorageMock.clear.mockReset();
  localStorageMock.getItem.mockImplementation(() => null);
});

test("getAvailableWhatsNew does not require beta mode", () => {
  const result = getAvailableWhatsNew();

  expect(result).toEqual(
    expect.objectContaining({
      key: WhatsNewKey.StickyNotes,
    }),
  );
});

test("markWhatsNewAsSeen stores seen key", () => {
  localStorageMock.getItem.mockReturnValue(JSON.stringify([]));

  markWhatsNewAsSeen(WhatsNewKey.StickyNotes);

  expect(localStorageMock.setItem).toHaveBeenCalledWith(
    "whatsNewSeen",
    JSON.stringify([WhatsNewKey.StickyNotes]),
  );
});
