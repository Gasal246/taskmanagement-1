import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongo';
import { enquiryActor } from '@/lib/enquiries/access';
import { transitionWorkflow } from '@/lib/enquiries/workflow-progress-server';
import { WorkflowError } from '@/lib/enquiries/workflow';
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    let body;
    try { body = await req.json(); } catch { return NextResponse.json({ message: 'Invalid JSON' }, { status: 400 }); }
    await transitionWorkflow(body, actor);
    return NextResponse.json({ message: 'Enquiry workflow updated' });
  } catch (error) {
    if (error instanceof WorkflowError) return NextResponse.json({ message: error.message }, { status: error.status });
    console.error('Workflow transition failed', error);
    return NextResponse.json({ message: 'Unable to update workflow' }, { status: 500 });
  }
}
