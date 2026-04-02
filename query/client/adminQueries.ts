import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  useAddAreaHead as useAddAreaHeadBase,
  useAddDepartmentArea as useAddDepartmentAreaBase,
  useAddDepartmentHead as useAddDepartmentHeadBase,
  useAddDepartmentRegion as useAddDepartmentRegionBase,
  useAddBusinessRegion as useAddNewRegionBase,
  useAddRegionHead as useAddRegionHeadBase,
} from "@/query/business/queries";
import {
  useAddUserDoc as useAddNewStaffDocumentBase,
  useUpdateStaffProfile as useUpdateStaffBase,
  useUpdateUserInfo as useEditProfileInfoBase,
} from "@/query/user/queries";

export const useAddAreaHead = useAddAreaHeadBase;
export const useAddDepartmentArea = useAddDepartmentAreaBase;
export const useAddDepartmentHead = useAddDepartmentHeadBase;
export const useAddDepartmentRegion = useAddDepartmentRegionBase;
export const useAddNewRegion = useAddNewRegionBase;
export const useAddRegionHead = useAddRegionHeadBase;
export const useAddNewStaffDocument = useAddNewStaffDocumentBase;
export const useEditProfileInfo = useEditProfileInfoBase;
export const useUpdateStaff = useUpdateStaffBase;
export const useUpdatePfp = useUpdateStaffBase;

export const useGetAllRegions = (business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-admin-regions", business_id],
    queryFn: async () => {
      if (!business_id) return [];
      const res = await axios.get(`/api/business/regions/getall?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useGetAllAreas = (region_id?: string) => {
  return useQuery({
    queryKey: ["legacy-admin-areas", region_id],
    queryFn: async () => {
      if (!region_id || region_id === "all") return [];
      const res = await axios.get(`/api/business/regions/get/areas?region_ids=${region_id}`);
      return res.data;
    },
    enabled: Boolean(region_id),
  });
};

export const useGetAllDepartments = (business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-admin-departments", business_id],
    queryFn: async () => {
      if (!business_id) return [];
      const res = await axios.get(`/api/business/departments/getall?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useGetAllStaffs = (business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-admin-staffs", business_id],
    queryFn: async () => {
      if (!business_id) return [];
      const res = await axios.get(`/api/users/business/allstaffs?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useGetAllSkills = (business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-admin-skills", business_id],
    queryFn: async () => {
      if (!business_id) return { Skills: [] };
      const res = await axios.get(`/api/business/skills/getall?business_id=${business_id}`);
      return res.data;
    },
    enabled: Boolean(business_id),
  });
};

export const useGetSelectableAreaHeads = (business_id?: string) => useGetAllStaffs(business_id);
export const useGetSelectableRegionalHeads = (business_id?: string) => useGetAllStaffs(business_id);
export const useGetStaffsRegionArea = (business_id?: string) => useGetAllStaffs(business_id);

export const useEditDepName = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const res = await axios.post("/api/business/departments/edit", payload);
      return res.data;
    },
  });
};

// Legacy components still import these names, but there is no equivalent route in the current tree.
export const useEditRegionName = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useEditAreaName = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useAddNewCompanion = () => {
  return useMutation({
    mutationFn: async (payload: any) => payload,
  });
};

export const useAddSkillToStaff = () => {
  return useMutation({
    mutationFn: async (payload: any) => {
      const formData = new FormData();
      formData.append(
        "body",
        JSON.stringify({
          user_id: payload?.staffId ?? payload?.user_id,
          skill_id: payload?.skillId ?? payload?.skill_id ?? payload?.skill,
        })
      );
      const res = await axios.post("/api/users/skill/add", formData);
      return res.data;
    },
  });
};
