import { z } from 'zod';

export const DEFAULT_ROLE_COLOR = '#67e8f9';
export const roleColorSchema = z.string().regex(/^#[0-9a-f]{6}$/i, 'Choose a valid six-digit hex color.').transform(value => value.toLowerCase());

export type WorkflowRole = { _id: string; subname: string; name: string; color_code: string; createdAt: string; updatedAt: string };
export type WorkflowStage = { _id: string; name: string; role_id: string; createdAt: string; updatedAt: string };
export type EnquiryWorkflow = { client_id: string; revision: number; roles: WorkflowRole[]; stages: WorkflowStage[] };
export class WorkflowError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export const workflowId = z.string().regex(/^[a-f\d]{24}$/i).transform(value => value.toLowerCase());
export const normalizeRoleSubname = (value: string) => value.toUpperCase().replace(/\s/g, '');
const name = z.string().trim().min(1).max(200);
const role = { subname: z.string().transform(normalizeRoleSubname).pipe(z.string().regex(/^[A-Z]+$/).max(32)), name, color_code: roleColorSchema.default(DEFAULT_ROLE_COLOR) };
const stage = { name, role_id: workflowId };
const base = { client_id: workflowId, revision: z.number().int().nonnegative() };
export const workflowChangeSchema = z.discriminatedUnion('operation', [
  z.object({ ...base, operation: z.literal('add_role'), ...role }).strict(),
  z.object({ ...base, operation: z.literal('edit_role'), id: workflowId, ...role }).strict(),
  z.object({ ...base, operation: z.literal('delete_role'), id: workflowId }).strict(),
  z.object({ ...base, operation: z.literal('add_stage'), ...stage }).strict(),
  z.object({ ...base, operation: z.literal('edit_stage'), id: workflowId, ...stage }).strict(),
  z.object({ ...base, operation: z.literal('delete_stage'), id: workflowId }).strict(),
  z.object({ ...base, operation: z.literal('reorder'), stage_ids: z.array(workflowId) }).strict(),
]);
export type WorkflowChange = z.infer<typeof workflowChangeSchema>;
export type WorkflowInput = WorkflowChange extends infer T ? T extends WorkflowChange ? Omit<T, 'client_id' | 'revision'> : never : never;

/** Pure transition: validate references and uniqueness before a version-checked write. */
export function applyWorkflowChange(current: EnquiryWorkflow, change: WorkflowChange, newId: string, now: string): EnquiryWorkflow {
  if (current.client_id !== change.client_id) throw new WorkflowError(403, 'You cannot access this business');
  if (current.revision !== change.revision) throw new WorkflowError(409, 'Configuration changed. Review the latest data and try again.');
  const next = { ...current, roles: current.roles.map(r => ({ ...r })), stages: current.stages.map(s => ({ ...s })), revision: current.revision + 1 };
  const stamps = { createdAt: now, updatedAt: now };
  if (change.operation === 'add_role' || change.operation === 'edit_role') {
    const subname = normalizeRoleSubname(change.subname);
    const id = change.operation === 'edit_role' ? change.id : newId;
    if (next.roles.some(r => r.subname === subname && r._id !== id)) throw new WorkflowError(409, 'This role subname is already used in this business.');
    if (change.operation === 'add_role') next.roles.push({ _id: id, subname, name: change.name, color_code: change.color_code, ...stamps });
    else {
      const existing = next.roles.find(r => r._id === id);
      if (!existing) throw new WorkflowError(404, 'Role not found');
      Object.assign(existing, { subname, name: change.name, color_code: change.color_code, updatedAt: now });
    }
  } else if (change.operation === 'delete_role') {
    if (!next.roles.some(r => r._id === change.id)) throw new WorkflowError(404, 'Role not found');
    if (next.stages.some(s => s.role_id === change.id)) throw new WorkflowError(409, 'Reassign or delete the stages using this role before deleting it.');
    next.roles = next.roles.filter(r => r._id !== change.id);
  } else if (change.operation === 'add_stage' || change.operation === 'edit_stage') {
    if (!next.roles.some(r => r._id === change.role_id)) throw new WorkflowError(400, 'Select a role belonging to this business.');
    if (change.operation === 'add_stage') next.stages.push({ _id: newId, name: change.name, role_id: change.role_id, ...stamps });
    else {
      const existing = next.stages.find(s => s._id === change.id);
      if (!existing) throw new WorkflowError(404, 'Stage not found');
      Object.assign(existing, { name: change.name, role_id: change.role_id, updatedAt: now });
    }
  } else if (change.operation === 'delete_stage') {
    if (!next.stages.some(s => s._id === change.id)) throw new WorkflowError(404, 'Stage not found');
    next.stages = next.stages.filter(s => s._id !== change.id);
  } else {
    const ids = change.stage_ids;
    const map = new Map(next.stages.map(s => [s._id, s]));
    if (ids.length !== map.size || new Set(ids).size !== ids.length || ids.some(id => !map.has(id))) throw new WorkflowError(400, 'Provide every stage exactly once when reordering.');
    next.stages = ids.map(id => map.get(id)!);
  }
  return next;
}
