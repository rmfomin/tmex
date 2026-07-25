export {};

jest.mock("@/newtab/state/storage", () => ({
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
const { applyTheme } = require("@/newtab/state/storage");
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
        title: "Main",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Folder",
            collapsed: false,
            items: [
              {
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
                    title: "Nested",
                    url: "https://nested.example",
                    favIconUrl: "https://nested.example/favicon.ico",
                  },
                ],
              },
            ],
            color: "#ffcc00",
          },
        ],
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
    loaded: true,
    page: "default",
    hiddenFeatureIsEnabled: false,
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

test("UpdateFolder toggles folder collapsed flag", () => {
  const result = stateReducer(createState(), {
    type: Action.UpdateFolder,
    folderId: 10,
    collapsed: true,
  });

  expect(result.spaces[0].folders[0].collapsed).toBe(true);
});

test("UpdateFolderItem toggles group collapsed flag by group item id", () => {
  const result = stateReducer(createState(), {
    type: Action.UpdateFolderItem,
    itemId: 100,
    collapsed: false,
  });

  expect(result.spaces[0].folders[0].items).toEqual([
    expect.objectContaining({
      id: 100,
      type: "group",
      collapsed: false,
    }),
  ]);
});

test("SetColorTheme stores selected theme and applies it", () => {
  const result = stateReducer(createState(), {
    type: Action.SetColorTheme,
    colorTheme: "system",
  });

  expect(result.colorTheme).toBe("system");
  expect(applyTheme).toHaveBeenCalledWith("system");
});
