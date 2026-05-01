/**
 * CAN NOT IMPORT REACT AS DEPENDENCY OR ANY DOM API
 */
import {
  BookmarkItemV3,
  FolderV3,
  GroupV3,
  LegacyFolderItem,
  FolderItemToCreate,
  ItemV3,
  SpaceV3,
} from "@/newtab/helpers/types"
import { insertBetween, sortByPosition } from "@/newtab/helpers/fractionalIndexes"
import { type AppState } from "@/newtab/state/state"
import { SECTION_ICON_BASE64 } from "@/newtab/helpers/utils"
import Tab = chrome.tabs.Tab
import HistoryItem = chrome.history.HistoryItem
import { RecentItem } from "@/newtab/helpers/recentHistoryUtils"

export function genUniqLocalId(): number {
  return (new Date()).valueOf() + Math.round(Math.random() * 10000000)
}


export type TabOrRecentData = Tab | RecentItem

export function isTabData(data: TabOrRecentData): data is Tab {
  return !(data as RecentItem).isRecent
}

export function convertTabToItem(item: Tab): FolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: item.favIconUrl || "",
    title: item.title || "",
    url: item.url || ""
  }
}

export function convertRecentToItem(item: RecentItem): FolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: item.favIconUrl ?? getTempFavIconUrl(item.url),
    title: item.title ?? "",
    url: item.url ?? ""
  }
}

export function convertTabOrRecentToItem(item: TabOrRecentData): FolderItemToCreate {
  if (isTabData(item)) {
    return convertTabToItem(item)
  } else {
    return convertRecentToItem(item)
  }
}

export function createNewSection(title = "Title"): FolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: SECTION_ICON_BASE64,
    title,
    url: "",
    isSection: true
  }
}

type SpacesState = { spaces: SpaceV3[] }

export function findItemById(appState: SpacesState, itemId: number): BookmarkItemV3 | undefined {
  let res: BookmarkItemV3 | undefined = undefined
  appState.spaces.some((space) => {
    return space.folders.some((folder) => {
      return folder.items.some((item) => {
        if (item.type === "bookmark" && item.id === itemId) {
          res = item
          return true
        }

        if (item.type === "group") {
          const groupItem = item.groupItems.find((groupItem) => groupItem.id === itemId)
          if (groupItem) {
            res = groupItem
            return true
          }
        }

        return false
      })
    })
  })

  return res
}

export function findAnyItemById(
  appState: SpacesState,
  itemId: number,
): BookmarkItemV3 | GroupV3 | undefined {
  let res: BookmarkItemV3 | GroupV3 | undefined = undefined
  appState.spaces.some((space) => {
    return space.folders.some((folder) => {
      return folder.items.some((item) => {
        if (item.id === itemId) {
          res = item
          return true
        }

        if (item.type === "group") {
          const groupItem = item.groupItems.find((groupItem) => groupItem.id === itemId)
          if (groupItem) {
            res = groupItem
            return true
          }
        }

        return false
      })
    })
  })

  return res
}

export function findFolderById(state: SpacesState, folderId: number): FolderV3 | undefined {
  let res: FolderV3 | undefined = undefined
  state.spaces.some((space) => {
    res = space.folders.find((folder) => folder.id === folderId)
    return !!res
  })

  return res
}

export function findSpaceByFolderId(state: SpacesState, folderId: number): SpaceV3 | undefined {
  return state.spaces.find((space) => {
    return !!space.folders.find((folder) => folder.id === folderId)
  })
}

export function findSpaceById(state: SpacesState, spaceId: number | undefined): SpaceV3 | undefined {
  return state.spaces.find((space) => space.id === spaceId)
}

export function createNewFolderItem(url?: string, title?: string, favIconUrl?: string): FolderItemToCreate {
  return {
    id: genUniqLocalId(),
    favIconUrl: favIconUrl ?? getTempFavIconUrl(url),
    title: title ?? "",
    url: url ?? ""
  }
}

export function convertToURL(val?: string | URL): URL | undefined {
  if (typeof val === "object") {
    return val
  } else if (typeof val === "undefined") {
    return undefined
  } else if (URL.canParse(val)) { //todo !!! measure performance, maybe throw error is faster
    return new URL(val)
  } else {
    return undefined
  }
}

export function getTempFavIconUrl(val?: string | URL): string {
  const url = convertToURL(val)
  if (url) {
    return url.origin + "/favicon.ico#by-tabowski"
  } else {
    return ""
  }
}

export function findFolderByItemId(appState: SpacesState, itemId: number): FolderV3 | undefined {
  let res: FolderV3 | undefined = undefined
  appState.spaces.some((space) => {
    const folder = space.folders.find((currentFolder) => {
      return currentFolder.items.some((item) => {
        if (item.id === itemId) {
          return true
        }

        if (item.type === "bookmark") {
          return item.id === itemId
        }

        return item.groupItems.some((groupItem) => groupItem.id === itemId)
      })
    })
    res = folder
    return !!folder
  })

  return res
}

export function toBookmarkItemV3(item: FolderItemToCreate): BookmarkItemV3 {
  return {
    id: item.id,
    position: item.position ?? "",
    title: item.title,
    type: "bookmark",
    objectType: "bookmark",
    url: item.url,
    favIconUrl: item.favIconUrl,
    isSection: item.isSection,
  }
}

export function addItemsToFolderV3(
  insertingItems: FolderItemToCreate[] | ItemV3[],
  existingItems: ItemV3[],
  insertBeforeItemId?: number,
): ItemV3[] {
  const insertBeforeItemIndex = existingItems.findIndex((item) => item.id === insertBeforeItemId)
  const insertAfterItemIndex =
    insertBeforeItemIndex !== -1
      ? insertBeforeItemIndex - 1
      : existingItems.length - 1

  let insertAfterItem = existingItems[insertAfterItemIndex]
  let insertBeforeItem = existingItems[insertBeforeItemIndex]

  const newItems: ItemV3[] = insertingItems.map((insertingItem) => {
    const normalizedItem =
      "type" in insertingItem
        ? insertingItem
        : toBookmarkItemV3(insertingItem)

    const item = {
      ...normalizedItem,
      position: insertBetween(
        insertAfterItem?.position ?? "",
        insertBeforeItem?.position ?? ""
      ),
    }

    insertAfterItem = item
    return item
  })

  return sortByPosition([...existingItems, ...newItems])
}

export function removeItemFromFolderItems(
  items: ItemV3[],
  itemId: number,
): ItemV3[] {
  return items.flatMap<ItemV3>((item) => {
    if (item.type === "bookmark") {
      return item.id === itemId ? [] : [item]
    }

    if (item.id === itemId) {
      return []
    }

    if (item.groupItems.some((groupItem) => groupItem.id === itemId)) {
      return [{
        ...item,
        groupItems: item.groupItems.filter((groupItem) => groupItem.id !== itemId),
      }]
    }

    return [item]
  })
}

export function updateSpace(
  spaces: SpaceV3[],
  spaceId: number,
  newSpace: Partial<SpaceV3> | ((space: SpaceV3) => SpaceV3)
): SpaceV3[] {
  const updatedSpaces = sortByPosition(spaces.map((space) => {
    if (space.id === spaceId) {
      if (typeof newSpace === "function") {
        return newSpace(space)
      } else {
        return { ...space, ...newSpace }
      }
    } else {
      return space
    }
  }))

  return updatedSpaces
}

export function updateFolder(
  spaces: SpaceV3[],
  folderId: number,
  newFolder: Partial<FolderV3> | ((folder: FolderV3) => FolderV3),
  sortFolders = false
): SpaceV3[] {
  const updatedSpaces = spaces.map((space) => {
    const hasTargetFolder = space.folders.find((folder) => folder.id === folderId)
    if (hasTargetFolder) {
      const newFolders = space.folders.map((folder) => {
        if (folder.id === folderId) {
          if (typeof newFolder === "function") {
            return newFolder(folder)
          } else {
            return { ...folder, ...newFolder }
          }
        } else {
          return folder
        }
      }) as FolderV3[]

      if (sortFolders) {
        sortByPosition(newFolders) // why dont always sort folders?
      }

      return {
        ...space,
        folders: newFolders
      }
    } else {
      return space
    }
  })

  return updatedSpaces
}

export function updateFolderItem(
  spaces: SpaceV3[],
  itemId: number,
  newItemProps: Partial<LegacyFolderItem> & { collapsed?: boolean },
  folderId?: number //just optimization
): SpaceV3[] {
  if (!folderId) {
    const folder = findFolderByItemId({ spaces }, itemId)
    if (!folder) {
      console.error("updateFolderItem can not find folder item")
      return spaces
    }
    folderId = folder.id
  }
  return updateFolder(spaces, folderId, (folder) => {
    const items = folder.items.map((item) => {
      if (item.type === "group" && item.id === itemId) {
        return { ...item, ...newItemProps }
      }

      if (item.type === "bookmark") {
        if (item.id === itemId) {
          return { ...item, ...newItemProps }
        }

        return item
      }

      if (item.groupItems.some((groupItem) => groupItem.id === itemId)) {
        return {
          ...item,
          groupItems: item.groupItems.map((groupItem) => {
            if (groupItem.id === itemId) {
              return { ...groupItem, ...newItemProps }
            }

            return groupItem
          }),
        }
      }

      return item
    }) as ItemV3[]

    return { ...folder, items }
  })
}

export function isCustomActionItem(item: BookmarkItemV3 | undefined): boolean {
  return item?.url.includes("tabowski://") ?? false
}
