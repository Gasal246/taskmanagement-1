import mongoose from 'mongoose';
import Workflows from '@/models/eq_enquiry_workflow.model';
import Enquiries from '@/models/eq_enquiries.model';
import Histories from '@/models/eq_enquiry_histories';
import EqUsers from '@/models/eq_enquiry_users.model';
import Users from '@/models/users.model';
import { canAdministerEnquiry, type EnquiryActor } from './access';
import { DEFAULT_ROLE_COLOR, WorkflowError, type EnquiryWorkflow } from './workflow';
import { workflowSetupSchema, validateSetup, workflowProgress, type WorkflowSetup } from './workflow-progress';
import { historyOrder, idOf } from './completion';

export async function loadBusinessWorkflow(businessId: any, session?: mongoose.ClientSession): Promise<EnquiryWorkflow> {
  const raw = await Workflows.findOne({ client_id: businessId }).session(session || null).lean();
  return raw ? JSON.parse(JSON.stringify(raw)) : { client_id: String(businessId), roles: [], stages: [], revision: 0 };
}
export async function validateWorkflowSetup(enquiry: any, body: unknown, actor: EnquiryActor, session?: mongoose.ClientSession) {
  if (!canAdministerEnquiry(enquiry, actor)) throw new WorkflowError(403, 'Only this business’s administrator can configure enquiry workflow');
  const parsed = workflowSetupSchema.safeParse(body);
  if (!parsed.success) throw new WorkflowError(400, 'Invalid enquiry workflow configuration');
  const setup = parsed.data;
  if ((enquiry.workflow_revision || 0) !== setup.expected_revision) throw new WorkflowError(409, 'Enquiry workflow changed. Reload before saving.');
  const config = await loadBusinessWorkflow(enquiry.business_id, session);
  const ids = validateSetup(config, setup);
  if (ids.length) {
    const members = await EqUsers.find({ business_id: enquiry.business_id, user_id: { $in: ids } }).distinct('user_id').session(session || null);
    const count = await Users.countDocuments({ _id: { $in: ids }, status: 1 }).session(session || null);
    if (members.length !== ids.length || count !== ids.length) throw new WorkflowError(400, 'Assign active Enquiry Users from this business only');
  }
  return { config, setup };
}
async function lockConfiguration(config: EnquiryWorkflow, session: mongoose.ClientSession) {
  const result = await Workflows.updateOne({ client_id: config.client_id, revision: config.revision }, { $inc: { progress_serial: 1 } }, { session });
  if (!result.matchedCount) throw new WorkflowError(409, 'Workflow configuration changed. Reload before continuing.');
}
function stageSnapshot(config: EnquiryWorkflow, number: number) {
  const stage = config.stages[number - 1], role = config.roles.find(r => r._id === stage?.role_id);
  return { number, stage_id: stage?._id, stage_name: stage?.name || 'All stages completed', role_id: role?._id,
    role_subname: role?.subname, role_name: role?.name, role_color: role?.color_code || DEFAULT_ROLE_COLOR };
}
async function audit(enquiry: any, config: EnquiryWorkflow, actor: EnquiryActor, type: string, previous: number, next: number, target: number, session: mongoose.ClientSession, extra = {}) {
  const latest: any = await Histories.findOne({ enquiry_id: enquiry._id }).sort(historyOrder).session(session).lean();
  await Histories.create([{
    enquiry_id: enquiry._id, camp_id: enquiry.camp_id, changed_by: actor.actorId, change_type: type,
    step_number: Number(latest?.step_number || 0) + 1, is_finished: type === 'WORKFLOW_COMPLETED' || type === 'WORKFLOW_SKIPPED',
    action: stageSnapshot(config, target).stage_name,
    workflow_event: { ...stageSnapshot(config, target), previous_stage: previous, new_stage: next, configuration_revision: config.revision, ...extra },
  }], { session });
}
export async function configureWorkflow(enquiry: any, input: WorkflowSetup, actor: EnquiryActor, session: mongoose.ClientSession, creating = false) {
  const { config, setup } = await validateWorkflowSetup(enquiry, input, actor, session);
  await lockConfiguration(config, session);
  const previous = workflowProgress(enquiry, config, actor.actorId, true).current_stage;
  const before = JSON.parse(JSON.stringify(enquiry.workflow_assignments || []));
  if (!creating) {
    const guard = await Enquiries.updateOne({ _id: enquiry._id, $or: [{ workflow_revision: setup.expected_revision }, ...(setup.expected_revision === 0 ? [{ workflow_revision: { $exists: false } }] : [])] }, { $inc: { workflow_revision: 1 } }, { session });
    if (!guard.matchedCount) throw new WorkflowError(409, 'Enquiry workflow changed. Reload before saving.');
  }
  enquiry.workflow_assignments = setup.assignments;
  enquiry.workflow_current_stage = setup.current_stage;
  enquiry.workflow_revision = setup.expected_revision + 1;
  await enquiry.save({ session });
  await audit(enquiry, config, actor, 'WORKFLOW_CONFIGURED', previous, setup.current_stage, setup.current_stage, session, { previous_assignments: before, assignments: setup.assignments, roles: config.roles });
}
export async function saveWorkflowEdit(enquiry: any, input: WorkflowSetup, actor: EnquiryActor) {
  const session = await mongoose.startSession();
  try { await session.withTransaction(async () => { await configureWorkflow(enquiry, input, actor, session); }); }
  finally { await session.endSession(); enquiry.$session(null); }
}
export async function transitionWorkflow(body: any, actor: EnquiryActor) {
  if (!body || !mongoose.isValidObjectId(body.enquiry_id) || !['complete', 'skip', 'reopen'].includes(body.operation) || !Number.isInteger(body.stage_number) || body.stage_number < 1 || !Number.isInteger(body.expected_revision) || body.expected_revision < 0 || !Number.isInteger(body.configuration_revision)) throw new WorkflowError(400, 'Invalid workflow transition');
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const enquiry = await Enquiries.findById(body.enquiry_id).session(session);
      if (!enquiry) throw new WorkflowError(404, 'Enquiry not found');
      const config = await loadBusinessWorkflow(enquiry.business_id, session);
      if (config.revision !== body.configuration_revision || (enquiry.workflow_revision || 0) !== body.expected_revision) throw new WorkflowError(409, 'Workflow changed. Refresh before continuing.');
      const progress = workflowProgress(enquiry, config, actor.actorId, canAdministerEnquiry(enquiry, actor));
      const stage = progress.stages[body.stage_number - 1];
      const allowed = body.operation === 'reopen' ? stage?.can_reopen : body.operation === 'skip' ? progress.can_skip && stage?.state === 'current' : stage?.can_complete;
      if (!allowed) throw new WorkflowError(403, 'You cannot perform this stage operation');
      await lockConfiguration(config, session);
      const next = body.operation === 'reopen' ? body.stage_number : body.stage_number + 1;
      enquiry.workflow_current_stage = next;
      enquiry.workflow_revision = body.expected_revision + 1;
      await enquiry.save({ session });
      await audit(enquiry, config, actor, body.operation === 'complete' ? 'WORKFLOW_COMPLETED' : body.operation === 'skip' ? 'WORKFLOW_SKIPPED' : 'WORKFLOW_REOPENED', progress.current_stage, next, body.stage_number, session);
    });
  } finally { await session.endSession(); }
}
export async function enrichWorkflow(entries: any[], actor: EnquiryActor) {
  const businessIds = [...new Set(entries.map(e => idOf(e.business_id)).filter(id => mongoose.isValidObjectId(id)))];
  const configs: any[] = businessIds.length ? await Workflows.find({ client_id: { $in: businessIds } }).lean() : [];
  const map = new Map(configs.map(c => { const config = JSON.parse(JSON.stringify(c)); config.roles = config.roles.map((r: any) => ({ ...r, color_code: r.color_code || DEFAULT_ROLE_COLOR })); return [idOf(c.client_id), config]; }));
  return entries.map(e => ({ ...e, workflow: workflowProgress(e, map.get(idOf(e.business_id)), actor.actorId, canAdministerEnquiry(e, actor)) }));
}
