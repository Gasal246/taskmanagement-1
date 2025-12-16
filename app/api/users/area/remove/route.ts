import connectDB from "@/lib/mongo";
import User_areas from "@/models/user_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { UAreaId } = await req.json();

        const userArea = await User_areas.findById(UAreaId);
        if(!userArea){
            return NextResponse.json({ error: "Area Not Found" }, { status: 404 });
        }

        await User_areas.findByIdAndUpdate(UAreaId, { status: 0 });

        return NextResponse.json({ message: "Area removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
