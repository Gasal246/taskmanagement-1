import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest){
    try{
        const { searchParams } = new URL(req.url);
        const project_id = searchParams.get("project_id");
        const projectDepts = await Project_Departments.find({project_id: project_id}).lean();
        return NextResponse.json({data: projectDepts, status: 200}, {status:200});
    }catch(err){
        console.log("Error while getting project depts: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}