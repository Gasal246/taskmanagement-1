import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useAddNewProject as useAddNewProjectBase,
  useAddProjectDoc as useAddProjectDocumentBase,
} from "@/query/business/queries";

export const useAddNewProject = useAddNewProjectBase;
export const useAddProjectDocument = useAddProjectDocumentBase;
export const useUpdateProjectDeatils = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.put("/api/project/update-project", payload);
      return res.data;
    },
  });
};

export const useGetUserProjects = (userId?: string, filter?: string) => {
  return useQuery({
    queryKey: ["legacy-user-projects", userId, filter],
    queryFn: async () => {
      if (!userId) return [];
      const res = await axios.get(`/api/project/get-projects?user_id=${userId}&filter=${filter || "all"}`);
      return res.data?.data || res.data || [];
    },
    enabled: Boolean(userId),
  });
};

export const useGetProjectComments = (projectid?: string) => {
  return useQuery({
    queryKey: ["legacy-project-comments", projectid],
    queryFn: async () => {
      if (!projectid) return null;
      const res = await axios.get(`/api/project/get-id/${projectid}`);
      return res.data;
    },
    enabled: Boolean(projectid),
  });
};

export const useGetProjectFlows = (projectid?: string) => {
  return useQuery({
    queryKey: ["legacy-project-flows", projectid],
    queryFn: async () => {
      if (!projectid) return null;
      const res = await axios.get(`/api/project/get-id/${projectid}`);
      return res.data;
    },
    enabled: Boolean(projectid),
  });
};

export const useDeleteProjectDoc = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.post("/api/project/docs/remove", {
        doc_id: payload?.docid ?? payload?.doc_id,
      });
      return res.data;
    },
  });
};

// Legacy project actions kept as lightweight shims for older UI components.
export const useCompleteOrForwardProject = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useChangeProjectDeadline = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useAddProjectFlow = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useDeleteProjectFlow = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useAddProjectComment = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useDeleteProjectComment = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useDocumentChangeAccess = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};
