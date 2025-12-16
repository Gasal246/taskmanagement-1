import connectDB from "@/lib/mongo";
import Region_staffs from "@/models/region_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { RegStaffId } = await req.json();

        const regStaff = await Region_staffs.findById(RegStaffId);
        if(!regStaff){
            return NextResponse.json({ error: "Region staff not found" }, { status: 404 });
        }

        const staff_regions = await Region_staffs.find({ user_id: regStaff?.user_id });
        if(staff_regions?.length === 0) {
            const user_roles = await User_roles.find({ user_id: regStaff?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("REGION_STAFF")) {
                const role = await Roles.findOne({ role_name: "REGION_STAFF" });
                await User_roles.deleteOne({ user_id: regStaff?.user_id, role_id: role?._id });
            }
        }

        await Region_staffs.findByIdAndUpdate(RegStaffId, { status: 0 });
        return NextResponse.json({ message: "Region staff removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error"}, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
