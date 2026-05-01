import { AppState } from "@/newtab/state/state";
import { throttle } from "@/newtab/helpers/utils";
import { ColorTheme } from "@/newtab/helpers/types";
import { getV3SpacesView } from "@/newtab/helpers/dataFormatAdapters";

/**
 * SAVING STATE AND BROADCASTING CHANGES
 */

const bc = new BroadcastChannel("sync-state-channel");

export function getBC() {
  return bc;
}

function saveState(appState: AppState): void {
  const savingState: any = {};
  savingStateKeys.forEach((key) => {
    if (key === "version") {
      savingState[key] = 3;
    } else {
      savingState[key] = appState[key as SavingStateKeys];
    }
  });

  chrome.storage.local.set(savingState, () => {
    // TODO. store in LS only when last transaction confirmed by server
    // if last transaction was not confirmed, reload app and use prev state from LS
    bc.postMessage({ type: "folders-updated" });
  });
}

export const saveStateThrottled = throttle(saveState, 300);

const savingStateDefaultValues = {
  // if was not saved to LS yet
  spaces: [],
  currentSpaceId: undefined,
  sidebarCollapsed: false,
  openBookmarksInNewTab: !__OVERRIDE_NEWTAB,
  colorTheme: "light", // todo I don't use system because it's not ready to used by default
  showRecent: false,
  showArchived: false,
  showNotUsed: false,
  version: 3,
};
type SavingStateKeys = keyof typeof savingStateDefaultValues;
export const savingStateKeys = Object.keys(
  savingStateDefaultValues,
) as SavingStateKeys[];

export type SavingState = {
  [key in SavingStateKeys]: AppState[key];
} & {
  hiddenFeatureIsEnabled: boolean;
};

export function normalizeStateFromStorageResult(
  res: Partial<SavingState>,
): SavingState {
  const result = {} as SavingState;
  const mutableResult = result as any;

  savingStateKeys.forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(res, key)) {
      mutableResult[key] = res[key as keyof SavingState];
    } else {
      mutableResult[key] = savingStateDefaultValues[key];
    }
  });

  result.spaces = Array.isArray(res.spaces) ? getV3SpacesView(res.spaces as any) : [];
  result.version = 3;
  result.hiddenFeatureIsEnabled = res.hiddenFeatureIsEnabled ?? false;

  return result;
}

export function getStateFromLS(
  callback: (state: SavingState) => void,
): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    const result = normalizeStateFromStorageResult(res);
    callback(result);
  });
}

////////////////////////////////////////////////////////
// LIGHT & DARK THEMAS
////////////////////////////////////////////////////////

const darkThemeMq = window.matchMedia("(prefers-color-scheme: dark)");
let canUseSystemTheme = false;

darkThemeMq.addEventListener("change", () => {
  if (canUseSystemTheme) {
    setThemeStyle(darkThemeMq.matches);
  }
});

export function applyTheme(theme: ColorTheme) {
  canUseSystemTheme = false;
  switch (theme) {
    case "light":
      setThemeStyle(false);
      break;
    case "dark":
      setThemeStyle(true);
      break;
    default:
      setThemeStyle(false);
      // who need system color?
      // canUseSystemTheme = true
      // setThemeStyle(darkThemeMq.matches)
      break;
  }
}

function setThemeStyle(useDarkMode: boolean) {
  if (useDarkMode) {
    document.documentElement.classList.add("dark-theme");
  } else {
    document.documentElement.classList.remove("dark-theme");
  }
}
