import type { FolderV3, SpaceV3 } from "@/newtab/helpers/types";

/**
 * Сохранённая часть дашборда, которой будет владеть будущий dashboard store.
 *
 * Это намеренно не весь AppState: вкладки Chrome, состояние UI и уведомления
 * меняются по другим правилам и будут выделены в отдельные срезы.
 */
export type DashboardState = {
  spaces: SpaceV3[];
  currentSpaceId: number;
};

/**
 * Для прототипа разрешаем менять только пользовательские свойства folder.
 * Идентификатор, position и items — структурные поля: отдельные команды
 * отвечают за их изменение, чтобы случайно не повредить дерево закладок.
 */
export type FolderPatch = Pick<
  Partial<FolderV3>,
  "title" | "color" | "archived" | "collapsed" | "twoColumn"
>;

export type MoveFolderInput = {
  folderId: number;
  targetSpaceId: number;
};
