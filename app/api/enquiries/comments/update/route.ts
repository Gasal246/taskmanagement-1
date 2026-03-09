import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_enquiry_comments from "@/models/eq_enquiry_comments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
  comment_id?: string;
  comment?: string;
}

export async function PUT(req: NextRequest) {
  try {
    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Unauthorized Access", status: 401 }, { status: 401 });
    }

    const body: Body = await req.json();
    const commentId = String(body?.comment_id || "").trim();
    const nextComment = String(body?.comment || "").trim();

    if (!commentId) {
      return NextResponse.json({ message: "Comment ID is required", status: 400 }, { status: 400 });
    }
    if (!nextComment) {
      return NextResponse.json({ message: "Comment cannot be empty", status: 400 }, { status: 400 });
    }

    const comment: any = await Eq_enquiry_comments.findById(commentId);
    if (!comment) {
      return NextResponse.json({ message: "Comment not found", status: 404 }, { status: 404 });
    }

    if (String(comment.user_id) !== String(session?.user?.id)) {
      return NextResponse.json({ message: "You can only edit your own comments", status: 403 }, { status: 403 });
    }

    comment.comment = nextComment;
    await comment.save();

    const populatedComment = await Eq_enquiry_comments.findById(comment._id)
      .populate({ path: "user_id", select: "name email" })
      .lean();

    return NextResponse.json({ message: "Comment updated", comment: populatedComment, status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while updating enquiry comment:", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
