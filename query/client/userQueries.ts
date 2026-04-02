import axios from "axios";
import { useMutation, useQuery } from "@tanstack/react-query";

// Re-export existing user query hooks to keep older imports working.
export * from "../user/queries";

// Password reset flow helper – sends a verification email using the current API.
export const useSendPasswordMagicLink = () => {
  return useMutation({
    mutationFn: async ({ email }: { email: string }) => {
      const res = await axios.post("/api/users/verification/send-mail", { email });
      return res.data;
    },
  });
};

export const useResetPassword = () => {
  return useMutation<any, Error, FormData>({
    mutationFn: async (_payload: FormData) => {
      return {};
    },
  });
};

export const useGetAllTasks = (userId?: string) => {
  return useQuery({
    queryKey: ["legacy-user-all-tasks", userId],
    queryFn: async () => [],
    enabled: Boolean(userId),
  });
};
