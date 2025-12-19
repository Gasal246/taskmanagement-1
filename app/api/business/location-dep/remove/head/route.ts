import connectDB from "@/lib/mongo";
import Location_dep_heads from "@/models/location_dep_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocationDepHeadId } = await req.json();
        const locationDepHead = await Location_dep_heads.findById(LocationDepHeadId);
        if(!locationDepHead){
            return NextResponse.json({ error: "Location Department Head Not Found" }, { status: 404 });
        }

        const head_departments = await Location_dep_heads.find({ user_id: locationDepHead?.user_id });
        if(head_departments?.length === 0) {
            const user_roles = await User_roles.find({ user_id: locationDepHead?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("LOCATION_DEP_HEAD")) {
                const role = await Roles.findOne({ role_name: "LOCATION_DEP_HEAD" });
                await User_roles.deleteOne({ user_id: locationDepHead?.user_id, role_id: role?._id });
            }
        }

        await Location_dep_heads.findByIdAndUpdate(LocationDepHeadId, { status: 0 });
        return NextResponse.json({ message: "Location Department Head removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
