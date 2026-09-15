import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import connectDB from '@/lib/mongo';
import Eq_enquiry from '@/models/eq_enquiries.model';
import { canReadEnquiry, enrichEnquiries, enquiryActor, EnquiryRequestError, recordCompletedAction, transitionAction } from '@/lib/enquiries/completion-server';
const failure = (error: unknown) => {
  const status = error instanceof EnquiryRequestError ? error.status : 500;
  if (status === 500) console.error('Enquiry action request failed', error);
  return NextResponse.json({ message: error instanceof EnquiryRequestError ? error.message : 'Unable to process enquiry action', status }, { status });
};
export async function GET(req: NextRequest) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) throw new EnquiryRequestError(401, 'Unauthorized');
    const id = req.nextUrl.searchParams.get('enquiry_id');
    if (!mongoose.isValidObjectId(id)) throw new EnquiryRequestError(400, 'Invalid enquiry ID');
    const enquiry: any = await Eq_enquiry.findById(id).lean();
    if (!enquiry) throw new EnquiryRequestError(404, 'Enquiry not found');
    if (!await canReadEnquiry(enquiry, actor)) throw new EnquiryRequestError(403, 'Forbidden');
    return NextResponse.json({ enquiry: (await enrichEnquiries([enquiry], actor))[0], status: 200 });
  } catch (error) { return failure(error); }
}
async function mutate(req: NextRequest, record = false) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) throw new EnquiryRequestError(401, 'Unauthorized');
    let body: any;
    try { body = await req.json(); } catch { throw new EnquiryRequestError(400, 'Invalid JSON'); }
    if (record) await recordCompletedAction(body, actor); else await transitionAction(body, actor);
    return NextResponse.json({ status: 200, message: record ? 'Completed action recorded' : body.operation === 'complete' ? 'Your action is completed' : body.operation === 'cancel' ? 'Assignment cancelled' : 'Assignment reopened' });
  } catch (error) { return failure(error); }
}
export async function PUT(req: NextRequest) { return mutate(req); }
export async function POST(req: NextRequest) { return mutate(req, true); }
