import connectDB from "@/lib/mongo";
import Area_departments from "@/models/area_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    dep_name: string;
    type: string;
    area_id: string;
    region_id: string;
    business_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const dep = await Area_departments.findOne({ area_id: body.area_id, type: body.type });
        if(dep?.status === 0) {
            await Area_departments.findByIdAndUpdate(dep?._id, { status: 1 });
            return NextResponse.json({ message: "Department added successfully", status: 200 }, { status: 200 });
        }
        if(dep){
            return NextResponse.json({ error: "Department already exists", status: 400 }, { status: 400 });
        }

        const newDep = new Area_departments({
            area_id: body.area_id,
            region_id: body.region_id,
            business_id: body.business_id,
            type: body.type,
            dep_name: body.dep_name,
        });
        await newDep.save();

        return NextResponse.json({ message: "Department added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

