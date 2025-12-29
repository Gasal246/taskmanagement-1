import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Business_Tasks from "@/models/business_tasks.model";
import Flow_Log from "@/models/Flow_Log.model";
import Project_Docs from "@/models/project_docs.model";
import Project_Departments from "@/models/project_departments.model";
import Project_Team_Members from "@/models/project_team_members.model";
import Project_Teams from "@/models/project_team.model";
import Users from "@/models/users.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "../../auth/[...nextauth]/route";
import mongoose from "mongoose";

connectDB();

export async function DELETE(req: NextRequest) {
  try {
    const session: any = await getServerSession(authOptions);
    if (!session) return new NextResponse("Un Authorized Access", { status: 401 });

    const { searchParams } = new URL(req.url);
    const project_id = searchParams.get("project_id");
    if (!project_id) {
      return NextResponse.json({ message: "Please Provide project_id", status: 400 }, { status: 400 });
    }
    if (!mongoose.Types.ObjectId.isValid(project_id)) {
      return NextResponse.json({ message: "Invalid project id", status: 400 }, { status: 400 });
    }

    const project = await Business_Project.findById(project_id);
    if (!project) {
      return NextResponse.json({ message: "Project not found", status: 404 }, { status: 404 });
    }

    const user = await Users.findById(session?.user?.id).select("name");

    const teams = await Project_Teams.find({ project_id }).select("_id");
    const teamIds = teams.map((team) => team._id);

    if (teamIds.length > 0) {
      await Project_Team_Members.deleteMany({ project_team_id: { $in: teamIds } });
    }

    await Promise.all([
      Project_Teams.deleteMany({ project_id }),
      Project_Departments.deleteMany({ project_id }),
      Project_Docs.deleteMany({ project_id }),
      Business_Tasks.deleteMany({ project_id }),
      Flow_Log.deleteMany({ project_id }),
    ]);

    await Business_Project.findByIdAndDelete(project_id);

    await Flow_Log.create({
      user_id: session?.user?.id,
      Log: `Project Deleted by - ${user?.name || "Unknown"}`,
      description: "Project deleted",
    });

    return NextResponse.json({ message: "Project deleted successfully", status: 200 }, { status: 200 });
  } catch (err) {
    console.log("Error while deleting project", err);
    return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
  }
}
