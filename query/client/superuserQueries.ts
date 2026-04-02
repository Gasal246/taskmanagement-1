import { useMutation, useQuery } from "@tanstack/react-query";

export const useAddAdminDoc = () => {
  return useMutation<any, Error, FormData>({
    mutationFn: async (_payload: FormData) => {
      return {};
    },
  });
};

export const useEditAdmin = () => {
  return useMutation<any, Error, any>({
    mutationFn: async (payload: any) => payload,
  });
};

export const useAddMoreDep = () => {
  return useMutation<any, Error, FormData>({
    mutationFn: async (_payload: FormData) => {
      return {};
    },
  });
};

export const useGetDemoDepartments = () => {
  return useQuery<any[]>({
    queryKey: ["legacy-demo-departments"],
    queryFn: async () => [],
  });
};

export const useEditDepartment = () => {
  return useMutation<any, Error, any>({
    mutationFn: async (payload: any) => payload,
  });
};

export const useGetDepartmentById = (_departmentId?: string) => {
  return useQuery<any>({
    queryKey: ["legacy-demo-department", _departmentId],
    queryFn: async () => null,
    enabled: Boolean(_departmentId),
  });
};

export const useAddDemoDep = () => {
  return useMutation<any, Error, FormData>({
    mutationFn: async (_payload: FormData) => {
      return {};
    },
  });
};
