import type {
  StaffTaskCard,
  StaffTaskStatusFilter,
  StaffTasksResponse,
  TaskPriorityFilter,
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
  priority?: TaskPriorityFilter;
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

export type AdminTaskListState = {
  businessId: string;
  activeTab: AdminTaskTab;
  draftRange: { start: string; end: string };
  appliedRange: { start: string; end: string };
  page: number;
  nameSearch: string;
  appliedNameSearch: string;
  showStaffFilter: boolean;
  showAssignedByFilter: boolean;
  showPeriodFilter: boolean;
  showPriorityFilter: boolean;
  staffSearch: string;
  selectedStaffId: string;
  assignedBySearch: string;
  selectedAssignedById: string;
  selectedStatus?: StaffTaskStatusFilter;
  selectedPriority?: TaskPriorityFilter;
};
