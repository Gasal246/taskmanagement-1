import connectDB from "@/lib/mongo";
import Business_staffs from "@/models/business_staffs.model";
import User_skills from "@/models/user_skills.model";
import { NextRequest, NextResponse } from "next/server";
import '@/models/business_skills.model';

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const business_id = searchParams.get("business_id");
        const skill_id = searchParams.get("skill_id");
        if (!business_id) {
            return NextResponse.json({ message: "Business ID is required", status: 400 }, { status: 400 });
        }
        const staffs = await Business_staffs.find({ business_id: business_id, status: 1 })
            .populate({
                path: "user_id",
                select: "name status email phone avatar_url",
                match: { status: 1 }
            })
            .lean();

        const activeStaffs = staffs.filter((staff: any) => staff?.user_id);
        const filteredStaffs: any[] = [];
        for (const staff of activeStaffs) {
            const skills = await User_skills.find({
                user_id: staff.user_id._id,
                status: 1,
                ...(skill_id ? { skill_id } : {})
            })
                .populate("skill_id", "skill_name")
                .lean();

            if (skill_id && skills.length === 0) {
                continue;
            }
            staff.skills = skills;
            filteredStaffs.push(staff);
        }

        return NextResponse.json({ data: filteredStaffs, status: 200 }, { status: 200 });

    }catch(err){
        console.log("Error while getting staffs with skill: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}
