import { auth } from "@/auth";
import { buildProjectDetails } from "@/app/api/helpers/project-details";
import { resolveProjectAccess } from "@/app/api/helpers/project-access";
import connectDB from "@/lib/mongo";
import { resolveSessionUserId } from "@/lib/utils";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ projectid: string }> }
) {
  try {
    const { projectid } = await context.params;
    if (!mongoose.Types.ObjectId.isValid(projectid)) {
      return NextResponse.json({ message: "Invalid project id" }, { status: 400 });
    }

    const session: any = await auth();
    if (!session) {
      return NextResponse.json({ message: "Un-Authorized Access" }, { status: 401 });
    }

    const access = await resolveProjectAccess(
      projectid,
      resolveSessionUserId(session)
    );
    if (!access) {
      return NextResponse.json({ message: "Project not found" }, { status: 404 });
    }
    if (!access.canView) {
      return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(
      { success: true, data: await buildProjectDetails(access) },
      { status: 200 }
    );
  } catch (error) {
    console.log("Error while fetching project details", error);
    return NextResponse.json(
      { message: "Internal Server Error" },
      { status: 500 }
    );
  }
}
