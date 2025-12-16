import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { BAid } = await req.json();

        const area = await Business_areas.findById(BAid);
        if(!area){
            return NextResponse.json({ error: "Area Not Found" }, { status: 404 });
        }

        await Business_areas.findByIdAndUpdate(BAid, { status: 0 });
        return NextResponse.json({ message: "Area removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

