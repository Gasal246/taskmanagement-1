import { z } from "zod";

export const activityScheduleFields = {
  start_date: z.string().min(1, "Start date and time are required").refine(
    value => Number.isFinite(new Date(value).getTime()), "Enter a valid start date and time"
  ),
  end_date: z.string().min(1, "End date and time are required").refine(
    value => Number.isFinite(new Date(value).getTime()), "Enter a valid end date and time"
  ),
};

export const isScheduleOrdered = (value: { start_date: string; end_date: string }) =>
  new Date(value.end_date).getTime() >= new Date(value.start_date).getTime();

export const scheduleOrderError = {
  message: "End must be at or after start",
  path: ["end_date"],
};

// API timestamps must include an offset; browser-local inputs are converted before sending.
export const activityScheduleSchema = z.object({
  start_date: z.string().datetime({ offset: true }),
  end_date: z.string().datetime({ offset: true }),
}).refine(isScheduleOrdered, scheduleOrderError);

export function toLocalDateTimeInput(value?: string | Date | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 23);
}

export function formatScheduleDate(value?: string | Date | null): string {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Not scheduled";
  return date.toLocaleString(undefined, {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}
