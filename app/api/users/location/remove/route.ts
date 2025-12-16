import connectDB from "@/lib/mongo";
import User_locations from "@/models/user_locations.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { ULocId } = await req.json();

        const location = await User_locations.findById(ULocId);
        if(!location){
            return NextResponse.json({ error: "Location Not Found" }, { status: 404 });
        }

        await User_locations.findByIdAndUpdate(ULocId, { status: 0 });
        return NextResponse.json({ message: "Location removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
};

export const dynamic = 'force-dynamic';

