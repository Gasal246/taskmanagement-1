import connectDB from "@/lib/mongo";
import Area_dep_staffs from "@/models/area_dep_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { AreaDepStaffId } = await req.json();
        const areaDepStaff = await Area_dep_staffs.findById(AreaDepStaffId);
        if(!areaDepStaff){
            return NextResponse.json({ error: "Area Department Staff Not Found" }, { status: 404 });
        }

        const staff_departments = await Area_dep_staffs.find({ user_id: areaDepStaff?.user_id });
        if(staff_departments?.length === 0) {
            const user_roles = await User_roles.find({ user_id: areaDepStaff?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("AREA_DEP_STAFF")) {
                const role = await Roles.findOne({ role_name: "AREA_DEP_STAFF" });
                await User_roles.deleteOne({ user_id: areaDepStaff?.user_id, role_id: role?._id });
            }
        }

        await Area_dep_staffs.findByIdAndUpdate(AreaDepStaffId, { status: 0 });
        return NextResponse.json({ message: "Area Department Staff removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
