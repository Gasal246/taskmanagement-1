import { z } from 'zod';
import { workflowId, type EnquiryWorkflow, WorkflowError } from './workflow';
export const workflowSetupSchema = z.object({
  assignments: z.array(z.object({ role_id: workflowId, user_ids: z.array(workflowId) }).strict()),
  current_stage: z.number().int().min(1),
  expected_revision: z.number().int().nonnegative(),
  configuration_revision: z.number().int().nonnegative(),
}).strict();
export type WorkflowSetup = z.infer<typeof workflowSetupSchema>;
export const WORKFLOW_EVENTS = ['WORKFLOW_COMPLETED', 'WORKFLOW_SKIPPED', 'WORKFLOW_REOPENED', 'WORKFLOW_CONFIGURED'];
const id = (value: any) => String(value?._id ?? value ?? '');
export function workflowMember(enquiry: any, userId: string) {
  return (enquiry.workflow_assignments || []).some((a: any) => a.user_ids.some((u: any) => id(u) === userId));
}
export function workflowProgress(enquiry: any, config: EnquiryWorkflow | undefined, actorId: string, admin: boolean) {
  const stages = config?.stages || [], roles = config?.roles || [];
  const total = stages.length;
  const current = Math.min(Math.max(Number(enquiry.workflow_current_stage) || 1, 1), total + 1);
  const belongs = (roleId: string) => (enquiry.workflow_assignments || []).some((a: any) => id(a.role_id) === roleId && a.user_ids.some((u: any) => id(u) === actorId));
  return { available: total > 0, configuration_revision: config?.revision ?? 0, revision: enquiry.workflow_revision || 0,
    current_stage: current, completed: current - 1, total, roles,
    stages: stages.map((s, i) => ({ ...s, number: i + 1, role: roles.find(r => r._id === s.role_id),
      state: i + 1 < current ? 'completed' : i + 1 === current ? 'current' : 'future',
      can_complete: i + 1 === current && (admin || belongs(s.role_id)),
      can_reopen: i + 1 < current && (admin || (i + 1 === current - 1 && belongs(s.role_id))),
    })), can_skip: admin && current <= total,
  };
}
export function validateSetup(config: EnquiryWorkflow, setup: WorkflowSetup) {
  if (config.revision !== setup.configuration_revision) throw new WorkflowError(409, 'Workflow configuration changed. Reload before saving.');
  if (!config.stages.length || setup.current_stage > config.stages.length + 1) throw new WorkflowError(400, 'Select a valid current stage');
  const users = new Set<string>(), roles = new Set<string>();
  for (const a of setup.assignments) {
    if (roles.has(a.role_id) || !config.roles.some(r => r._id === a.role_id)) throw new WorkflowError(400, 'Select each valid workflow role only once');
    roles.add(a.role_id);
    for (const u of a.user_ids) {
      if (users.has(u)) throw new WorkflowError(400, 'A user can be assigned to only one workflow role per enquiry');
      users.add(u);
    }
  }
  return [...users];
}
