export function periodBounds(preset: string, start?: string, end?: string, now = new Date()) {
  if (preset === "all") return { period_from: "", period_to: "" };
  let from: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let to: Date | null = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  if (preset === "week") { from.setDate(from.getDate() - ((from.getDay() + 6) % 7)); to = new Date(from); to.setDate(to.getDate() + 7); }
  if (preset === "month") { from.setDate(1); to = new Date(from.getFullYear(), from.getMonth() + 1, 1); }
  if (preset === "custom") {
    from = start ? new Date(`${start}T00:00:00`) : null;
    to = end ? new Date(`${end}T00:00:00`) : null;
    if (to) to.setDate(to.getDate() + 1);
  }
  return { period_from: from && Number.isFinite(from.getTime()) ? from.toISOString() : "", period_to: to && Number.isFinite(to.getTime()) ? to.toISOString() : "" };
}
