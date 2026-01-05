import connectDB from "@/lib/mongo";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Area_departments from "@/models/area_departments.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Location_departments from "@/models/location_departments.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Region_departments from "@/models/region_departments.model";
import User_skills from "@/models/user_skills.model";
import '@/models/business_skills.model';
import '@/models/users.model';
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const { searchParams } = new URL(req.url);
        const department_id = searchParams.get("department_id");
        if(!department_id){
            return NextResponse.json({message: "Department id is required", status: 400}, {status: 400} );
        }
        
        const is_region = await Region_departments.findById(department_id).lean();
        if(is_region){
            const region_dept_staffs = await Region_dep_staffs.find({region_dep_id: department_id})
                .populate({
                    path: "user_id",
                    select: "name status",
                    match: { status: 1 }
                })
                .lean();
            const activeStaffs = region_dept_staffs.filter((staff: any) => staff?.user_id);
            for(const staff of activeStaffs){
                const skills = await User_skills.find({user_id: staff.user_id._id}).populate("skill_id", "skill_name").lean();
                staff.skills = skills;
            }

            return NextResponse.json({data: activeStaffs, status: 200}, {status:200});
        }

        const is_area = await Area_departments.findById(department_id).lean();
        if(is_area){
            const area_dept_staffs = await Area_dep_staffs.find({area_dep_id: department_id})
                .populate({
                    path: "user_id",
                    select: "name status",
                    match: { status: 1 }
                })
                .lean();
            const activeStaffs = area_dept_staffs.filter((staff: any) => staff?.user_id);
            for(const staff of activeStaffs){
                const skills = await User_skills.find({user_id: staff.user_id._id}).populate("skill_id", "skill_name").lean();
                staff.skills = skills;
            }

            return NextResponse.json({data: activeStaffs, status: 200}, {status:200});
        }

        const is_location = await Location_departments.findById(department_id).lean();
        if(is_location){
            const location_dept_staffs = await Location_dep_staffs.find({location_dep_id: department_id})
                .populate({
                    path: "user_id",
                    select: "name status",
                    match: { status: 1 }
                })
                .lean();
            const activeStaffs = location_dept_staffs.filter((staff: any) => staff?.user_id);
            for(const staff of activeStaffs){
                const skills = await User_skills.find({user_id: staff.user_id._id}).populate("skill_id", "skill_name").lean();
                staff.skills = skills;
            }

            return NextResponse.json({data: activeStaffs, status: 200}, {status:200});
        }

        return NextResponse.json({data: [], status: 200}, {status:200});

    }catch(err){
        console.log("Error while getting dept by dept id: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500} );
    }
}
