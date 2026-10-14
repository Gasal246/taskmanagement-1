"use client";
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { toast } from "sonner";
import { createQueryClient } from "./create-query-client";
import PendingActionGuard from "@/components/shared/PendingActionGuard";

export default function TanstackProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => createQueryClient(message => toast.error(message)));
  return <QueryClientProvider client={queryClient}>
    {children}
    <PendingActionGuard />
  </QueryClientProvider>;
}
