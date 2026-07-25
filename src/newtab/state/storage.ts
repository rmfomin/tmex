import { AppState } from "@/newtab/state/state";
import { throttle } from "@/newtab/helpers/utils";
import { ColorTheme } from "@/newtab/helpers/types";
import {
  areSpacesV3,
  normalizeBackupV3,
} from "@/newtab/helpers/dataFormatAdapters";

/**
 * SAVING STATE AND BROADCASTING CHANGES
 */

const bc = new BroadcastChannel("sync-state-channel");

export function getBC() {
  return bc;
}

function saveState(appState: AppState): void {
  persistSavingState(toCanonicalSavingState(appState));
}

function toCanonicalSavingState(appState: Partial<SavingState>): SavingState {
  const savingState: any = {};
  savingStateKeys.forEach((key) => {
    if (key === "version") {
      savingState[key] = 3;
    } else {
      savingState[key] = appState[key as SavingStateKeys];
    }
  });

  savingState.spaces = areSpacesV3(savingState.spaces)
    ? normalizeBackupV3({
        isTablo: true,
        version: 3,
        spaces: savingState.spaces,
      }).spaces
    : [];

  return savingState as SavingState;
}

function persistSavingState(savingState: SavingState): void {
  chrome.storage.local.set(savingState, () => {
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
  colorTheme: "system",
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

  if (!result.colorTheme) {
    result.colorTheme = "system";
  }

  const storedSpaces = res.spaces;
  if (res.version === 3 && areSpacesV3(storedSpaces)) {
    result.spaces = normalizeBackupV3({
      isTablo: true,
      version: 3,
      spaces: storedSpaces,
    }).spaces;
  } else {
    result.spaces = [];
    mutableResult.currentSpaceId = savingStateDefaultValues.currentSpaceId;
  }
  result.version = 3;
  result.hiddenFeatureIsEnabled = res.hiddenFeatureIsEnabled ?? false;

  return result;
}

export function getStateFromLS(
  callback: (state: SavingState) => void,
): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    const result = normalizeStateFromStorageResult(res);
    const needsCanonicalRewrite = savingStateKeys.some(
      (key) => JSON.stringify(res[key]) !== JSON.stringify(result[key])
    );
    if (needsCanonicalRewrite) {
      persistSavingState(toCanonicalSavingState(result));
    }
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

export function applyTheme(theme: ColorTheme | undefined) {
  canUseSystemTheme = false;
  switch (theme) {
    case "light":
      setThemeStyle(false);
      break;
    case "system":
      canUseSystemTheme = true;
      setThemeStyle(darkThemeMq.matches);
      break;
    case "dark":
      setThemeStyle(true);
      break;
    default:
      canUseSystemTheme = true;
      setThemeStyle(darkThemeMq.matches);
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
