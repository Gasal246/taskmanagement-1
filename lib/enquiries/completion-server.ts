import mongoose from 'mongoose';
import { auth } from '@/auth';
import Eq_enquiry from '@/models/eq_enquiries.model';
import Histories from '@/models/eq_enquiry_histories';
import Access from '@/models/eq_enquiry_access.model';
import User_roles from '@/models/user_roles.model';
import Users from '@/models/users.model';
import Eq_users_log from '@/models/eq_users_log.model';
import '@/models/roles.model';
import { actionHistoryFilter, actionProgress, assignmentsFor, historyOrder, idOf, initialActionFor } from './completion';

export async function enquiryActor() {
  const session: any = await auth();
  const actorId = idOf(session?.user?.id);
  if (!mongoose.isValidObjectId(actorId)) return null;
  const roles = await User_roles.find({ user_id: actorId, status: 1 }).populate({ path: 'role_id', select: 'role_name' }).lean();
  return { actorId, admin: Boolean(session?.user?.is_super || roles.some((r: any) => r.role_id?.role_name === 'BUSINESS_ADMIN')) };
}
export type EnquiryActor = NonNullable<Awaited<ReturnType<typeof enquiryActor>>>;
export class EnquiryRequestError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function canReadEnquiry(enquiry: any, actor: EnquiryActor) {
  if (actor.admin || idOf(enquiry.createdBy) === actor.actorId || (enquiry.enquiry_brought_by || []).some((id: any) => idOf(id) === actor.actorId)) return true;
  if (await Access.exists({ enquiry_id: enquiry._id, user_id: actor.actorId })) return true;
  return Boolean(await Histories.exists({ enquiry_id: enquiry._id, assigned_to: actor.actorId, ...actionHistoryFilter }));
}
export async function canScheduleAction(enquiry: any, actor: EnquiryActor) {
  if (actor.admin || idOf(enquiry.createdBy) === actor.actorId) return true;
  return Boolean(await Histories.exists({ enquiry_id: enquiry._id, assigned_to: actor.actorId, ...actionHistoryFilter }));
}
export async function actionsForEnquiries(entries: any[]) {
  if (!entries.length) return [];
  const histories: any[] = await Histories.find({ enquiry_id: { $in: entries.map(e => e._id) }, ...actionHistoryFilter }).sort(historyOrder).lean();
  const initialIds = new Set(histories.filter(h => h.action_origin === 'initial').map(h => idOf(h.enquiry_id)));
  for (const entry of entries) {
    if (!initialIds.has(idOf(entry))) {
      const initial = initialActionFor(entry);
      if (initial) histories.push(initial);
    }
  }
  for (const action of histories) action.action_assignments = assignmentsFor(action);
  await Histories.populate(histories, [
    { path: 'assigned_to', select: 'name email' }, { path: 'forwarded_by', select: 'name email' },
    { path: 'action_assignments.user_id', select: 'name email' },
    { path: 'action_assignments.completed_by', select: 'name email' },
  ]);
  return histories;
}
export async function enrichEnquiries(entries: any[], actor: EnquiryActor) {
  const actions = await actionsForEnquiries(entries);
  return entries.map(entry => {
    const list = actions.filter(a => idOf(a.enquiry_id) === idOf(entry)).map(action => ({
      ...action, progress: actionProgress(action),
      action_assignments: assignmentsFor(action).map((part: any) => ({ ...part,
        can_complete: Boolean(entry.is_active && part.status === 'pending' && idOf(part.user_id) === actor.actorId),
        can_cancel: Boolean(part.status === 'pending' && (actor.admin || idOf(part.user_id) === actor.actorId)),
        can_reopen: Boolean(actor.admin && part.status !== 'pending'),
      })),
    })).sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    const completed = list.flatMap(action => action.action_assignments.filter((p: any) => p.status === 'completed').map((part: any) => ({ ...part, action: part.performed_action || action.action, action_id: action._id })))
      .sort((a, b) => +new Date(b.completed_at) - +new Date(a.completed_at));
    const canSchedule = actor.admin || idOf(entry.createdBy) === actor.actorId || list.some(a => a.action_assignments.some((p: any) => idOf(p.user_id) === actor.actorId));
    return { ...entry, actions: list, latest_forward: list.find(a => a.change_type === 'FORWARD' || !a.change_type) || null,
      latest_action: list[0] || null, last_completed_action: completed[0] || null,
      pending_action_parts: list.reduce((sum, a) => sum + a.progress.pending, 0),
      canScheduleAction: Boolean(entry.is_active && canSchedule), canRecordAction: Boolean(entry.is_active && canSchedule),
      current_actor_id: actor.actorId,
    };
  });
}
// Snapshot a legacy initial next-action before any edit changes its fields.
export async function preserveInitialAction(enquiry: any, session?: mongoose.ClientSession) {
  const initial = initialActionFor(enquiry);
  if (!initial) return;
  await Histories.updateOne({ _id: initial._id }, { $setOnInsert: initial }, { upsert: true, session, timestamps: false });
}
async function addAudit(enquiry: any, action: any, actor: EnquiryActor, type: string, notes: string, assignee: string, performed: string | undefined, session: mongoose.ClientSession) {
  const latest: any = await Histories.findOne({ enquiry_id: enquiry._id }).sort(historyOrder).session(session).lean();
  const [event] = await Histories.create([{
    enquiry_id: enquiry._id, camp_id: enquiry.camp_id, change_type: type,
    step_number: Number(latest?.step_number || 0) + 1, action_id: action._id,
    action_assignee: assignee, changed_by: actor.actorId, action: performed || action.action,
    previous_action: action.action, feedback: notes, is_finished: type === 'ACTION_COMPLETED',
  }], { session });
  const access: any[] = await Access.find({ enquiry_id: enquiry._id }).select('user_id').session(session).lean();
  const viewers = new Set([...access.map(a => idOf(a.user_id)), idOf(enquiry.createdBy), actor.actorId, ...(action.assigned_to || []).map(idOf)].filter(Boolean));
  await Access.insertMany([...viewers].map(user_id => ({ user_id, enquiry_id: enquiry._id, camp_id: enquiry.camp_id, history_id: event._id })), { session });
}
export async function transitionAction(body: any, actor: EnquiryActor) {
  if (!body || !mongoose.isValidObjectId(body.enquiry_id) || !mongoose.isValidObjectId(body.action_id)) throw new EnquiryRequestError(400, 'Invalid enquiry or action ID');
  if (!['complete', 'cancel', 'reopen'].includes(body.operation)) throw new EnquiryRequestError(400, 'Invalid action operation');
  if (typeof body.notes !== 'string' || !body.notes.trim() || body.notes.length > 5000) throw new EnquiryRequestError(400, 'Add notes of up to 5,000 characters');
  if (body.operation === 'complete' && !['Call', 'Visit'].includes(body.performed_action)) throw new EnquiryRequestError(400, 'Select the action you performed');
  const targetId = body.assignee_id || actor.actorId;
  if (!mongoose.isValidObjectId(targetId) || !Number.isInteger(body.expected_revision) || body.expected_revision < 0) throw new EnquiryRequestError(400, 'Refresh the action before continuing');
  if (body.operation === 'complete' && targetId !== actor.actorId) throw new EnquiryRequestError(403, 'Each assignee must complete their own part');
  if ((body.operation === 'reopen' || targetId !== actor.actorId) && !actor.admin) throw new EnquiryRequestError(403, 'Only an admin can manage another assignee’s part');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const enquiry: any = await Eq_enquiry.findById(body.enquiry_id).session(session);
      if (!enquiry) throw new EnquiryRequestError(404, 'Enquiry not found');
      if (body.operation === 'complete' && !enquiry.is_active) throw new EnquiryRequestError(403, 'Admin approval is required before action completion');
      let action: any = await Histories.findOne({ _id: body.action_id, enquiry_id: enquiry._id, ...actionHistoryFilter }).session(session);
      if (!action && idOf(enquiry) === body.action_id) {
        const initial = initialActionFor(enquiry);
        if (initial) action = new Histories(initial);
      }
      if (!action) throw new EnquiryRequestError(404, 'Action not found');
      const parts = assignmentsFor(action.toObject());
      const part = parts.find((p: any) => idOf(p.user_id) === targetId);
      if (!part) throw new EnquiryRequestError(403, 'This user is not assigned to the action');
      if ((part.revision || 0) !== body.expected_revision || (body.operation === 'reopen' ? part.status === 'pending' : part.status !== 'pending')) throw new EnquiryRequestError(409, 'This assignment has changed. Refresh its details.');
      const wasNew = action.isNew;
      // Shared enquiry write serializes step numbering and concurrent scheduling.
      await Eq_enquiry.updateOne({ _id: enquiry._id }, { $set: { updatedAt: new Date() } }, { session });
      const now = new Date();
      part.revision = (part.revision || 0) + 1;
      if (body.operation === 'complete') Object.assign(part, { status: 'completed', performed_action: body.performed_action, completion_notes: body.notes.trim(), completed_at: now, completed_by: actor.actorId });
      if (body.operation === 'cancel') Object.assign(part, { status: 'cancelled', cancellation_notes: body.notes.trim(), cancelled_at: now, cancelled_by: actor.actorId });
      if (body.operation === 'reopen') {
        part.status = 'pending';
        for (const key of ['completed_at', 'completed_by', 'completion_notes', 'performed_action', 'cancelled_at', 'cancelled_by', 'cancellation_notes']) delete part[key];
      }
      action.action_assignments = parts;
      await action.save({ session, ...(wasNew ? { timestamps: false } : {}) });
      await addAudit(enquiry, action, actor, body.operation === 'complete' ? 'ACTION_COMPLETED' : body.operation === 'cancel' ? 'ACTION_CANCELLED' : 'ACTION_REOPENED', body.notes.trim(), targetId, body.performed_action, session);
      if (body.operation === 'complete') {
        const user: any = await Users.findById(actor.actorId).select('name').session(session).lean();
        await Eq_users_log.create([{ user_id: actor.actorId, enquiry_id: enquiry._id, camp_id: enquiry.camp_id, log: `${user?.name || 'User'} completed ${body.performed_action} action ${action._id}: ${body.notes.trim()}` }], { session });
      }
    });
  } finally { await session.endSession(); }
}
export async function recordCompletedAction(body: any, actor: EnquiryActor) {
  if (!mongoose.isValidObjectId(body?.enquiry_id) || !mongoose.isValidObjectId(body?.request_id) || !['Call', 'Visit'].includes(body?.performed_action) || typeof body.notes !== 'string' || !body.notes.trim() || body.notes.length > 5000) throw new EnquiryRequestError(400, 'Select Call or Visit and add completion notes');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const enquiry: any = await Eq_enquiry.findById(body.enquiry_id).session(session);
      if (!enquiry) throw new EnquiryRequestError(404, 'Enquiry not found');
      if (!enquiry.is_active || !await canScheduleAction(enquiry, actor)) throw new EnquiryRequestError(403, 'You cannot record an action for this enquiry');
      if (await Histories.exists({ _id: body.request_id }).session(session)) throw new EnquiryRequestError(409, 'This action has already been recorded');
      await Eq_enquiry.updateOne({ _id: enquiry._id }, { $set: { updatedAt: new Date() } }, { session });
      const latest: any = await Histories.findOne({ enquiry_id: enquiry._id }).sort(historyOrder).session(session).lean();
      const [action] = await Histories.create([{
        _id: body.request_id, enquiry_id: enquiry._id, camp_id: enquiry.camp_id,
        change_type: 'ACTION_SCHEDULED', action_origin: 'recorded', action: body.performed_action,
        assigned_to: [actor.actorId], forwarded_by: actor.actorId, step_number: Number(latest?.step_number || 0) + 1,
        action_assignments: [{ user_id: actor.actorId, status: 'completed', revision: 1, completed_at: new Date(), completed_by: actor.actorId, performed_action: body.performed_action, completion_notes: body.notes.trim() }],
      }], { session });
      await addAudit(enquiry, action, actor, 'ACTION_COMPLETED', body.notes.trim(), actor.actorId, body.performed_action, session);
      const user: any = await Users.findById(actor.actorId).select('name').session(session).lean();
      await Eq_users_log.create([{ user_id: actor.actorId, enquiry_id: enquiry._id, camp_id: enquiry.camp_id, log: `${user?.name || 'User'} completed ${body.performed_action} action ${action._id}: ${body.notes.trim()}` }], { session });
    });
  } finally { await session.endSession(); }
}
