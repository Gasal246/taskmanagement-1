import connectDB from "@/lib/mongo";
import Area_staffs from "@/models/area_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextResponse } from "next/server";

connectDB();

export async function POST(req: Request) {
    const { AreaStaffId } = await req.json();
    try {
        const areaStaff = await Area_staffs.findById(AreaStaffId);
        if (!areaStaff) {
            return NextResponse.json({ error: "Area Staff not found" }, { status: 404 });
        }
        
        const staff_areas = await Area_staffs.find({ user_id: areaStaff?.user_id });
        if(staff_areas?.length === 0) {
            const user_roles = await User_roles.find({ user_id: areaStaff?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("AREA_STAFF")) {
                const role = await Roles.findOne({ role_name: "AREA_STAFF" });
                await User_roles.deleteOne({ user_id: areaStaff?.user_id, role_id: role?._id });
            }
        }

        await Area_staffs.findByIdAndUpdate(areaStaff?._id, { status: 0 });
        return NextResponse.json({ message: "Area Staff deleted successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.error("Error deleting area staff:", error);
        return NextResponse.json({ error: "Failed to delete area staff" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
