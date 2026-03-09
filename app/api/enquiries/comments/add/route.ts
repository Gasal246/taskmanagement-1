import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_comments from "@/models/eq_enquiry_comments.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  enquiry_id?: string;
  comment?: string;
}

export async function POST(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    const body: Body = await req.json();
    const enquiryId = String(body?.enquiry_id || "").trim();
    const commentText = String(body?.comment || "").trim();

    if (!enquiryId) {
      return NextResponse.json({ message: "Enquiry ID is required", status: 400 }, { status: 400 });
    }
    if (!commentText) {
      return NextResponse.json({ message: "Comment cannot be empty", status: 400 }, { status: 400 });
    }

    const enquiryExists = await Eq_enquiry.findById(enquiryId).select("_id").lean();
    if (!enquiryExists) {
      return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
    }

    const createdComment = await new Eq_enquiry_comments({
      enquiry_id: enquiryId,
      user_id: session?.user?.id,
      comment: commentText,
    }).save();

    const populatedComment = await Eq_enquiry_comments.findById(createdComment._id)
      .populate({ path: "user_id", select: "name email" })
      .lean();

    return NextResponse.json(
      { message: "Comment added", comment: populatedComment, status: 201 },
      { status: 201 }
    );
  } catch (err) {
    console.log("Error while adding enquiry comment:", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
