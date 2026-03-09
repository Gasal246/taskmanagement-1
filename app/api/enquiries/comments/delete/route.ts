import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_comments from "@/models/eq_enquiry_comments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const commentId = searchParams.get("comment_id");

    if (!commentId) {
      return NextResponse.json({ message: "Comment ID is required", status: 400 }, { status: 400 });
    }

    const comment: any = await Eq_enquiry_comments.findById(commentId);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found", status: 404 }, { status: 404 });
    }

    if (String(comment.user_id) !== String(session?.user?.id)) {
      return NextResponse.json({ message: "You can only delete your own comments", status: 403 }, { status: 403 });
    }

    await Eq_enquiry_comments.findByIdAndDelete(commentId);

    return NextResponse.json({ message: "Comment deleted", status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while deleting enquiry comment:", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
