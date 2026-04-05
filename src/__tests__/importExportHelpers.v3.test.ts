import { SpaceV3 } from "../newtab/helpers/types";

jest.mock("../newtab/state/actions", () => ({}));
jest.mock("../newtab/helpers/actionsHelpersWithDOM", () => ({
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

const { createExportBackupV3 } = require("../newtab/helpers/importExportHelpers");
const { normalizeBackupV3 } = require("../newtab/helpers/dataFormatAdapters");
const legacyExportFixture = require("../../docs/tech-debt/0204-1.json");

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
    isTabme: true,
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
  expect(createExportBackupV3(legacyExportFixture.spaces)).toEqual(
    normalizeBackupV3(legacyExportFixture),
  );
});
