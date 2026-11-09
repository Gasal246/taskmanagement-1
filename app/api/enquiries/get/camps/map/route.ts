import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { enquiryActor, enquiryManagementFilter } from "@/lib/enquiries/access";
import connectDB from "@/lib/mongo";
import { campMapPage, MapQueryError } from "@/lib/maps/camp-page";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB({ throwOnError: true });
    const actor = await enquiryActor();
    if (!actor) return NextResponse.json({ message: "Sign in to continue" }, { status: 401 });
    if (!actor.admin) return NextResponse.json({ message: "Administrator access is required" }, { status: 403 });
    return NextResponse.json(await campMapPage(req.nextUrl.searchParams, enquiryManagementFilter(actor)));
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof MapQueryError) return NextResponse.json({ message: error.message }, { status: 400 });
    console.error("Facility map loading failed");
    return NextResponse.json({ message: "Unable to load the map. Please try again." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
