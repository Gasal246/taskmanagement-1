import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongo";
import { enquiryActor } from "./access";
import { HeadOfficeError, requestBusiness, submitOfficeRequest, officeInBusiness } from "./head-office-requests";
import Camps from "@/models/eq_camps.model";

export async function staffHeadOfficeRequest(req: NextRequest, operation: "create" | "edit" | "remove") {
  let session: mongoose.ClientSession | undefined;
  try {
    await connectDB(); const actor = await enquiryActor(); if (!actor) throw new HeadOfficeError(401, "Unauthorized");
    const body = operation === "remove" ? { head_office_id: req.nextUrl.searchParams.get("head_office_id") } : await req.json();
    const { businessId } = await requestBusiness(req, actor, body);
    session = await mongoose.startSession(); let result;
    await session.withTransaction(async () => {
      const office = operation !== "create" ? await officeInBusiness(body.head_office_id, businessId, session) : null;
      const current = office ? await Camps.find({ headoffice_id: office._id }).distinct("_id").session(session!) : [];
      const selected = body.camp_ids || current.map(String);
      result = await submitOfficeRequest(actor, businessId, {
        operation, office_id: body.head_office_id, proposed: { ...office, ...body },
        camp_ids: operation === "remove" ? current.map(String) : selected,
        detach_camp_ids: operation === "edit" ? current.map(String).filter(value => !selected.includes(value)) : [],
        request_id: body.request_id, revision: body.revision,
      }, session);
    });
    return NextResponse.json({ message: result ? "Head office request submitted for admin approval" : "No head office changes to request", request: result, status: operation === "create" ? 201 : 200 }, { status: operation === "create" ? 201 : 200 });
  } catch (error: any) {
    return NextResponse.json({ message: error.code === 11000 ? "A pending request already exists" : error.message }, { status: error.code === 11000 ? 409 : error.status || 500 });
  } finally { await session?.endSession(); }
}
