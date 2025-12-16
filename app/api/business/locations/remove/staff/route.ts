import connectDB from "@/lib/mongo";
import Location_staffs from "@/models/location_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocStaffId } = await req.json();

        const location = await Location_staffs.findById(LocStaffId);
        if(!location){
            return NextResponse.json({ error: "Location Not Found" }, { status: 404 });
        }

        const user_roles = await User_roles.find({ user_id: location?.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("LOCATION_STAFF")) {
            const role = await Roles.findOne({ role_name: "LOCATION_STAFF" });
            await User_roles.deleteOne({ user_id: location?.user_id, role_id: role?._id });
        }

        await Location_staffs.findByIdAndUpdate(LocStaffId, { status: 0 });
        return NextResponse.json({ message: "Location removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
