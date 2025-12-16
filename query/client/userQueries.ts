import axios from "axios";
import { useMutation } from "@tanstack/react-query";

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
