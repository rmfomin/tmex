import { IAppState } from "./state";
import { throttle } from "../helpers/utils";
import { ColorTheme } from "../helpers/types";
import { WhatsNew } from "../helpers/whats-new";
import {
  convertLegacySpacesToV3Backup,
  convertV3BackupToLegacySpaces,
} from "../helpers/importExportHelpers";
import { DataBackupV3, ISpace } from "../helpers/types";

/**
 * SAVING STATE AND BROADCASTING CHANGES
 */

const bc = new BroadcastChannel("sync-state-channel");

export function getBC() {
  return bc;
}

type RawSavingState = Omit<ISavingAppState, "spaces"> & {
  spaces: ISpace[] | DataBackupV3["spaces"];
};

function getSpacesForSave(appState: IAppState): DataBackupV3["spaces"] {
  return convertLegacySpacesToV3Backup(appState.spaces).spaces;
}

function getSpacesForLoad(rawState: RawSavingState): ISpace[] {
  if (rawState.version === 3) {
    return convertV3BackupToLegacySpaces({
      isTabme: true,
      version: 3,
      spaces: rawState.spaces as DataBackupV3["spaces"],
    });
  }

  return rawState.spaces as ISpace[];
}

function saveState(appState: IAppState): void {
  const savingState: any = {};
  savingStateKeys.forEach((key) => {
    if (key === "spaces") {
      savingState[key] = getSpacesForSave(appState);
    } else if (key === "version") {
      savingState[key] = 3;
    } else {
      savingState[key] = appState[key as SavingStateKeys];
    }
  });

  chrome.storage.local.set(savingState, () => {
    // TODO. store in LS only when last transaction confirmed by server
    // if last transaction was not confirmed, reload app and use prev state from LS
    console.log("SAVED", savingState);
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
  stat: undefined,
  showRecent: false,
  showArchived: false,
  showNotUsed: false,
  version: 3,
};
type SavingStateKeys = keyof typeof savingStateDefaultValues;
export const savingStateKeys = Object.keys(
  savingStateDefaultValues,
) as SavingStateKeys[];

export type ISavingAppState = {
  [key in SavingStateKeys]: IAppState[key];
} & {
  hiddenFeatureIsEnabled: boolean;
  betaMode: boolean;
  currentWhatsNew: WhatsNew | undefined;
};

export function getStateFromLS(
  callback: (state: ISavingAppState) => void,
): void {
  chrome.storage.local.get(savingStateKeys, (res) => {
    const rawState = {} as RawSavingState;
    savingStateKeys.forEach((key) => {
      if (res.hasOwnProperty(key)) {
        // @ts-ignore
        rawState[key] = res[key];
      } else {
        // @ts-ignore
        rawState[key] = savingStateDefaultValues[key as SavingStateKeys];
      }
    });
    const result = {
      ...rawState,
      spaces: getSpacesForLoad(rawState),
    } as ISavingAppState;
    console.log("getStateFromLS", res, result);
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

////////////////////////////////////////////////////////
// DEBUG COMMANDS
////////////////////////////////////////////////////////
const cmd: any = {};
(window as any).cmd = cmd;

cmd.clearChromeStorage = () => {
  chrome.storage.local.clear();
};
cmd.clearLocalStorage = () => {
  localStorage.clear();
};

cmd.clearChromeAndLocalStorages = () => {
  chrome.storage.local.clear();
  localStorage.clear();
};

cmd.startBeta = () => {
  localStorage.setItem("betaMode", "true");
  location.reload();
};

cmd.stopBeta = () => {
  localStorage.removeItem("betaMode");
  location.reload();
};

cmd.startAlpha = () => {
  localStorage.setItem("betaStickers", "true");
  location.reload();
};

cmd.stopAlpha = () => {
  localStorage.removeItem("betaStickers");
  location.reload();
};

export function isBetaMode(): boolean {
  return !!localStorage.getItem("betaMode");
}
