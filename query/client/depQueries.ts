import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useAddAreaStaff as useAddAreaStaffBase,
  useAddDepartmentStaff as useAddDepStaffBase,
  useAddRegionStaff as useAddRegionalStaffBase,
} from "@/query/business/queries";

export const useAddAreaStaff = useAddAreaStaffBase;
export const useAddDepStaff = useAddDepStaffBase;
export const useAddRegionalStaff = useAddRegionalStaffBase;

export const useGetAvailableStaffs = (business_id?: string, _roles?: string[]) => {
  return useQuery({
    queryKey: ["legacy-dep-available-staffs", business_id, _roles?.join(",") || ""],
    queryFn: async () => {
      if (!business_id) return [];
      const res = await axios.get(`/api/users/business/allstaffs?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useShowDepartmentForHeads = (business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-dep-heads-departments", business_id],
    queryFn: async () => {
      if (!business_id) return [];
      const res = await axios.get(`/api/business/departments/getall?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useEditDepName = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.post("/api/business/departments/edit", {
        depid: payload?.depid,
        newName: payload?.newName,
        ...payload,
      });
      return res.data;
    },
  });
};
