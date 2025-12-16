import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const business_id = searchParams.get("business_id");
        if (!business_id) {
            return NextResponse.json("Business ID is required", { status: 400 })
        }
        const skills = await Business_skills.find({ business_id, status: 1 });
        return NextResponse.json({ data: skills, status: 200 });
    } catch (error) {
        return NextResponse.json("Internal Server Error", { status: 500 })
    }
}

export const dynamic = 'force-dynamic';
