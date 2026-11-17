import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongo';
import Workflow from '@/models/eq_enquiry_workflow.model';
import Business from '@/models/business.model';
import { authorizeEnquiryBusiness } from '@/lib/enquiries/access';
import { DEFAULT_ROLE_COLOR, applyWorkflowChange, workflowChangeSchema, workflowId, WorkflowError, type EnquiryWorkflow } from '@/lib/enquiries/workflow';

async function authorize(clientId: string) {
  const denied = await authorizeEnquiryBusiness(clientId, true);
  if (denied) return denied;
  if (!await Business.exists({ _id: clientId, status: 1 })) throw new WorkflowError(404, 'Business is unavailable');
}
function empty(client_id: string): EnquiryWorkflow { return { client_id, revision: 0, roles: [], stages: [] }; }
async function load(clientId: string): Promise<EnquiryWorkflow> {
  const doc = await Workflow.findOne({ client_id: clientId }).lean();
  if (!doc) return empty(clientId);
  const { client_id, revision, roles, stages } = JSON.parse(JSON.stringify(doc));
  return { client_id, revision, roles: roles.map((role: EnquiryWorkflow['roles'][number]) => ({ ...role, color_code: role.color_code ?? DEFAULT_ROLE_COLOR })), stages };
}
function failure(error: unknown) {
  if (error instanceof WorkflowError) return NextResponse.json({ message: error.message }, { status: error.status });
  if ((error as { code?: number })?.code === 11000) return NextResponse.json({ message: 'Configuration changed. Review the latest data and try again.' }, { status: 409 });
  console.error('Enquiry workflow request failed', error);
  return NextResponse.json({ message: 'Unable to load or save enquiry workflow. Try again.' }, { status: 500 });
}
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const parsed = workflowId.safeParse(req.nextUrl.searchParams.get('client_id'));
    if (!parsed.success) throw new WorkflowError(400, 'Select a valid business');
    const denied = await authorize(parsed.data);
    if (denied) return denied;
    return NextResponse.json(await load(parsed.data));
  } catch (error) { return failure(error); }
}
async function change(req: NextRequest) {
  try {
    await connectDB();
    let body: unknown;
    try { body = await req.json(); } catch { throw new WorkflowError(400, 'Provide valid JSON'); }
    const parsed = workflowChangeSchema.safeParse(body);
    if (!parsed.success) throw new WorkflowError(400, 'Provide valid names, IDs and revision. Role subnames must contain only letters A–Z (maximum 32); names must be 1–200 characters. Role colors must be six-digit hex values (e.g. #67e8f9).');
    const input = parsed.data;
    const expectedMethod = input.operation.startsWith('add_') ? 'POST' : input.operation.startsWith('delete_') ? 'DELETE' : 'PATCH';
    if (req.method !== expectedMethod) throw new WorkflowError(405, 'Method does not match this operation');
    const denied = await authorize(input.client_id);
    if (denied) return denied;
    const current = await load(input.client_id);
    const next = applyWorkflowChange(current, input, new mongoose.Types.ObjectId().toString(), new Date().toISOString());
    if (current.revision === 0) {
      // GET is read-only. The unique tenant index arbitrates simultaneous first writes.
      await Workflow.createIndexes();
      await Workflow.create(next);
    } else {
      const result = await Workflow.updateOne({ client_id: input.client_id, revision: input.revision }, { $set: { roles: next.roles, stages: next.stages, revision: next.revision } }, { runValidators: true });
      if (!result.matchedCount) throw new WorkflowError(409, 'Configuration changed. Review the latest data and try again.');
    }
    return NextResponse.json(next);
  } catch (error) { return failure(error); }
}
export const POST = change;
export const PATCH = change;
export const DELETE = change;
