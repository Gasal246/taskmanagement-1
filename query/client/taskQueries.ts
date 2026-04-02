import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

export const useGetAllStaffTasks = (_userId?: string) => {
  return useQuery({
    queryKey: ["legacy-staff-tasks", _userId],
    queryFn: async () => [],
    enabled: Boolean(_userId),
  });
};

export const useAddNewTaskActivity = () => {
  return useMutation<any, Error, FormData>({
    mutationFn: async (payload: FormData) => {
      const res = await axios.post("/api/task/project-task/add-activity", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res.data;
    },
  });
};

export const useEditTask = () => {
  return useMutation<any, Error, any>({
    mutationFn: async (payload: any) => {
      return payload;
    },
  });
};
