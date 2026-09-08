import { handleTransition } from "@/lib/enquiries/completion-http";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import mongoose from "mongoose";
import { canReadEnquiry, enrichEnquiries, enquiryActor } from "@/lib/enquiries/completion-server";

export async function GET(req: NextRequest) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const id = req.nextUrl.searchParams.get("enquiry_id");
    if (!mongoose.isValidObjectId(id)) return NextResponse.json({ message: "Invalid enquiry ID" }, { status: 400 });
    const enquiry: any = await Eq_enquiry.findById(id).lean();
    if (!enquiry) return NextResponse.json({ message: "Enquiry not found" }, { status: 404 });
    if (!await canReadEnquiry(enquiry, actor)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    return NextResponse.json({ enquiry: (await enrichEnquiries([enquiry], actor))[0] });
  } catch (error) { console.error("Enquiry completion context failed", error); return NextResponse.json({ message: "Unable to load enquiry" }, { status: 500 }); }
}
export async function PUT(req: NextRequest) { return handleTransition(req); }
