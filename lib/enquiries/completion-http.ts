import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { enquiryActor, EnquiryRequestError, transitionEnquiry } from "./completion-server";
export async function handleTransition(req: NextRequest, reopen = false) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
    let body: any;
    try { body = await req.json(); } catch { return NextResponse.json({ message: "Invalid JSON", status: 400 }, { status: 400 }); }
    if (!body || typeof body !== "object") return NextResponse.json({ message: "Invalid request", status: 400 }, { status: 400 });
    await transitionEnquiry(body, actor, reopen);
    return NextResponse.json({ message: reopen ? "Enquiry reopened" : "Enquiry completed", status: 200 });
  } catch (error) {
    const status = error instanceof EnquiryRequestError ? error.status : 500;
    if (status === 500) console.error("Enquiry transition failed", error);
    return NextResponse.json({ message: error instanceof EnquiryRequestError ? error.message : "Unable to save enquiry", status }, { status });
  }
}
