import { SpaceV3 } from "@/newtab/helpers/types";

jest.mock("@/newtab/state/actions", () => ({}));
jest.mock("@/newtab/helpers/actionsHelpersWithDOM", () => ({
  showMessage: jest.fn(),
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

const {
  createExportBackupV3,
  createExportSpaceBackupV3,
  importFromJson,
  importSpaceFromJson,
} = require("../newtab/helpers/importExportHelpers");
const { normalizeBackupV3 } = require("../newtab/helpers/dataFormatAdapters");
const legacyExportFixture = require("../../docs/tech-debt/02apr.json");

function mockFileReaderWithContents(fileContents: string) {
  Object.defineProperty(global, "FileReader", {
    value: class {
      onload: ((event: { target: { result: string } }) => void) | null = null;

      readAsText() {
        this.onload?.({ target: { result: fileContents } });
      }
    },
    configurable: true,
  });
}

test("createExportBackupV3 preserves grouped and collapsed v3 structure", () => {
  const spaces: SpaceV3[] = [
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
          color: "#ffcc00",
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
    },
  ];

  expect(createExportBackupV3(spaces)).toEqual({
    isTablo: true,
    version: 3,
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
            color: "#ffcc00",
            collapsed: true,
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
  });
});

test("createExportBackupV3 is compatible with the committed v3 backup fixture", () => {
  expect(createExportBackupV3(legacyExportFixture.spaces).spaces).toEqual(
    normalizeBackupV3(legacyExportFixture).spaces
  );
});

test("createExportSpaceBackupV3 exports one normalized v3 space", () => {
  const space: SpaceV3 = {
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
            type: "group",
            title: "Group",
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
  };

  expect(createExportSpaceBackupV3(space)).toEqual({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
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
              type: "group",
              objectType: "group",
              title: "Group",
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
      ],
    },
  });
});

test("importFromJson accepts legacy tabme-branded v3 backups", () => {
  const dispatch = jest.fn();
  const fileContents = JSON.stringify({
    isTabme: true,
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
  });

  mockFileReaderWithContents(fileContents);

  importFromJson(
    {
      target: {
        files: [{}],
      },
    },
    dispatch
  );

  expect(dispatch).toHaveBeenCalledWith({
    type: "init-dashboard",
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Main",
        folders: [],
      },
    ],
    saveToLS: true,
  });
  expect(dispatch).toHaveBeenCalledWith({
    type: "select-space",
    spaceId: -1,
  });
});

test("importFromJson tells users to use Import space for space backups", () => {
  const dispatch = jest.fn();
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Main",
      folders: [],
    },
  });

  mockFileReaderWithContents(fileContents);

  importFromJson(
    {
      target: {
        files: [{}],
      },
    },
    dispatch
  );

  expect(dispatch).toHaveBeenCalledWith({
    type: "show-notification",
    isError: true,
    message: "This is a space backup. Use Import space button to add it.",
  });
  expect(dispatch).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: "init-dashboard" })
  );
});

test("importSpaceFromJson appends one remapped space backup", () => {
  const dispatch = jest.fn();
  const existingSpaces: SpaceV3[] = [
    {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Existing",
      folders: [],
    },
  ];
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    objectType: "space-backup",
    space: {
      id: 1,
      position: "a0",
      objectType: "space",
      title: "Imported",
      folders: [
        {
          id: 10,
          position: "a0",
          objectType: "folder",
          title: "Folder",
          remoteId: 500,
          items: [
            {
              id: 100,
              position: "a0",
              type: "group",
              objectType: "group",
              title: "Group",
              remoteId: 600,
              groupItems: [
                {
                  id: 101,
                  position: "a0",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Grafana",
                  url: "https://grafana.example",
                  favIconUrl: "https://grafana.example/favicon.ico",
                  remoteId: 700,
                },
              ],
            },
          ],
        },
      ],
    },
  });

  mockFileReaderWithContents(fileContents);

  const event = {
    target: {
      files: [{}],
      value: "space.json",
    },
  };

  importSpaceFromJson(event, dispatch, existingSpaces);

  const initAction = dispatch.mock.calls.find(
    ([action]) => action.type === "init-dashboard"
  )?.[0];
  expect(initAction.saveToLS).toBe(true);
  expect(initAction.spaces).toHaveLength(2);

  const importedSpace = initAction.spaces[1];
  const importedFolder = importedSpace.folders[0];
  const importedGroup = importedFolder.items[0];
  const importedBookmark = importedGroup.groupItems[0];

  expect(importedSpace.title).toBe("Imported");
  expect(importedSpace.id).not.toBe(1);
  expect(importedFolder.id).not.toBe(10);
  expect(importedFolder.remoteId).toBeUndefined();
  expect(importedGroup.id).not.toBe(100);
  expect(importedGroup.remoteId).toBeUndefined();
  expect(importedBookmark.id).not.toBe(101);
  expect(importedBookmark.remoteId).toBeUndefined();
  expect(event.target.value).toBe("");
  expect(dispatch).toHaveBeenCalledWith({
    type: "select-space",
    spaceId: importedSpace.id,
  });
});

test("importSpaceFromJson accepts a v3 backup with exactly one space", () => {
  const dispatch = jest.fn();
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 2,
        position: "a0",
        objectType: "space",
        title: "Single",
        folders: [],
      },
    ],
  });

  mockFileReaderWithContents(fileContents);

  importSpaceFromJson(
    {
      target: {
        files: [{}],
        value: "backup.json",
      },
    },
    dispatch,
    []
  );

  const initAction = dispatch.mock.calls.find(
    ([action]) => action.type === "init-dashboard"
  )?.[0];
  expect(initAction.spaces).toHaveLength(1);
  expect(initAction.spaces[0].title).toBe("Single");
});

test("importSpaceFromJson rejects v3 backups with multiple spaces", () => {
  const dispatch = jest.fn();
  const fileContents = JSON.stringify({
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "First",
        folders: [],
      },
      {
        id: 2,
        position: "a1",
        objectType: "space",
        title: "Second",
        folders: [],
      },
    ],
  });

  mockFileReaderWithContents(fileContents);

  importSpaceFromJson(
    {
      target: {
        files: [{}],
        value: "backup.json",
      },
    },
    dispatch,
    []
  );

  expect(dispatch).toHaveBeenCalledWith({
    type: "show-notification",
    isError: true,
    message: "Unsupported space JSON format",
  });
  expect(dispatch).not.toHaveBeenCalledWith(
    expect.objectContaining({ type: "init-dashboard" })
  );
});
