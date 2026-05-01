import { updateFolder, updateFolderItem } from "@/newtab/state/actionHelpers";
import { SpaceV3 } from "@/newtab/helpers/types";

function createSpacesFixture(): SpaceV3[] {
  return [
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
                  title: "Item A",
                  url: "https://a.example",
                  favIconUrl: "https://a.example/favicon.ico",
                },
                {
                  id: 102,
                  position: "a1",
                  type: "bookmark",
                  objectType: "bookmark",
                  title: "Item B",
                  url: "https://b.example",
                  favIconUrl: "https://b.example/favicon.ico",
                },
              ],
            },
          ],
        },
      ],
    },
  ];
}

test("updateFolder preserves v3-only folder and group structure", () => {
  const result = updateFolder(createSpacesFixture(), 10, {
    title: "Folder Renamed",
  });

  expect(result[0].folders[0]).toEqual({
    id: 10,
    position: "a0",
    objectType: "folder",
    title: "Folder Renamed",
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
            title: "Item A",
            url: "https://a.example",
            favIconUrl: "https://a.example/favicon.ico",
          },
          {
            id: 102,
            position: "a1",
            type: "bookmark",
            objectType: "bookmark",
            title: "Item B",
            url: "https://b.example",
            favIconUrl: "https://b.example/favicon.ico",
          },
        ],
      },
    ],
  });
});

test("updateFolderItem updates bookmark inside groupItems without flattening folder", () => {
  const result = updateFolderItem(createSpacesFixture(), 101, {
    title: "Item A Updated",
  });

  expect(result[0].folders[0].items).toEqual([
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
          title: "Item A Updated",
          url: "https://a.example",
          favIconUrl: "https://a.example/favicon.ico",
        },
        {
          id: 102,
          position: "a1",
          type: "bookmark",
          objectType: "bookmark",
          title: "Item B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
        },
      ],
    },
  ]);
});

test("updateFolderItem updates group itself without flattening nested structure", () => {
  const result = updateFolderItem(createSpacesFixture(), 100, {
    collapsed: false,
  } as any);

  expect(result[0].folders[0].items).toEqual([
    {
      id: 100,
      position: "a0",
      type: "group",
      objectType: "group",
      title: "Group",
      collapsed: false,
      groupItems: [
        {
          id: 101,
          position: "a0",
          type: "bookmark",
          objectType: "bookmark",
          title: "Item A",
          url: "https://a.example",
          favIconUrl: "https://a.example/favicon.ico",
        },
        {
          id: 102,
          position: "a1",
          type: "bookmark",
          objectType: "bookmark",
          title: "Item B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
        },
      ],
    },
  ]);
});

test("updateFolderItem renames group itself without touching nested items", () => {
  const result = updateFolderItem(createSpacesFixture(), 100, {
    title: "Infra Updated",
  } as any);

  expect(result[0].folders[0].items).toEqual([
    {
      id: 100,
      position: "a0",
      type: "group",
      objectType: "group",
      title: "Infra Updated",
      collapsed: true,
      groupItems: [
        {
          id: 101,
          position: "a0",
          type: "bookmark",
          objectType: "bookmark",
          title: "Item A",
          url: "https://a.example",
          favIconUrl: "https://a.example/favicon.ico",
        },
        {
          id: 102,
          position: "a1",
          type: "bookmark",
          objectType: "bookmark",
          title: "Item B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
        },
      ],
    },
  ]);
});
