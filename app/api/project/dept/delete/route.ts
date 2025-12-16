import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const { searchParams } = new URL(req.url);
        const proj_dept_id = searchParams.get("proj_dept_id");

        if(!proj_dept_id){
            return NextResponse.json({message: "Project department id is required", status: 400}, {status: 400} );
        }
        
        await Project_Departments.findByIdAndDelete(proj_dept_id);
        return NextResponse.json({message: "Project department deleted successfully", status: 200}, {status: 200} );
    }catch(err){
        console.log("Error while deleting project dept: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}