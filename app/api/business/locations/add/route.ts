import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    location_name: string;
    region_id: string;
    area_id: string;
    business_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const loc = await Business_locations.findOne({ location_name: body.location_name, region_id: body.region_id, area_id: body.area_id, business_id: body.business_id });
        if(loc?.status === 0) {
            await Business_locations.findByIdAndUpdate(loc?._id, { status: 1 });
            return NextResponse.json({ message: "Location added successfully", status: 200 }, { status: 200 });
        }
        if(loc){
            return NextResponse.json({ error: "Location already exists", status: 400 }, { status: 400 });
        }

        const newLocation = new Business_locations({
            location_name: body.location_name,
            region_id: body.region_id,
            area_id: body.area_id,
            business_id: body.business_id,
        });
        await newLocation.save();

        return NextResponse.json({ message: "Location added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
