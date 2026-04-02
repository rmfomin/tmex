import {
  convertLegacySpacesToV3Backup,
  convertV3BackupToLegacySpaces,
} from "../newtab/helpers/dataFormatAdapters";
import { DataBackupV3 } from "../newtab/helpers/types";

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
