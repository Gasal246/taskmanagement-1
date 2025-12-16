import connectDB from "@/lib/mongo";
import Business_Project from "@/models/business_project.model";
import Project_Docs from "@/models/project_docs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
  try {
    const formdata = await req.formData();
    const formData: any = Object.fromEntries(formdata);
    const body = JSON.parse(formData?.body || "{}");

    const { project_id, doc_name, doc_url, doc_type, storage_path, access_type = "public", access_to = [], created_by } = body;

    if (!project_id || !doc_name || !doc_url) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

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
      if (created_by && !accessList.includes(created_by)) {
        accessList.push(created_by);
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
      created_by: created_by || null,
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
