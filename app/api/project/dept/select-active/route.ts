import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";

connectDB();

export async function PUT(req: NextRequest){
    try{
        const {proj_dept_id} = await req.json();
        const projectDepartment = await Project_Departments.findById(proj_dept_id).select("project_id");
        if (!projectDepartment) {
            return NextResponse.json({message: "Project department not found", status: 404}, {status: 404});
        }
        const authorization = await authorizeProjectRequest(projectDepartment.project_id.toString(), "manage");
        if (!authorization.ok) return authorization.response;
        await Project_Departments.updateMany(
            { project_id: projectDepartment.project_id },
            { $set: { is_active: false } }
        );
        await Project_Departments.findByIdAndUpdate(proj_dept_id, { is_active: true });
        return NextResponse.json({message: "Active department selected successfully", status: 200}, {status: 200});
    } catch(err){
        console.log("Error while selecting active dept: ", err);
        return NextResponse.json({message: "Internal Server Error", status:500}, {status: 500});
    }
}
