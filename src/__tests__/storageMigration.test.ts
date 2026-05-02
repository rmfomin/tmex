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
import { normalizeStateFromStorageResult } from "@/newtab/state/storage";

test("normalizeStateFromStorageResult migrates legacy v2 spaces to v3", () => {
  const result = normalizeStateFromStorageResult({
    spaces: [
      {
        id: 1,
        position: "a0",
        title: "Legacy space",
        folders: [
          {
            id: 10,
            position: "a0",
            title: "Legacy folder",
            color: "#ffcc00",
            items: [
              {
                id: 100,
                position: "a0",
                title: "Legacy item",
                url: "https://example.com",
                favIconUrl: "https://example.com/favicon.ico",
              },
            ],
          },
        ],
      },
    ],
    version: 2,
    currentSpaceId: 1,
  } as any);

  expect(result.version).toBe(3);
  expect(result.currentSpaceId).toBe(1);
  expect(result.spaces).toEqual([
    {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Legacy space",
      folders: [
        {
          id: 10,
          position: "a0",
          objectType: "folder",
          title: "Legacy folder",
          color: "#ffcc00",
          items: [
            {
              id: 100,
              position: "a0",
              type: "bookmark",
              objectType: "bookmark",
              title: "Legacy item",
              url: "https://example.com",
              favIconUrl: "https://example.com/favicon.ico",
            },
          ],
        },
      ],
    },
  ]);
});

test("normalizeStateFromStorageResult normalizes v3 spaces with missing objectType", () => {
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

test("normalizeStateFromStorageResult converts legacy section bookmarks to v3 groups", () => {
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
            items: [
              {
                id: 100,
                position: "a0",
                type: "bookmark",
                objectType: "bookmark",
                title: "Old section",
                url: "",
                favIconUrl: "",
                isSection: true,
              },
            ],
          },
        ],
      },
    ],
    version: 3,
  } as any);

  expect(result.spaces[0].folders[0].items[0]).toEqual({
    id: 100,
    position: "a0",
    type: "group",
    objectType: "group",
    title: "Old section",
    collapsed: false,
    groupItems: [],
  });
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

test("normalizeStateFromStorageResult normalizes legacy missing color theme to system", () => {
  const result = normalizeStateFromStorageResult({
    colorTheme: undefined,
  } as any);

  expect(result.colorTheme).toBe("system");
});
