import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import Business_staffs from "@/models/business_staffs.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const { searchParams } = await req.nextUrl;
        const business_id = await searchParams.get("business_id");
        console.log("business_id", business_id);
        
        await Business.findOne({}).limit(1); // JUST REFRESING THE SCHEMA FOR POPULATING IT
        const allStaffs = await Business_staffs.find({ business_id })
            .populate({
                path: "user_id",
                select: { password: 0, otp: 0 }
            });
        return NextResponse.json(allStaffs);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
