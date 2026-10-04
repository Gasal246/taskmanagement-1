import axios from "axios";

export async function getCalendarFeed(
  queryParams: Record<string, string | boolean | undefined>, signal?: AbortSignal
) {
  try {
    const params = new URLSearchParams();

    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "string" && !value.trim()) return;
      params.set(key, String(value));
    });

    const queryString = params.toString();
    const response = await axios.get(`/api/calendar/feed${queryString ? `?${queryString}` : ""}`, { signal, timeout: 15_000 });
    return response.data;
  } catch (error) {
    throw error;
  }
}

export async function createCalendarEvent(payload: {
  title: string;
  description?: string;
  start_date: string;
  end_date: string;
  attendee_ids?: string[];
  status?: string;
}) {
  const response = await axios.post("/api/calendar/events", payload);
  return response.data;
}

export async function updateCalendarItemStatus(payload: {
  type: string;
  sourceId: string;
  status: string;
}) {
  const response = await axios.patch("/api/calendar/status", payload);
  return response.data;
}
