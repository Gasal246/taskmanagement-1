import connectDB from "@/lib/mongo";
import Project_Departments from "@/models/project_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function PUT(req: NextRequest){
    try{
        const {proj_dept_id} = await req.json();
        await Project_Departments.updateMany(
            { project_id: (await Project_Departments.findById(proj_dept_id))?.project_id },
            { $set: { is_active: false } }
        );
        await Project_Departments.findByIdAndUpdate(proj_dept_id, { is_active: true });
        return NextResponse.json({message: "Active department selected successfully", status: 200}, {status: 200});
    } catch(err){
        console.log("Error while selecting active dept: ", err);
        return NextResponse.json({message: "Internal Server Error", status:500}, {status: 500});
    }
}