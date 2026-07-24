"use client";

import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export type ProjectMode = "admin" | "staff";
export type ProjectSection =
  | "details"
  | "flow"
  | "operations"
  | "teams"
  | "departments"
  | "docs";

export const projectDetailsKey = (
  projectId: string,
  mode: ProjectMode
) => ["project-details", projectId, mode] as const;

export const projectSectionKey = (
  projectId: string,
  section: Exclude<ProjectSection, "details"> | "assignment-candidates" | "document-viewers"
) => ["project-section", projectId, section] as const;

export function useProjectDetails(projectId: string, mode: ProjectMode) {
  return useQuery({
    queryKey: projectDetailsKey(projectId, mode),
    queryFn: async () => {
      const url =
        mode === "admin"
          ? `/api/project/get-id/${projectId}`
          : `/api/project/get-id/for-staff?project_id=${projectId}`;
      const response = await axios.get(url);
      return response.data?.data;
    },
    enabled: Boolean(projectId),
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
  });
}

export function useProjectSection<T = any>(
  projectId: string,
  section: Exclude<ProjectSection, "details"> | "assignment-candidates" | "document-viewers",
  enabled = true
) {
  return useQuery<T>({
    queryKey: projectSectionKey(projectId, section),
    queryFn: async () => {
      const response = await axios.get(
        `/api/project/sections/${projectId}?section=${section}`
      );
      return response.data?.data;
    },
    enabled: Boolean(projectId) && enabled,
    staleTime: Infinity,
    gcTime: 0,
    retry: 1,
  });
}
