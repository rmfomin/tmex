const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(global, "__OVERRIDE_NEWTAB", {
  value: false,
  configurable: true,
});

Object.defineProperty(global, "BroadcastChannel", {
  value: class {
    postMessage() {}
    close() {}
  },
  configurable: true,
});

const storageGet = jest.fn();
const storageSet = jest.fn((_: unknown, callback?: () => void) => callback?.());

Object.defineProperty(global, "chrome", {
  value: {
    storage: {
      local: {
        get: storageGet,
        set: storageSet,
      },
    },
  },
  configurable: true,
});

Object.defineProperty(global, "window", {
  value: {
    matchMedia: () => ({
      matches: false,
      addEventListener() {},
      removeEventListener() {},
    }),
  },
  configurable: true,
});

import { SpaceV3 } from "@/newtab/helpers/types";
import {
  getStateFromLS,
  normalizeStateFromStorageResult,
  saveStateThrottled,
} from "@/newtab/state/storage";

test("normalizeStateFromStorageResult resets pre-v3 storage to empty local state", () => {
  const result = normalizeStateFromStorageResult({
    spaces: [
      {
        id: 1,
        position: "a0",
        title: "Legacy space",
        folders: [],
      },
    ],
    version: 2,
    currentSpaceId: 1,
  } as any);

  expect(result.version).toBe(3);
  expect(result.currentSpaceId).toBeUndefined();
  expect(result.spaces).toEqual([]);
});

test("normalizeStateFromStorageResult normalizes v3 spaces with missing item objectType", () => {
  const result = normalizeStateFromStorageResult({
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Folder",
            collapsed: true,
            items: [
              {
                id: 100,
                position: "a0",
                type: "group",
                title: "Group",
                collapsed: true,
                groupItems: [
                  {
                    id: 101,
                    position: "a0",
                    type: "bookmark",
                    title: "Grafana",
                    url: "https://grafana.example",
                    favIconUrl: "https://grafana.example/favicon.ico",
                  },
                ],
              },
            ],
          },
        ],
      } satisfies SpaceV3,
    ],
    version: 3,
  } as any);

  expect(result.spaces[0].folders[0].items[0]).toEqual({
    id: 100,
    position: "a0",
    type: "group",
    objectType: "group",
    title: "Group",
    collapsed: true,
    groupItems: [
      {
        id: 101,
        position: "a0",
        type: "bookmark",
        objectType: "bookmark",
        title: "Grafana",
        url: "https://grafana.example",
        favIconUrl: "https://grafana.example/favicon.ico",
      },
    ],
  });
});

test("normalizeStateFromStorageResult rejects structurally invalid v3 spaces", () => {
  const result = normalizeStateFromStorageResult({
    version: 3,
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        title: "Missing space object type",
        folders: [],
      },
    ],
  } as any);

  expect(result.currentSpaceId).toBeUndefined();
  expect(result.spaces).toEqual([]);
});

test("normalizeStateFromStorageResult falls back to defaults for empty storage", () => {
  const result = normalizeStateFromStorageResult({});

  expect(result.version).toBe(3);
  expect(result.spaces).toEqual([]);
  expect(result.sidebarCollapsed).toBe(false);
  expect(result.openBookmarksInNewTab).toBe(true);
  expect(result.colorTheme).toBe("system");
  expect("currentWhatsNew" in result).toBe(false);
});

test("normalizeStateFromStorageResult normalizes missing color theme to system", () => {
  const result = normalizeStateFromStorageResult({
    colorTheme: undefined,
  } as any);

  expect(result.colorTheme).toBe("system");
});

test("getStateFromLS rewrites nested remote fields as canonical local state", () => {
  storageSet.mockClear();
  storageGet.mockImplementation((_: unknown, callback: (state: unknown) => void) =>
    callback({
      version: 3,
      currentSpaceId: 1,
      spaces: [
        {
          id: 1,
          remoteId: 10,
          position: "a0",
          objectType: "space",
          title: "Main",
          folders: [
            {
              id: 2,
              remoteId: 20,
              position: "a0",
              objectType: "folder",
              title: "Folder",
              items: [
                {
                  id: 3,
                  remoteId: 30,
                  position: "a0",
                  type: "bookmark",
                  title: "Bookmark",
                  url: "https://example.com",
                  favIconUrl: "",
                },
              ],
            },
          ],
        },
      ],
    })
  );

  getStateFromLS(() => undefined);

  expect(storageSet).toHaveBeenCalledTimes(1);
  expect(storageSet.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      version: 3,
      spaces: [
        {
          id: 1,
          position: "a0",
          objectType: "space",
          title: "Main",
          folders: [
            {
              id: 2,
              position: "a0",
              objectType: "folder",
              title: "Folder",
              items: [
                {
                  id: 3,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Bookmark",
                  url: "https://example.com",
                  favIconUrl: "",
                },
              ],
            },
          ],
        },
      ],
    })
  );
});

test("saveStateThrottled writes canonical local spaces", () => {
  jest.useFakeTimers();
  storageSet.mockClear();

  saveStateThrottled({
    version: 3,
    spaces: [
      {
        id: 1,
        remoteId: 10,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
  } as any);
  jest.runOnlyPendingTimers();
  jest.useRealTimers();

  expect(storageSet).toHaveBeenCalledTimes(1);
  expect(storageSet.mock.calls[0][0]).toEqual(
    expect.objectContaining({
      version: 3,
      spaces: [
        {
          id: 1,
          position: "a0",
          objectType: "space",
          title: "Main",
          folders: [],
        },
      ],
    })
  );
});
