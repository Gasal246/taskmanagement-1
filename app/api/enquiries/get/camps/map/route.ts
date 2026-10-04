import { temporaryDatabaseFailureResponse } from "@/lib/auth-availability";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { campMapPage, MapQueryError } from "@/lib/maps/camp-page";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    if (!(await auth())?.user?.id) return NextResponse.json({ message: "Sign in to continue" }, { status: 401 });
    await connectDB();
    // Approved facility geography is a shared catalogue; enquiry access is checked by its own routes.
    return NextResponse.json(await campMapPage(req.nextUrl.searchParams));
  } catch (error) {
    const unavailable = temporaryDatabaseFailureResponse(error);
    if (unavailable) return unavailable;
    if (error instanceof MapQueryError) return NextResponse.json({ message: error.message }, { status: 400 });
    console.error("Facility map loading failed");
    return NextResponse.json({ message: "Unable to load the map. Please try again." }, { status: 500 });
  }
}
export const dynamic = "force-dynamic";
