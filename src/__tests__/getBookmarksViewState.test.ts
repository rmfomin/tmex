import { getBookmarksViewState } from "../newtab/components/Bookmarks/getBookmarksViewState";
import { AppState } from "../newtab/state/state";

function createAppState(): AppState {
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
            title: "Visible folder",
            items: [],
          },
          {
            id: 11,
            position: "a1",
            objectType: "folder",
            title: "Archived folder",
            archived: true,
            items: [],
          },
        ],
      },
      {
        id: 2,
        position: "b0",
        objectType: "space",
        title: "Other",
        folders: [
          {
            id: 20,
            position: "a0",
            objectType: "folder",
            title: "Searchable folder",
            items: [
              {
                id: 200,
                position: "a0",
                type: "group",
                title: "Ops",
                groupItems: [
                  {
                    id: 201,
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
    colorTheme: "light",
    sidebarHovered: false,
    page: "default",
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
    loaded: true,
    apiCommandsQueue: [],
    apiCommandId: undefined,
    apiLastError: undefined,
    undoSteps: [],
    hiddenFeatureIsEnabled: false,
  };
}

test("getBookmarksViewState uses current v3 space when search is empty", () => {
  const appState = createAppState();

  expect(getBookmarksViewState(appState)).toEqual({
    folders: [
      {
        id: 10,
        position: "a0",
        objectType: "folder",
        title: "Visible folder",
        items: [],
      },
    ],
  });
});

test("getBookmarksViewState searches through v3 folders across spaces", () => {
  const appState = createAppState();
  appState.search = "graf";

  expect(getBookmarksViewState(appState)).toEqual({
    folders: [
      {
        id: 20,
        position: "a0",
        objectType: "folder",
        title: "Searchable folder",
        items: [
          {
            id: 200,
            position: "a0",
            type: "group",
            title: "Ops",
            groupItems: [
              {
                id: 201,
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
  });
});
