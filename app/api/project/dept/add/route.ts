import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import Location_departments from "@/models/location_departments.model";
import Project_Departments from "@/models/project_departments.model";
import Region_departments from "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body{
    project_id: string,
    department_id: string,
    department_name: string,
    is_active: boolean
}

export async function POST(req: NextRequest){
    try{

        const body: Body = await req.json();
        const [regionDepartment, areaDepartment, locationDepartment] = await Promise.all([
            Region_departments.exists({_id: body.department_id, status: 1}),
            Area_departments.exists({_id: body.department_id, status: 1}),
            Location_departments.exists({_id: body.department_id, status: 1}),
        ]);
        if (!regionDepartment && !areaDepartment && !locationDepartment) {
            return NextResponse.json(
                {message: "Only active departments can be added to a project", status: 400},
                {status: 400}
            );
        }
        const newPorjectDept = new Project_Departments({
            project_id: body.project_id,
            department_id: body.department_id,
            department_name: body.department_name,
            is_active: body.is_active
        });
        await newPorjectDept.save();
        
        return NextResponse.json({message: "Department added to project successfully", status: 201}, {status: 201} );

    }catch(err){
        console.log("Error while adding dept to project: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}
