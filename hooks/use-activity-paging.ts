"use client";
import { useEffect, useState } from "react";
import { useDebouncedValue } from "./use-debounced-value";

export function useActivityPaging(taskId: string, activityId: string | null) {
  const initial = { page: 1, activitySearch: "", activityStatus: "", activityId: activityId || undefined };
  const [state, setState] = useState(initial);
  useEffect(() => { setState({ page: 1, activitySearch: "", activityStatus: "", activityId: activityId || undefined }); }, [taskId, activityId]);
  const query = useDebouncedValue(state, 250);
  return {
    query, search: state.activitySearch, status: state.activityStatus,
    isChanging: query !== state,
    setSearch: (value: string) => setState(current => ({ ...current, page: 1, activitySearch: value, activityId: undefined })),
    setStatus: (value: string) => setState(current => ({ ...current, page: 1, activityStatus: value, activityId: undefined })),
    setPage: (page: number) => setState(current => ({ ...current, page, activityId: undefined })),
  };
}
