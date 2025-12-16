import connectDB from "@/lib/mongo";
import Location_departments from "@/models/location_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocDepId } = await req.json();

        const loc_dep = await Location_departments.findById(LocDepId);
        if(!loc_dep){
            return NextResponse.json({ error: "Location Department Not Found" }, { status: 404 });
        }

        await Location_departments.findByIdAndUpdate(LocDepId, { status: 0 });
        return NextResponse.json({ message: "Location Department removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
