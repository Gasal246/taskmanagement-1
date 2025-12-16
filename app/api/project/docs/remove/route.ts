import connectDB from "@/lib/mongo";
import Project_Docs from "@/models/project_docs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
  try {
    const { doc_id } = await req.json();
    if (!doc_id) {
      return NextResponse.json({ error: "Document id is required" }, { status: 400 });
    }

    const doc = await Project_Docs.findById(doc_id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    await Project_Docs.findByIdAndDelete(doc_id);

    return NextResponse.json({ message: "Document removed successfully", status: 200 }, { status: 200 });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";
