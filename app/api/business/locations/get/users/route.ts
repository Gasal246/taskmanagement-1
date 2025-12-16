import connectDB from "@/lib/mongo";
import User_locations from "@/models/user_locations.model";
import mongoose from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const loc_id = searchParams.get("loc_id");

        if(!loc_id){
            return NextResponse.json({ error: "Location ID is required" }, { status: 400 });
        }

        const users = await User_locations.find({ location_id: loc_id, status: 1 })
            .populate({
                path: "user_id",
                select: { password: 0 }
            });

        return NextResponse.json({ data: users, status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json({ error: `Internal Server Error ${error.message}`, status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
