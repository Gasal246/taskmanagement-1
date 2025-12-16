import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { BSkillId } = await req.json();
        if (!BSkillId) {
            return NextResponse.json("Business Skill ID is required", { status: 400 })
        }
        const skill = await Business_skills.findById(BSkillId);
        if (!skill) {
            return NextResponse.json("Skill Not Found", { status: 404 })
        }
        await Business_skills.findByIdAndUpdate(BSkillId, { status: 0 });
        return NextResponse.json({ message: "Skill removed successfully", status: 200 }, { status: 200 })
    } catch (error) {
        return NextResponse.json("Internal Server Error", { status: 500 })
    }
}