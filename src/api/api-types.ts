import { LegacyFolder } from "../newtab/helpers/types";

export type APIResponseEntityCreated = { id: number; success: true };
export type APIResponseEntityUpdatedOrDeleted = { success: true };

export type APIResponseDashboard = {
  spaces: { folders: LegacyFolder[] }[];
};
