/** Recover only evidence of the current kind of completion; never invent an actor. */
export function recoverLegacyCompletion(enquiry, histories) {
  if (enquiry.completed_at) return null;
  const source = enquiry.is_converted ? "converted" : enquiry.status === "Project Awarded" ? "awarded" : "legacy";
  const ordered = [...histories].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const evidence = ordered.find(h => h.change_type === "ENQUIRY_COMPLETED" ||
    (source === "legacy" && (h.action === "Closed" || h.action === "Finished")) ||
    ((source === "awarded" || source === "converted") && h.changed_fields?.some(f => f.field === "status" && f.to_value === "Project Awarded")));
  const date = evidence?.createdAt || enquiry.updatedAt;
  if (!date || !Number.isFinite(new Date(date).getTime())) return null;
  const fields = {
    is_completed: true, completed_at: new Date(date), completion_source: source,
    completion_date_estimated: !evidence,
  };
  if (evidence?.changed_by || evidence?.forwarded_by) fields.completed_by = evidence.changed_by || evidence.forwarded_by;
  if (evidence?.feedback) fields.completion_notes = evidence.feedback;
  if (["Call", "Visit"].includes(evidence?.action)) fields.completion_action = evidence.action;
  return fields;
}
