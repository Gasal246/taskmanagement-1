import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createCalendarEvent, getCalendarFeed, updateCalendarItemStatus } from "./functions";

export const useGetCalendarFeed = (
  queryParams: Record<string, string | boolean | undefined>
) => {
  return useQuery({
    queryKey: ["calendar-feed", queryParams],
    queryFn: () => getCalendarFeed(queryParams),
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
