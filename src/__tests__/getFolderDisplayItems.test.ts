import { getFolderDisplayItems } from "../newtab/components/getFolderDisplayItems";
import { ItemV3 } from "../newtab/helpers/types";

test("getFolderDisplayItems flattens groups into display bookmarks", () => {
  const items: ItemV3[] = [
    {
      id: 1,
      position: "a0",
      type: "bookmark",
      title: "Top",
      url: "https://top.example",
      favIconUrl: "https://top.example/favicon.ico",
      archived: true,
      isSection: true,
    },
    {
      id: 2,
      position: "a1",
      type: "group",
      title: "Group",
      groupItems: [
        {
          id: 21,
          position: "a0",
          type: "bookmark",
          title: "Nested A",
          url: "https://a.example",
          favIconUrl: "https://a.example/favicon.ico",
        },
        {
          id: 22,
          position: "a1",
          type: "bookmark",
          title: "Nested B",
          url: "https://b.example",
          favIconUrl: "https://b.example/favicon.ico",
          archived: true,
        },
      ],
    },
  ];

  expect(getFolderDisplayItems(items)).toEqual([
    {
      id: 1,
      position: "a0",
      title: "Top",
      url: "https://top.example",
      favIconUrl: "https://top.example/favicon.ico",
      archived: true,
      isSection: true,
    },
    {
      id: 21,
      position: "a0",
      title: "Nested A",
      url: "https://a.example",
      favIconUrl: "https://a.example/favicon.ico",
      archived: undefined,
      isSection: undefined,
      inEdit: undefined,
      remoteId: undefined,
    },
    {
      id: 22,
      position: "a1",
      title: "Nested B",
      url: "https://b.example",
      favIconUrl: "https://b.example/favicon.ico",
      archived: true,
      isSection: undefined,
      inEdit: undefined,
      remoteId: undefined,
    },
  ]);
});
