import connectDB from "@/lib/mongo";
import Business_skills from "@/models/business_skills.model";
import User_skills from "@/models/user_skills.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    skill_id: string;
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);

        const user = await Users.findOne({ _id: body.user_id });
        if(!user){
            console.log("User Not Found");
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const skill = await Business_skills.findOne({ _id: body.skill_id, status: 1 });
        if(!skill){
            console.log("Skill Not Found");
            return NextResponse.json({ error: "Skill Not Found" }, { status: 404 });
        }

        const userSkill = await User_skills.findOne({ user_id: body.user_id, skill_id: body.skill_id });
        if(userSkill?.status === 0){
            await User_skills?.findByIdAndUpdate(userSkill._id, { status: 1 });
            return NextResponse.json({ message: "Skill added successfully", status: 200 }, { status: 200 });
        }
        if(userSkill){
            console.log("Skill Already Added");
            return NextResponse.json({ error: "Skill Already Added" }, { status: 400 });
        }

        const newUserSkill = new User_skills({
            user_id: body.user_id,
            skill_id: body.skill_id,
        });
        await newUserSkill.save();

        return NextResponse.json({ message: "Skill added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
