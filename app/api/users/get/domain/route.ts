import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Area_heads from "@/models/area_heads.model";
import Area_staffs from "@/models/area_staffs.model";
import Business from "@/models/business.model";
import Department_heads from "@/models/department_heads.model";
import Dep_staffs from "@/models/department_staffs.model";
import Region_heads from "@/models/region_heads.model";
import Region_staffs from "@/models/region_staffs.model";
import Users from "@/models/users.model";
import '@/models/business_regions.model';
import "@/models/area_departments.model";
import "@/models/business_areas.model";
import "@/models/business_regions.model";
import "@/models/region_departments.model";
import { NextRequest, NextResponse } from "next/server";
import Location_heads from "@/models/location_heads.model";
import Location_staffs from "@/models/location_staffs.model";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import { isValidObjectId } from "mongoose";

connectDB();

export async function GET (req: NextRequest) {
    try {
        console.log("URL", req.url)
        const { searchParams } = new URL(req.url);
        const userid = searchParams.get('userid');
        const role = searchParams.get('role');

        if (!userid || !isValidObjectId(userid) || !role) {
            return NextResponse.json({ error: "Invalid user id or role" }, { status: 400 });
        }

        const user = await Users.findById(userid);
        if (!user) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        // JUST REFRESING THE SCHEMA FOR POPULATING IT
        await Business.findOne({}).limit(1);

        switch(role) {
            case 'BUSINESS_ADMIN': {
                const businesses = await Admin_assign_business.find({ user_id: userid })
                .populate({
                    path: "business_id"
                });
                return NextResponse.json({ businesses });
            };
            case 'REGION_DEP_HEAD': {
                const domains = await Region_dep_heads.find({ user_id: userid, status: 1 })
                .populate({
                    path: "reg_dep_id",
                    populate: {
                        path: "region_id"
                    }
                });
                console.log("region department: ", domains);
                
                const returnData = domains?.map((domain) => {
                    return {
                        value:domain?._id,
                        department_id: domain?.reg_dep_id?._id,
                        dept_name: domain?.reg_dep_id?.dep_name,
                        business_id: domain?.reg_dep_id?.region_id?.business_id,
                        staff_id: domain?.user_id,
                        type: domain?.reg_dep_id?.type
                    }
                })
                return NextResponse.json({ returnData });
            }
            case "REGION_DEP_STAFF": {
                const domains = await Region_dep_staffs.find({user_id: userid, status: 1}).populate({
                    path: "region_dep_id",
                    populate: {
                        path: "region_id"
                    }
                });
                
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        department_id: domain?.region_dep_id?._id,
                        dept_name: domain?.region_dep_id?.dep_name,
                        business_id: domain?.region_dep_id?.region_id?.business_id,
                        staff_id: domain?.user_id,
                        type: domain?.region_dep_id?.type
                    }
                })
                return NextResponse.json({ returnData });
            }
            case 'REGION_HEAD': {
                const domains = await Region_heads.find({ user_id: userid, status: 1 })
                .populate({
                    path: "region_id"
                });
                const returnData = domains?.map((domain)=>{
                    return {
                        value: domain?._id,
                        region_id: domain?.region_id?._id,
                        region_name: domain?.region_id?.region_name,
                        business_id: domain?.region_id?.business_id,
                        staff_id: domain?.staff_id,
                    }
                });
                
                return NextResponse.json({ returnData });
            }
            case "AREA_DEP_HEAD": {
                const domains = await Area_dep_heads.find({user_id: userid, status: 1}).populate({
                    path: "area_dep_id",
                    populate: {
                        path: "area_id"
                    }
                });
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        dept_name: domain?.area_dep_id?.dep_name,
                        department_id: domain?.area_dep_id?._id,
                        business_id: domain?.area_dep_id?.area_id?.business_id,
                        staff_id: domain?.user_id,
                        type: domain?.area_dep_id?.type
                    }
                })
                return NextResponse.json({ returnData });
            }
            case "AREA_DEP_STAFF": {
                const domains = await Area_dep_staffs.find({user_id: userid, status: 1}).populate({
                    path:"area_dep_id"
                });
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        dept_name: domain?.area_dep_id?.dep_name,
                        department_id: domain?.area_dep_id?._id,
                        business_id: domain?.area_dep_id?.business_id,
                        staff_id: domain?.user_id
                    }
                })
                return NextResponse.json({ returnData });
            }
            case 'AREA_HEAD': {
                const domains = await Area_heads.find({ user_id: userid, status: 1 })
                .populate({
                    path: "area_id"
                });

                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        area_name: domain?.area_id?.area_name,
                        area_id: domain?.area_id?._id,
                        business_id: domain?.area_id?.business_id,
                        staff_id: domain?.user_id
                    }
                })

                return NextResponse.json({ returnData });
            }
            case 'LOCATION_DEP_HEAD': {
                const domains = await Location_dep_heads.find({user_id: userid, status: 1}).populate({
                    path: "location_dep_id",
                    populate: {
                        path: "location_id"
                    }
                });

                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        dept_name: domain?.location_dep_id?.dep_name,
                        department_id: domain?.location_dep_id?._id,
                        business_id: domain?.location_dep_id?.location_id?.business_id,
                        staff_id: domain?.staff_id
                    }
                })

                return NextResponse.json({ returnData });
            }
            case "LOCATION_DEP_STAFF": {
                const domains = await Location_dep_staffs.find({user_id: userid, status: 1}).populate({
                    path: "location_dep_id",
                    populate: {
                        path: "location_id"
                    }
                });
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        dept_name: domain?.location_dep_id?.dep_name,
                        department_id: domain?.location_dep_id?._id,
                        business_id: domain?.location_dep_id?.location_id?.business_id,
                        staff_id: domain?.staff_id
                    }
                });
                return NextResponse.json({ returnData });
            }
            case 'REGION_STAFF': {
                const domains = await Region_staffs.find({ staff_id: userid, status: 1 })
                .populate({
                    path: "region_id"
                });
                const returnData = domains?.map((domain)=>{
                    return {
                        value: domain?._id,
                        region_name: domain?.region_id?.region_name,
                        status: domain?.status,
                        business_id: domain?.region_id?.business_id,
                        region_id: domain?.region_id?._id,
                        staff_id: domain?.staff_id,
                    }
                });
                
                return NextResponse.json({ returnData });
            }
            case 'AREA_STAFF': {
                const domains = await Area_staffs.find({ user_id: userid, status: 1 })
                .populate({
                    path: "area_id"
                });

                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        area_name: domain?.area_id?.area_name,
                        area_id: domain?.area_id?._id,
                        business_id: domain?.area_id?.business_id,
                        staff_id: domain?.staff_id
                    }
                })

                return NextResponse.json({ returnData });
            }
            case "LOCATION_HEAD": {
                const domains = await Location_heads.find({user_id: userid, status: 1}).populate({
                    path: "location_id"
                });
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        location_name: domain?.location_id?.location_name,
                        location_id: domain?.location_id?._id,
                        business_id: domain?.location_id?.business_id,
                        staff_id: domain?.user_id
                    }
                })

                return NextResponse.json({ returnData });
            }
            case "LOCATION_STAFF": {
                const domains = await Location_staffs.find({staff_id: userid, status: 1}).populate({
                    path: "location_id"
                });
                
                const returnData = domains?.map((domain) => {
                    return {
                        value: domain?._id,
                        location_name: domain?.location_id?.location_name,
                        location_id: domain?.location_id?._id,
                        business_id: domain?.location_id?.business_id,
                        staff_id: domain?.staff_id
                    }
                })
                return NextResponse.json({ returnData });
            }
            default: break;
        }
        return NextResponse.json({ error: "Invalid Role" }, { status: 400 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
