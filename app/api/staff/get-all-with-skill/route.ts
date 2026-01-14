import connectDB from "@/lib/mongo";
import Business_staffs from "@/models/business_staffs.model";
import User_skills from "@/models/user_skills.model";
import Business_Tasks from "@/models/business_tasks.model";
import Task_Activities from "@/models/task_activities.model";
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

        const staffUserIds = filteredStaffs
            .map((staff: any) => staff?.user_id?._id)
            .filter(Boolean);

        if (staffUserIds.length > 0) {
            const [taskCounts, activityCounts] = await Promise.all([
                Business_Tasks.aggregate([
                    { $match: { assigned_to: { $in: staffUserIds } } },
                    { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
                ]),
                Task_Activities.aggregate([
                    { $match: { assigned_to: { $in: staffUserIds } } },
                    { $group: { _id: "$assigned_to", count: { $sum: 1 } } },
                ]),
            ]);

            const taskCountMap = new Map(
                taskCounts.map((item: any) => [item._id.toString(), item.count])
            );
            const activityCountMap = new Map(
                activityCounts.map((item: any) => [item._id.toString(), item.count])
            );

            for (const staff of filteredStaffs) {
                const staffId = staff?.user_id?._id?.toString();
                staff.task_count = staffId ? taskCountMap.get(staffId) || 0 : 0;
                staff.activity_count = staffId ? activityCountMap.get(staffId) || 0 : 0;
            }
        } else {
            for (const staff of filteredStaffs) {
                staff.task_count = 0;
                staff.activity_count = 0;
            }
        }

        return NextResponse.json({ data: filteredStaffs, status: 200 }, { status: 200 });

    }catch(err){
        console.log("Error while getting staffs with skill: ", err);
        return NextResponse.json({message:"Internal Server Error", status:500}, {status:500})
    }
}
