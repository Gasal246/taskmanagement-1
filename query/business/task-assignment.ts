"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import type { AssignmentDepartment, AssignmentStaff, TaskAssignmentOptions } from "@/types/task-assignment";

export function useTaskAssignmentOptions(businessId: string | undefined, regionId: string, areaId: string, locationId: string,
  department: AssignmentDepartment | null) {
  const { data: session, status } = useSession();
  const params = { business_id: businessId, region_id: regionId || undefined, area_id: areaId || undefined, location_id: locationId || undefined };
  const enabled = !!businessId && status === "authenticated";
  const key = ["task-assignment-options", session?.user?.id, businessId, regionId, areaId, locationId];
  const regions = useQuery({
    queryKey: ["task-assignment-regions", session?.user?.id, businessId],
    queryFn: async ({ signal }) => (await axios.get<{ data: TaskAssignmentOptions }>("/api/business/tasks/assignment-options", {
      params: { business_id: businessId }, signal,
    })).data.data.regions,
    enabled, staleTime: 30_000,
  });
  const options = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => (await axios.get<{ data: TaskAssignmentOptions }>("/api/business/tasks/assignment-options", { params, signal })).data.data,
    enabled: enabled && !!regionId, staleTime: 30_000,
  });
  const staffs = useQuery({
    queryKey: [...key, department?.kind, department?._id],
    queryFn: async ({ signal }) => (await axios.get<{ data: AssignmentStaff[] }>("/api/business/tasks/assignment-options", {
      params: { ...params, department_id: department?._id, kind: department?.kind }, signal,
    })).data.data,
    enabled: enabled && !!regionId && !!department, staleTime: 30_000,
  });
  return { regions, options, staffs };
}
