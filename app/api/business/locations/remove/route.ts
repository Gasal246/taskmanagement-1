import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocId } = await req.json();

        const location = await Business_locations.findById(LocId);
        if(!location){
            return NextResponse.json({ error: "Location Not Found" }, { status: 404 });
        }

        await Business_locations.findByIdAndUpdate(LocId, { status: 0 });
        return NextResponse.json({ message: "Location removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

