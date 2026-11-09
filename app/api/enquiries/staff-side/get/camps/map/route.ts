import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { enquiryActor } from "@/lib/enquiries/access";
import { staffEnquiryVisibilityStages } from "@/lib/enquiries/staff-visibility-pipeline";
import connectDB from "@/lib/mongo";
import { campMapPage, MapQueryError } from "@/lib/maps/camp-page";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Sign in to continue" }, { status: 401 });
    // Match the staff enquiry list, even for users who also hold an admin role.
    // Client-supplied user/business IDs never expand this visibility.
    const visibility = staffEnquiryVisibilityStages(new mongoose.Types.ObjectId(actor.actorId), {});
    return NextResponse.json(await campMapPage(req.nextUrl.searchParams, {}, visibility));
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof MapQueryError) return NextResponse.json({ message: error.message }, { status: 400 });
    console.error("Staff facility map loading failed");
    return NextResponse.json({ message: "Unable to load the map. Please try again." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
