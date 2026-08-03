export type StaffTaskDisplayStatus =
  | "To Do"
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Cancelled";

export type StaffTaskStatusFilter =
  | "todo"
  | "pending"
  | "in_progress"
  | "completed";

export type StaffTaskQueryParams = {
  taskType: "all" | "single" | "project" | "created";
  start_date?: string;
  end_date?: string;
  nameQuery?: string;
  staffId?: string;
  status?: StaffTaskStatusFilter;
  page: string;
  limit: string;
};

export type StaffTaskCard = {
  _id: string;
  task_name: string;
  task_description: string;
  end_date: string | null;
  is_project_task: boolean;
  priority: string | null;
  activity_count: number;
  completed_activity: number;
  comment_count?: number;
  progress: number;
  status: StaffTaskDisplayStatus;
  pending_since: string | null;
  assignment: {
    assignedByName: string | null;
    assignedToName: string | null;
    assignedToCount: number;
  };
  match: {
    nameMatched: boolean;
    staffTaskAssigned: boolean;
    staffActivityAssigned: boolean;
    assignedByMatched?: boolean;
  };
};

export type StaffTaskSummary = {
  toDo: number;
  pending: number;
  inProgress: number;
  completed: number;
};

export type StaffTasksResponse = {
  data: StaffTaskCard[];
  summary: StaffTaskSummary;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  statusAsOf: string;
  status: number;
};
