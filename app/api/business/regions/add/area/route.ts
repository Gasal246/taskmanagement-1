import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    area_name: string;
    region_id: string;
    business_id: string;
}

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const area = await Business_areas?.findOne({ area_name: body.area_name, region_id: body.region_id });
        if(area?.status === 0) {
            await Business_areas?.findByIdAndUpdate(area?._id, { status: 1 });
            return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
        }
        
        if(area) {
            return NextResponse.json({ error: "Area already exists", status: 400 }, { status: 400 });
        }

        const newArea = new Business_areas({
            area_name: body.area_name,
            region_id: body.region_id,
            business_id: body.business_id,
        })

        await newArea.save();

        return NextResponse.json({ message: "Region added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
