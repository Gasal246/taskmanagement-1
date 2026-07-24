import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";
import { authorizeProjectRequest } from "@/app/api/helpers/project-access";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const { searchParams } = new URL(req.url);
        const proj_dept_id = searchParams.get("proj_dept_id");

        if(!proj_dept_id){
            return NextResponse.json({message: "Project department id is required", status: 400}, {status: 400} );
        }
        const projectDepartment = await Project_Departments.findById(proj_dept_id).select("project_id");
        if (!projectDepartment) {
            return NextResponse.json({message: "Project department not found", status: 404}, {status: 404});
        }
        const authorization = await authorizeProjectRequest(projectDepartment.project_id.toString(), "manage");
        if (!authorization.ok) return authorization.response;
        await Project_Departments.findByIdAndDelete(proj_dept_id);
        return NextResponse.json({message: "Project department deleted successfully", status: 200}, {status: 200} );
    }catch(err){
        console.log("Error while deleting project dept: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}
