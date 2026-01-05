import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    skill_id: string;
    skill_name: string;
    business_id: string;
}

export async function POST(req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body || "{}") as Body;
        const { skill_id, skill_name, business_id } = body;

        if (!skill_id || !skill_name || !business_id) {
            return NextResponse.json({ error: "Skill id, skill name and business id are required" }, { status: 400 });
        }

        const skill = await Business_skills.findOne({ _id: skill_id, business_id });
        if (!skill) {
            return NextResponse.json({ error: "Skill not found", status: 404 }, { status: 404 });
        }

        const existingSkill = await Business_skills.findOne({
            business_id,
            skill_name,
            status: 1,
            _id: { $ne: skill_id }
        });
        if (existingSkill) {
            return NextResponse.json({ error: "Skill already exists", status: 400 }, { status: 400 });
        }

        await Business_skills.findByIdAndUpdate(skill_id, { skill_name });
        return NextResponse.json({ message: "Skill updated successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
