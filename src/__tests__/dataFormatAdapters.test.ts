import {
  convertBookmarkPatchV3ToLegacy,
  convertLegacySpacesToV3Backup,
  convertFolderPatchV3ToLegacy,
  convertFolderV3ToLegacy,
  convertV3BackupToLegacySpaces,
  normalizeBackupV3,
} from "@/newtab/helpers/dataFormatAdapters";
import { DataBackupV3, FolderV3 } from "@/newtab/helpers/types";

test("legacy round-trip is lossy for groups and collapsed flags", () => {
  const backup: DataBackupV3 = {
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Work",
        folders: [
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "Pinned",
            color: "#abcdef",
            collapsed: true,
            items: [
              {
                id: 100,
                position: "a0",
                type: "group",
                title: "Infra",
                objectType: "group",
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
  };

  const legacySpaces = convertV3BackupToLegacySpaces(backup);
  const result = convertLegacySpacesToV3Backup(legacySpaces);

  expect(result).not.toEqual(backup);
  expect(result.spaces[0].folders[0].collapsed).toBeUndefined();
  expect(result.spaces[0].folders[0].items).toEqual([
    {
      id: 101,
      position: "a0",
      title: "Grafana",
      type: "bookmark",
      objectType: "bookmark",
      url: "https://grafana.example",
      favIconUrl: "https://grafana.example/favicon.ico",
    },
  ]);
});

test("legacy compatibility folder serializer is explicit and lossy by design", () => {
  const folder: FolderV3 = {
    id: 10,
    position: "a0",
    objectType: "folder",
    title: "Pinned",
    color: "#abcdef",
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
  };

  expect(convertFolderV3ToLegacy(folder)).toEqual({
    id: 10,
    position: "a0",
    title: "Pinned",
    color: "#abcdef",
    items: [
      {
        id: 101,
        position: "a0",
        title: "Grafana",
        url: "https://grafana.example",
        favIconUrl: "https://grafana.example/favicon.ico",
      },
    ],
  });
});

test("legacy compatibility patch serializers strip v3-only fields", () => {
  expect(
    convertFolderPatchV3ToLegacy({
      title: "Renamed",
      collapsed: true,
      color: "#abcdef",
    })
  ).toEqual({
    title: "Renamed",
    color: "#abcdef",
    archived: undefined,
    twoColumn: undefined,
    position: undefined,
  });

  expect(
    convertBookmarkPatchV3ToLegacy({
      title: "New title",
      collapsed: true,
      favIconUrl: "https://icon.example/favicon.ico",
    })
  ).toEqual({
    title: "New title",
    archived: undefined,
    url: undefined,
    favIconUrl: "https://icon.example/favicon.ico",
  });
});

test("normalizeBackupV3 sorts all nested collections by position", () => {
  const backup: DataBackupV3 = {
    isTablo: true,
    version: 3,
    spaces: [
      {
        id: 2,
        position: "z0",
        objectType: "space",
        title: "Later",
        folders: [
          {
            id: 20,
            position: "z0",
            objectType: "folder",
            title: "Later folder",
            items: [
              {
                id: 200,
                position: "z0",
                type: "bookmark",
                title: "Later item",
                url: "https://later.example",
                favIconUrl: "",
              },
            ],
          },
        ],
      },
      {
        id: 1,
        position: "a0",
        objectType: "space",
        title: "Earlier",
        folders: [
          {
            id: 11,
            position: "z0",
            objectType: "folder",
            title: "Second folder",
            items: [
              {
                id: 111,
                position: "z0",
                type: "bookmark",
                title: "Second item",
                url: "https://second.example",
                favIconUrl: "",
              },
            ],
          },
          {
            id: 10,
            position: "a0",
            objectType: "folder",
            title: "First folder",
            items: [
              {
                id: 101,
                position: "z0",
                type: "group",
                title: "Grouped",
                groupItems: [
                  {
                    id: 1012,
                    position: "z0",
                    type: "bookmark",
                    title: "Second grouped item",
                    url: "https://group-second.example",
                    favIconUrl: "",
                  },
                  {
                    id: 1011,
                    position: "a0",
                    type: "bookmark",
                    title: "First grouped item",
                    url: "https://group-first.example",
                    favIconUrl: "",
                  },
                ],
              },
              {
                id: 100,
                position: "a0",
                type: "bookmark",
                title: "First item",
                url: "https://first.example",
                favIconUrl: "",
              },
            ],
          },
        ],
      },
    ],
  };

  const result = normalizeBackupV3(backup);

  expect(result.spaces.map((space) => space.title)).toEqual([
    "Earlier",
    "Later",
  ]);
  expect(result.spaces[0].folders.map((folder) => folder.title)).toEqual([
    "First folder",
    "Second folder",
  ]);
  expect(result.spaces[0].folders[0].items.map((item) => item.title)).toEqual([
    "First item",
    "Grouped",
  ]);
  const groupedItem = result.spaces[0].folders[0].items[1];
  expect(groupedItem.type).toBe("group");
  expect(
    groupedItem.type === "group"
      ? groupedItem.groupItems.map((item) => item.title)
      : []
  ).toEqual(["First grouped item", "Second grouped item"]);
});
