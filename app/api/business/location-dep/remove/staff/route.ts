import connectDB from "@/lib/mongo";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocationDepStaffId } = await req.json();
        const locationDepStaff = await Location_dep_staffs.findById(LocationDepStaffId);
        if(!locationDepStaff){
            return NextResponse.json({ error: "Location Department Staff Not Found" }, { status: 404 });
        }

        const staff_departments = await Location_dep_staffs.find({ user_id: locationDepStaff?.user_id });
        if(staff_departments?.length === 0) {
            const user_roles = await User_roles.find({ user_id: locationDepStaff?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("LOCATION_DEP_STAFF")) {
                const role = await Roles.findOne({ role_name: "LOCATION_DEP_STAFF" });
                await User_roles.deleteOne({ user_id: locationDepStaff?.user_id, role_id: role?._id });
            }
        }

        await Location_dep_staffs.findByIdAndUpdate(LocationDepStaffId, { status: 0 });
        return NextResponse.json({ message: "Location Department Staff removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
