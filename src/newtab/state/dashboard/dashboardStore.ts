import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  moveFolder,
  selectSpace,
  updateFolder,
} from "@/newtab/state/dashboard/domain";
import type {
  DashboardState,
  FolderPatch,
  MoveFolderInput,
} from "@/newtab/state/dashboard/types";

export type DashboardActions = {
  selectSpace(spaceId: number): void;
  updateFolder(folderId: number, patch: FolderPatch): void;
  moveFolder(input: MoveFolderInput): void;
  hydrate(state: DashboardState): void;
};

export type DashboardStore = DashboardState & DashboardActions;

const emptyDashboardState: DashboardState = {
  spaces: [],
  currentSpaceId: -1,
};

/**
 * Vanilla store — это Zustand store без привязки к React.
 *
 * Аналогия с RTK: createDashboardStore играет роль configureStore + dashboard
 * slice, а методы ниже — именованные actions slice. В отличие от RTK action
 * не проходит через dispatch/reducer: Zustand вызывает set() напрямую.
 *
 * Такая форма нужна расширению, потому что Chrome callbacks и storage-sync
 * работают вне React и могут использовать store.getState() / store.subscribe().
 */
export function createDashboardStore(
  initialState: DashboardState = emptyDashboardState,
): StoreApi<DashboardStore> {
  return createStore<DashboardStore>()((set) => ({
    ...initialState,

    // Store намеренно не обращается к Chrome API. Он только применяет чистую
    // domain-операцию, поэтому одинаково работает в браузере и Jest.
    selectSpace: (spaceId) => {
      set((state) => selectSpace(state, spaceId));
    },
    updateFolder: (folderId, patch) => {
      set((state) => updateFolder(state, folderId, patch));
    },
    moveFolder: (input) => {
      set((state) => moveFolder(state, input));
    },

    // Zustand по умолчанию merge-ит объект. Благодаря этому hydration заменяет
    // только данные из storage и не стирает functions-actions store.
    hydrate: (state) => {
      set(state);
    },
  }));
}

/**
 * Будущий singleton для runtime приложения. Пока UI его не использует: это
 * сохраняет один источник истины в работающем приложении на время прототипа.
 */
export const dashboardStore = createDashboardStore();

/**
 * React-аналог RTK useSelector. Компонент передаёт selector и перерисовывается
 * только когда меняется возвращённый этим selector значимый срез state.
 */
export function useDashboardStore<T>(
  selector: (state: DashboardStore) => T,
): T {
  return useStore(dashboardStore, selector);
}
