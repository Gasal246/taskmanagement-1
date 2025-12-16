import connectDB from "@/lib/mongo";
import Business_departments from "@/models/business_departments.model";
import Business_regions from "@/models/business_regions.model";
import Department_regions from "@/models/department_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    dep_id: string;
    region_id: string;
    [key: string]: any;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const department = await Business_departments.findOne({ _id: body?.dep_id, status: 1 });
        if(!department){
            console.log("Department Not Found");
            return NextResponse.json({ error: "Department Not Found" }, { status: 404 });
        }
        
        const region = await Business_regions.findOne({ _id: body?.region_id, status: 1 });
        if(!region){
            console.log("Region Not Found");
            return NextResponse.json({ error: "Region Not Found" }, { status: 404 });
        }

        const dep_reg = await Department_regions?.findOne({ department_id: body?.dep_id, business_region_id: body?.region_id });
        if(dep_reg?.status === 0) {
            await Department_regions.findByIdAndUpdate(dep_reg?._id, { status: 1 });
            return NextResponse.json({ message: "Region Re-Activated", status: 200 }, { status: 200 });
        }
        
        const newRegion = new Department_regions({
            department_id: body?.dep_id,
            business_region_id: body?.region_id,
            status: 1,
        });
        await newRegion.save();
        return NextResponse.json({ message: "Region Added Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
