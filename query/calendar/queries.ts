import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalendarEvent, getCalendarFeed, updateCalendarItemStatus } from "./functions";
import { useSession } from "next-auth/react";

export const useGetCalendarFeed = (
  queryParams: Record<string, string | boolean | undefined>
) => {
  const { data: session } = useSession();
  return useQuery({
    queryKey: ["calendar-feed", session?.user?.id, queryParams],
    queryFn: ({ signal }) => getCalendarFeed(queryParams, signal),
    enabled: Boolean(session?.user?.id),
  });
};

export const useCreateCalendarEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createCalendarEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
    },
  });
};

export const useUpdateCalendarItemStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateCalendarItemStatus,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["calendar-feed"] });
    },
  });
};
