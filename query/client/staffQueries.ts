import axios from "axios";
import { useQuery } from "@tanstack/react-query";

export const useGetSkillwiseUsers = (skill_id?: string, business_id?: string) => {
  return useQuery({
    queryKey: ["legacy-skillwise-users", skill_id, business_id],
    queryFn: async () => {
      if (!skill_id || !business_id) return [];
      const res = await axios.get(
        `/api/staff/get-all-with-skill?business_id=${business_id}&skill_id=${skill_id}`
      );
      return res.data;
    },
    enabled: Boolean(skill_id && business_id),
  });
};
