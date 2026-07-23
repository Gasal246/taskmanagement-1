import {
  getHierarchyReassignmentHeads,
  resolveSelectedHeadContext,
} from "@/app/api/helpers/head-reassignment-scope";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
  try {
    const session: any = await auth();
    const userId = String(session?.user?.id || "");
    if (!userId) {
      return NextResponse.json(
        { message: "Un-Authorized Access", status: 401 },
        { status: 401 }
      );
    }

    const [activeUser, context] = await Promise.all([
      Users.exists({ _id: userId, status: 1 }),
      resolveSelectedHeadContext(req, userId),
    ]);
    if (!activeUser || !context) {
      return NextResponse.json(
        { message: "An active HEAD role and domain are required", status: 403 },
        { status: 403 }
      );
    }

    const data = await getHierarchyReassignmentHeads(context);
    return NextResponse.json(
      {
        message: "Hierarchy heads fetched successfully",
        status: 200,
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while loading hierarchy heads", error);
    return NextResponse.json(
      { message: "Internal Server Error", status: 500 },
      { status: 500 }
    );
  }
}
