import { authorizeEnquiry } from "@/lib/enquiries/access";
import { enquiryHistoryPage } from "@/lib/enquiries/history-page";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    const params = new URL(req.url).searchParams;
    const id = params.get("enquiry_id");
    const denied = await authorizeEnquiry(id);
    if (denied) return denied;
    return NextResponse.json(await enquiryHistoryPage(id!, params, session.user.id));
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid ")) return NextResponse.json({ message: error.message }, { status: 400 });
    console.error("Error fetching staff enquiry histories", error);
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
  }
}
