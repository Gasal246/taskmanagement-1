import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import { NextResponse, NextRequest } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);
        const { skill_name, business_id } = body;

        if (!skill_name || !business_id) {
            return NextResponse.json({ error: "Skill name and business id are required" }, { status: 400 });
        }

        const skill = await Business_skills.findOne({ skill_name, business_id });
        if (skill?.status === 0) {
            await Business_skills.findByIdAndUpdate(skill?._id, { status: 1 });
            return NextResponse.json({ message: "Skill added successfully", status: 200 }, { status: 200 });
        }
        if (skill) {
            return NextResponse.json({ error: "Skill already exists", status: 400 }, { status: 400 });
        }

        const newSkill = new Business_skills({
            skill_name,
            business_id,
        });

        await newSkill.save();
        return NextResponse.json({ message: "Skill added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';

