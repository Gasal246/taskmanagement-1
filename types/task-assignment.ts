export type AssignmentDepartment = {
  _id: string;
  dep_name: string;
  kind: "region" | "area" | "location";
  scope: string;
};

export type TaskAssignmentOptions = {
  regions: { _id: string; region_name: string }[];
  areas: { _id: string; area_name: string }[];
  locations: { _id: string; location_name: string }[];
  departments: AssignmentDepartment[];
};

export type AssignmentStaff = {
  _id: string;
  user_id: { _id: string; name: string; email?: string; phone?: string; avatar_url?: string };
  task_count: number;
  activity_count: number;
};
