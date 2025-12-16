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
        const staffs = await Business_staffs.find({business_id: business_id}).populate("user_id", "name").lean();
        console.log("users: ", staffs);
        
        for(const staff of staffs){
            const skills = await User_skills.find({user_id: staff.user_id._id}).populate("skill_id", "skill_name").lean();

            staff.skills = skills;
        }

        return NextResponse.json({data:staffs, status:200}, {status:200});

    }catch(err){
        console.log("Error while getting staffs with skill: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}