import type {
  StaffTaskCard,
  StaffTaskStatusFilter,
  StaffTasksResponse,
} from "@/types/staff-tasks";

export type AdminTaskTab = "all" | "single" | "project" | "admin-created";

export type AdminTaskQueryParams = {
  business_id: string;
  type: AdminTaskTab;
  startDate?: string;
  endDate?: string;
  nameQuery?: string;
  staffId?: string;
  assignedById?: string;
  status?: StaffTaskStatusFilter;
  page: string;
  limit: string;
};

export type AdminTaskCard = StaffTaskCard;

export type AdminTasksResponse = Omit<StaffTasksResponse, "data"> & {
  data: AdminTaskCard[];
};

export type AdminTaskFilterOptionKind = "staff" | "heads";

export type AdminTaskFilterOption = {
  id: string;
  name: string;
  email: string;
};

export type AdminTaskFilterOptionsResponse = {
  data: AdminTaskFilterOption[];
  status: number;
};
