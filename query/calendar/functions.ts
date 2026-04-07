import axios from "axios";

export async function getCalendarFeed(
  queryParams: Record<string, string | boolean | undefined>
) {
  try {
    const params = new URLSearchParams();

    Object.entries(queryParams || {}).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      if (typeof value === "string" && !value.trim()) return;
      params.set(key, String(value));
    });

    const queryString = params.toString();
    const response = await axios.get(`/api/calendar/feed${queryString ? `?${queryString}` : ""}`);
    return response.data;
  } catch (error) {
    console.log(error);
    return { items: [], summary: { total: 0, tasks: 0, enquiries: 0, customEvents: 0 } };
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
