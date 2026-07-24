import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";

connectDB();

export async function GET(req: NextRequest){
    try{
        const { searchParams } = new URL(req.url);
        const project_id = searchParams.get("project_id");
        if (!project_id) {
            return NextResponse.json({message: "Project id is required", status: 400}, {status: 400});
        }
        const authorization = await authorizeProjectRequest(project_id, "view");
        if (!authorization.ok) return authorization.response;
        const projectDepts = await Project_Departments.find({project_id: project_id}).lean();
        return NextResponse.json({data: projectDepts, status: 200}, {status:200});
    }catch(err){
        console.log("Error while getting project depts: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}
