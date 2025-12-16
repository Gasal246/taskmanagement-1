import connectDB from "@/lib/mongo";
import Business_regions from "@/models/business_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    region_name: string;
    business_id: string;
}

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        console.log("Body", body)

        const region = await Business_regions.findOne({ region_name: body.region_name, business_id: body.business_id });
        if(region?.status === 0) {
            await Business_regions.findByIdAndUpdate(region?._id, { status: 1 });
            return NextResponse.json({ message: "Region added successfully", status: 200 }, { status: 200 });
        }
        if(region){
            return NextResponse.json({ error: "Region already exists", status: 400 }, { status: 400 });
        }

        const newRegion = new Business_regions({
            region_name: body.region_name,
            business_id: body.business_id,
        });
        await newRegion.save();

        return NextResponse.json({ message: "Region added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
