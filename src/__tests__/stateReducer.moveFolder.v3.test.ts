export {};

jest.mock("../newtab/state/storage", () => ({
  applyTheme: jest.fn(),
  saveStateThrottled: jest.fn(),
  savingStateKeys: [
    "spaces",
    "currentSpaceId",
    "sidebarCollapsed",
    "openBookmarksInNewTab",
    "colorTheme",
    "showRecent",
    "showArchived",
    "showNotUsed",
    "version",
  ],
}));

jest.mock("../api/api", () => ({
  loadFromNetwork: jest.fn(() => false),
}));

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

const { stateReducer } = require("../newtab/state/actions");
const { Action } = require("../newtab/state/state");
type AppState = import("../newtab/state/state").AppState;

function createState(): AppState {
  return {
    version: 3,
    currentSpaceId: 1,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Source",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Grouped folder",
            color: "#ffcc00",
            collapsed: true,
            items: [
              {
                id: 100,
                position: "a0",
                type: "group",
                objectType: "group",
                title: "Infra",
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
              },
            ],
            twoColumn: true,
          },
        ],
        widgets: [],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Target",
        folders: [],
        widgets: [],
      },
    ],
    recentItems: [],
    tabs: [],
    currentWindowId: undefined,
    notification: { visible: false, message: "" },
    lastActiveTabIds: [],
    search: "",
    itemInEdit: undefined,
    showRecent: false,
    showArchived: false,
    showNotUsed: false,
    openBookmarksInNewTab: false,
    sidebarCollapsed: false,
    sidebarHovered: false,
    alphaMode: false,
    loaded: true,
    page: "default",
    hiddenFeatureIsEnabled: false,
    apiCommandsQueue: [],
    apiCommandId: undefined,
    apiLastError: undefined,
    undoSteps: [],
    achievements: {
      folderCreated: 0,
      folderRenamed: 0,
      folderColorChanged: 0,
      folderDeleted: 0,
      folderDragged: 0,
      itemDraggedFromSidebar: 0,
      itemRenamed: 0,
      itemCopiedUrl: 0,
      itemEditedUrl: 0,
      itemArchived: 0,
      itemUnarchived: 0,
      sectionAddedFromSidebar: 0,
      sectionAddedFromFolder: 0,
      cleanupUsed: 0,
      archivedItemsShowed: 0,
    },
    colorTheme: "light",
  };
}

test("MoveFolder between spaces preserves grouped v3 folder structure", () => {
  const result = stateReducer(createState(), {
    type: Action.MoveFolder,
    folderId: 10,
    targetSpaceId: 2,
    insertBeforeFolderId: undefined,
  });

  expect(result.spaces[0].folders).toEqual([]);
  expect(result.spaces[1].folders).toEqual([
    {
      id: 10,
      position: expect.any(String),
      objectType: "folder",
      title: "Grouped folder",
      color: "#ffcc00",
      collapsed: true,
      twoColumn: true,
      items: [
        {
          id: 100,
          position: "a0",
          type: "group",
          objectType: "group",
          title: "Infra",
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
        },
      ],
    },
  ]);
});

test("MoveFolderItems moves group as a single draggable item", () => {
  const initialState = createState();
  initialState.spaces[0].folders[0].items.push({
    id: 102,
    position: "a1",
    type: "bookmark",
    objectType: "bookmark",
    title: "Docs",
    url: "https://docs.example",
    favIconUrl: "https://docs.example/favicon.ico",
  });

  const result = stateReducer(initialState, {
    type: Action.MoveFolderItems,
    itemIds: [100],
    targetFolderId: 10,
    insertBeforeItemId: 102,
  });

  expect(result.spaces[0].folders[0].items).toEqual([
    {
      id: 100,
      position: expect.any(String),
      type: "group",
      objectType: "group",
      title: "Infra",
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
    },
    {
      id: 102,
      position: expect.any(String),
      type: "bookmark",
      objectType: "bookmark",
      title: "Docs",
      url: "https://docs.example",
      favIconUrl: "https://docs.example/favicon.ico",
    },
  ]);
});
