import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Project_Docs from "@/models/project_docs.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";
import ProjectTeams from "@/models/project_team.model";
import ProjectTeamMembers from "@/models/project_team_members.model";

connectDB();

export async function POST(req: NextRequest) {
  try {
    const formdata = await req.formData();
    const formData: any = Object.fromEntries(formdata);
    const body = JSON.parse(formData?.body || "{}");

    const { project_id, doc_name, doc_url, doc_type, storage_path, access_type = "public", access_to = [] } = body;

    if (!project_id || !doc_name || !doc_url) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }
    const authorization = await authorizeProjectRequest(project_id, "manage");
    if (!authorization.ok) return authorization.response;

    const project = await Business_Project.findById(project_id);
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }

    const existingDoc = await Project_Docs.findOne({
      project_id,
      doc_name: { $regex: new RegExp(`^${doc_name}$`, "i") },
      status: { $ne: 0 },
    });
    if (existingDoc) {
      return NextResponse.json({ error: "A document with this name already exists." }, { status: 409 });
    }

    let accessList = Array.isArray(access_to) ? access_to : [];
    if (access_type === "private") {
      const teams: any[] = await ProjectTeams.find({ project_id })
        .select("_id team_head")
        .lean();
      const members: any[] = await ProjectTeamMembers.find({
        project_team_id: { $in: teams.map((team: any) => team._id) },
      })
        .select("user_id")
        .lean();
      const allowedViewerIds = new Set([
        ...teams.map((team: any) => team.team_head?.toString?.()).filter(Boolean),
        ...members.map((member: any) => member.user_id?.toString?.()).filter(Boolean),
      ]);
      accessList = accessList
        .map((value: any) => value?.toString?.() ?? String(value))
        .filter((value: string) => allowedViewerIds.has(value));
      if (!accessList.includes(authorization.userId)) {
        accessList.push(authorization.userId);
      }
    } else {
      accessList = [];
    }

    const newDoc = new Project_Docs({
      project_id,
      doc_name,
      doc_url,
      doc_type,
      storage_path,
      access_type,
      access_to: accessList,
      created_by: authorization.userId,
      status: 1,
    });
    await newDoc.save();

    const populatedDoc = await Project_Docs.findById(newDoc._id).populate({
      path: "access_to",
      select: { name: 1, email: 1, avatar_url: 1 },
    });

    return NextResponse.json({ message: "Document added successfully", status: 200, doc: populatedDoc }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
