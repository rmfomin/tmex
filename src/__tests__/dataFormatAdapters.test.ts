import {
  convertBookmarkPatchV3ToLegacy,
  convertLegacySpacesToV3Backup,
  convertFolderPatchV3ToLegacy,
  convertFolderV3ToLegacy,
  convertV3BackupToLegacySpaces,
} from "../newtab/helpers/dataFormatAdapters";
import { DataBackupV3, FolderV3 } from "../newtab/helpers/types";

test("legacy round-trip is lossy for groups and collapsed flags", () => {
  const backup: DataBackupV3 = {
    isTabme: true,
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
        widgets: [],
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
    }),
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
    }),
  ).toEqual({
    title: "New title",
    archived: undefined,
    url: undefined,
    favIconUrl: "https://icon.example/favicon.ico",
  });
});
