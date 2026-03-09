import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_comments from "@/models/eq_enquiry_comments.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const enquiryId = searchParams.get("enquiry_id");

    if (!enquiryId) {
      return NextResponse.json({ message: "Enquiry ID is required", status: 400 }, { status: 400 });
    }

    let comments = await Eq_enquiry_comments.find({ enquiry_id: enquiryId })
      .sort({ createdAt: -1 })
      .populate({ path: "user_id", select: "name email" })
      .lean();

    if (comments.length === 0) {
      const legacyEnquiry: any = await Eq_enquiry.findById(enquiryId).select("comments createdBy").lean();
      const legacyComment = String(legacyEnquiry?.comments || "").trim();
      const legacyAuthor = String(legacyEnquiry?.createdBy || "").trim();

      if (legacyComment && legacyAuthor) {
        await new Eq_enquiry_comments({
          enquiry_id: enquiryId,
          user_id: legacyAuthor,
          comment: legacyComment,
        }).save();

        comments = await Eq_enquiry_comments.find({ enquiry_id: enquiryId })
          .sort({ createdAt: -1 })
          .populate({ path: "user_id", select: "name email" })
          .lean();
      }
    }

    return NextResponse.json({ comments, status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while fetching enquiry comments:", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
