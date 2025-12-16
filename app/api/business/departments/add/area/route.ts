import connectDB from "@/lib/mongo";
import Business_departments from "@/models/business_departments.model";
import Business_regions from "@/models/business_regions.model";
import Department_areas from "@/models/department_areas.model";
import Department_regions from "@/models/department_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    area_id: string;
    region_id: string;
    department_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const department = await Business_departments.findOne({ _id: body?.department_id, status: 1 });
        if(!department){
            console.log("Department Not Found");
            return NextResponse.json({ error: "Department Not Found" }, { status: 404 });
        }

        const dep_reg = await Department_regions?.findOne({ department_id: body?.department_id, business_region_id: body?.region_id, status: 1 });
        if(!dep_reg){
            console.log("Region Not Found");
            return NextResponse.json({ error: "Region Not Found" }, { status: 404 });
        }

        const area = await Department_areas?.findOne({ dep_id: body?.department_id, area_id: body?.area_id })
        if(area?.status === 0) {
            await Department_areas?.findByIdAndUpdate(area._id, { status: 1 });
            return NextResponse.json({ message: "Area Re-Activated", status: 200 }, { status: 200 });
        }
        
        const newArea = new Department_areas({
            dep_id: body?.department_id,
            area_id: body?.area_id,
            dep_region_id: dep_reg?._id,
            status: 1,
        });
        await newArea.save();
        return NextResponse.json({ message: "Area Added Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
