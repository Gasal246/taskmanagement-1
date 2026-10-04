// Shared by the local HTTP runner and the staging k6 scenario.
export const endpointNames = ["admin-tasks", "staff-tasks", "admin-enquiries", "staff-enquiries", "calendar", "dashboard", "organization-summary", "organization-staffs", "facility-map"];

export function endpoint(actor, pick, page = 1, now = Date.now()) {
  if (pick < 0.35) return { name: `${actor.role}-tasks`, path: actor.role === "admin"
    ? `/api/task/admin-task/get-filtered?business_id=${actor.businessId}&page=${page}&limit=12`
    : `/api/task/staff-task/get-filtered?taskType=all&page=${page}&limit=12` };
  if (pick < 0.55) return { name: `${actor.role}-enquiries`, path: actor.role === "admin"
    ? `/api/enquiries/get/enquiries/filtered?page=${page}&limit=10`
    : `/api/enquiries/staff-side/get/user-enquiries?page=${page}&limit=10` };
  if (pick < 0.7) return { name: "calendar", path: `/api/calendar/feed?start_date=${encodeURIComponent(new Date(now - 86400000).toISOString())}&end_date=${encodeURIComponent(new Date(now + 6 * 86400000).toISOString())}&limit=100` };
  if (pick < 0.8 && actor.role === "staff") return { name: "dashboard", path: `/api/users/get-user/all-details?role_id=${actor.roleId}&org_id=${actor.regionId}` };
  if (pick < 0.9) return { name: "organization-summary", path: `/api/business/regions/get-complete?region_id=${actor.regionId}&mode=summary` };
  if (pick < 0.95) return { name: "organization-staffs", path: `/api/business/regions/get-complete?region_id=${actor.regionId}&mode=section&section=staffs&page=${page}&limit=25` };
  return { name: "facility-map", path: "/api/enquiries/get/camps/map?mode=viewport&south=24&west=54&north=25.1&east=55.1&zoom=8" };
}

export function validPayload(name, data) {
  if (name.endsWith("-tasks") || name.endsWith("-enquiries")) return Array.isArray(data?.data) && Boolean(data.pagination);
  if (name === "calendar") return Array.isArray(data?.items) && Boolean(data.pagination);
  if (name === "dashboard") return typeof data?.data?.dashboard?.pendingTasks === "number";
  if (name === "organization-summary") return typeof data?.data?.counts?.staffs === "number";
  if (name === "organization-staffs") return Array.isArray(data?.data) && Boolean(data.pagination);
  return Array.isArray(data?.clusters) && Array.isArray(data?.camps) && typeof data.visibleTotal === "number";
}
