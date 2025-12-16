import connectDB from "@/lib/mongo";
import Business_regions from "@/models/business_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { BRid } = await req.json();

        const region = await Business_regions.findById(BRid);
        if(!region){
            return NextResponse.json({ error: "Region Not Found" }, { status: 404 });
        }

        await Business_regions.findByIdAndUpdate(BRid, { status: 0 });
        return NextResponse.json({ message: "Region removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
