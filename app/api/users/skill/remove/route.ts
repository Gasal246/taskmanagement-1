import connectDB from "@/lib/mongo";
import User_skills from "@/models/user_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { USkillId } = await req.json();

        const userSkill = await User_skills.findById(USkillId);
        if(!userSkill){
            return NextResponse.json({ error: "Skill Not Found" }, { status: 404 });
        }

        await User_skills.findByIdAndUpdate(USkillId, { status: 0 });

        return NextResponse.json({ message: "Skill removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
