export const idOf = value => String(value?._id ?? value ?? '');
export const asList = value => Array.isArray(value) ? value : value ? [value] : [];
export const actionHistoryFilter = {
  $or: [{ change_type: { $in: ['FORWARD', 'ACTION_SCHEDULED'] } }, { change_type: { $exists: false } }, { change_type: null }],
  action: { $in: ['Call', 'Visit'] },
};
export function assignmentsFor(action) {
  const stored = action.action_assignments || [];
  return [...new Set(asList(action.assigned_to).map(idOf).filter(Boolean))].map(userId => {
    const part = stored.find(p => idOf(p.user_id) === userId);
    return part || { user_id: userId, status: 'pending', revision: 0 };
  });
}
// Stable ID makes legacy initial actions usable without read-side database writes.
export function initialActionFor(enquiry) {
  if (!['Call', 'Visit'].includes(enquiry.next_action)) return null;
  const assigned = enquiry.createdBy ? [enquiry.createdBy?._id || enquiry.createdBy] : [];
  return {
    _id: enquiry._id, enquiry_id: enquiry._id, camp_id: enquiry.camp_id?._id || enquiry.camp_id,
    change_type: 'ACTION_SCHEDULED', action_origin: 'initial', action: enquiry.next_action,
    assigned_to: assigned, forwarded_by: enquiry.createdBy?._id || enquiry.createdBy,
    feedback: '', next_step_date: enquiry.next_action_due || null,
    step_number: 0, createdAt: enquiry.createdAt, updatedAt: enquiry.createdAt,
    action_assignments: assigned.map(user_id => ({ user_id, status: 'pending', revision: 0 })),
  };
}
