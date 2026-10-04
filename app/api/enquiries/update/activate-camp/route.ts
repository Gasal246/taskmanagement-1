import { approveEnquiryFacility } from "@/lib/enquiries/approve-facility";
import connectDB from "@/lib/mongo";
import { canChangeEnquiryFacility } from "@/lib/enquiries/access";
import { enquiryActor, canAdministerEnquiry } from "@/lib/enquiries/completion-server";
import { CatalogueValidationError, validateDynamicClassification } from "@/lib/enquiries/catalogue-server";
import { getCampVisitedStatusFromEnquiryStatus } from "@/lib/enquiries/camp-visited-status";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest) {
  await connectDB();
  const actor = await enquiryActor();
  if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
  if (!actor.admin) return NextResponse.json({ message: "Only an administrator can approve a Facility", status: 403 }, { status: 403 });

  const body: any = await req.json();
  if (!mongoose.isValidObjectId(body?.camp_id) || !mongoose.isValidObjectId(body?.enquiry_id)) {
    return NextResponse.json({ message: "Invalid Facility or enquiry", status: 400 }, { status: 400 });
  }

  const dbSession = await mongoose.startSession();
  try {
    await dbSession.withTransaction(async () => {
      await approveEnquiryFacility(actor, body, dbSession);
    });
    return NextResponse.json({ message: "Facility and enquiry approved", status: 200 }, { status: 200 });
  } catch (error: any) {
    const status = Number(error?.status) || 500;
    console.error("Error while approving Facility:", error);
    return NextResponse.json({ message: error?.message || "Internal Server Error", status }, { status });
  } finally {
    await dbSession.endSession();
  }
}
