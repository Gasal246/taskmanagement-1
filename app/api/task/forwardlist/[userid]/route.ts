import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Business_departments from "@/models/business_departments.model";
import Business_regions from "@/models/business_regions.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest, { params }: { params: { userid: string }}) {
    try {
        const userData = await Users.findById(params.userid, { Role: 1, Addedby: 1, Area: 1, Region: 1, Department: 1 });
        let fieldsUnder = {
            "department": [],
            "region": [],
            "area": [],
        };
        let yourStaffs = [];
        switch(userData?.Role) {
            case 'admin': {
                fieldsUnder['department'] = await Business_departments.find({ AdminId: params.userid });
                fieldsUnder['region'] = await Business_regions.find({ Administrator: params.userid });
                fieldsUnder['area'] = await Business_areas.find({ Administrator: params.userid });
            } break;
            case 'dep-head': {
                const department = await Business_departments.findOne({ DepartmentHead: userData?._id }, { _id: 1 });
                fieldsUnder['department'] = await Business_departments.find({ AdminId: userData?.Addedby });
                fieldsUnder['region'] = await Business_regions.find({ DepartmentId: department?._id });
                fieldsUnder['area'] = await Business_areas.find({ DepartmentId: department?._id });
                yourStaffs = await Users.find({ Department: department?._id, Role: 'dep-staff' }, { Name: 1, Email: 1, avatar_url: 1, Skills: 1, Role: 1 });
            } break;
            case 'region-head': {
                const region = await Business_regions.findOne({ RegionHead: userData?._id }, { DepartmentId: 1 });
                fieldsUnder['region'] = await Business_regions.find({ DepartmentId: region?.DepartmentId });
                fieldsUnder['area'] = await Business_areas.find({ RegionId: userData?.Region });
                yourStaffs = await Users.find({ Region: region?._id, Role: 'reg-staff' }, { Name: 1, Email: 1, avatar_url: 1, Skills: 1, Role: 1 });
            } break;
            case 'area-head': {
                const area = await Business_areas.findOne({ AreaHead: userData?._id }, { RegionId: 1 });
                fieldsUnder['area'] = await Business_areas.find({ RegionId: area?.RegionId });
                yourStaffs = await Users.find({ Area: area?._id, Role: 'staff' }, { Name: 1, Email: 1, avatar_url: 1, Skills: 1, Role: 1 });
            } break;
            default: {
                console.log("Un-registered User Role For Getting ForwardList.");
                throw new Error("Un-registered User Role For Getting ForwardList.")
            }
        }
        const returnData = {
            staffs: yourStaffs,
            fieldsUnder
        }
        return Response.json(returnData);
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
