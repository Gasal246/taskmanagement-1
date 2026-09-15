import { assignmentsFor, idOf } from './action-records.mjs';
export { actionHistoryFilter, assignmentsFor, idOf, initialActionFor } from './action-records.mjs';
export const forwardHistoryFilter = {
  $or: [{ change_type: 'FORWARD' }, { change_type: { $exists: false } }, { change_type: null }],
  action: { $in: ['Call', 'Visit'] },
};
export const historyOrder = { step_number: -1, createdAt: -1, _id: -1 } as const;
export function actionProgress(action: any, now = new Date()) {
  const parts = assignmentsFor(action);
  const pending = parts.filter((p: any) => p.status === 'pending').length;
  const completed = parts.filter((p: any) => p.status === 'completed').length;
  const cancelled = parts.filter((p: any) => p.status === 'cancelled').length;
  const overdue = (pending > 0 || !parts.length) && Boolean(action.next_step_date) && new Date(action.next_step_date) < now;
  const status = pending || !parts.length ? 'pending' : completed === parts.length ? 'completed' : cancelled === parts.length ? 'cancelled' : 'resolved';
  return { status, pending, completed, cancelled, total: parts.length, overdue };
}
export function validateActionFilters(params: Record<string, any>) {
  if (!['all', 'pending', 'completed', 'cancelled', 'overdue', 'no_action'].includes(params.action_state || 'all')) throw new Error('Invalid action filter');
  if (!['all', 'mine'].includes(params.action_scope || 'all')) throw new Error('Invalid action scope');
  const from = params.period_from ? new Date(params.period_from) : null;
  const to = params.period_to ? new Date(params.period_to) : null;
  if ((from && !Number.isFinite(+from)) || (to && !Number.isFinite(+to)) || (from && to && from >= to)) throw new Error('Invalid period range');
}
export function matchesActionFilters(actions: any[], params: Record<string, any>, actorId = '', now = new Date()) {
  validateActionFilters(params);
  const mine = params.action_scope === 'mine';
  const scoped = mine ? actions.filter(a => assignmentsFor(a).some((p: any) => idOf(p.user_id) === actorId)) : actions;
  if (params.action_state === 'no_action') return scoped.length === 0;
  if (mine && !scoped.length) return false;
  const inPeriod = (date: any) => {
    if (!params.period_from && !params.period_to) return true;
    if (!date) return false;
    const time = +new Date(date);
    return (!params.period_from || time >= +new Date(params.period_from)) && (!params.period_to || time < +new Date(params.period_to));
  };
  if ((!params.action_state || params.action_state === 'all') && !params.period_from && !params.period_to && (!params.next_action || params.next_action === 'all')) return true;
  return scoped.some(action => {
    if (params.next_action && params.next_action !== 'all' && action.action !== params.next_action) return false;
    let parts = assignmentsFor(action);
    if (mine) parts = parts.filter((p: any) => idOf(p.user_id) === actorId);
    if (!parts.length && !mine) parts = [{ status: 'pending' }];
    return parts.some((part: any) => {
      if (params.action_state === 'overdue') {
        if (part.status !== 'pending' || !action.next_step_date || !(new Date(action.next_step_date) < now)) return false;
      } else if (params.action_state && params.action_state !== 'all' && part.status !== params.action_state) return false;
      return inPeriod(part.status === 'completed' ? part.completed_at : part.status === 'cancelled' ? part.cancelled_at : action.next_step_date);
    });
  });
}
