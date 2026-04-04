import { SavingState } from "../state/storage";

const DEFAULT_SPACE_ID = 1;

export function ensureDefaultSpace(state: SavingState): void {
  if (state.spaces.length > 0) {
    return;
  }

  state.spaces = [
    {
      id: DEFAULT_SPACE_ID,
      position: "a0",
      objectType: "space",
      title: "Bookmarks",
      folders: [],
    },
  ];

  state.currentSpaceId = DEFAULT_SPACE_ID;
}
