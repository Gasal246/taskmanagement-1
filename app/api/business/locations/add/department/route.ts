import connectDB from "@/lib/mongo";
import Location_departments from "@/models/location_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    location_id: string;
    area_id: string;
    region_id: string;
    dep_name: string;
    type: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const dep = await Location_departments?.findOne({ location_id: body.location_id, dep_name: body.dep_name, type: body.type });
        if(dep?.status === 0) {
            await Location_departments?.updateOne({ _id: dep?._id }, { $set: { status: 1 } });
            return NextResponse.json({ message: "Department added successfully", status: 200 }, { status: 200 });
        }
        if(dep){
            return NextResponse.json({ error: "Department already exists", status: 400 }, { status: 400 });
        }

        const newDep = new Location_departments({
            location_id: body.location_id,
            area_id: body.area_id,
            region_id: body.region_id,
            dep_name: body.dep_name,
            type: body.type,
        });
        await newDep.save();

        return NextResponse.json({ message: "Department added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";