import connectDB from "@/lib/mongo";
import Location_heads from "@/models/location_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { LocHeadId } = await req.json();


        const location = await Location_heads.findById(LocHeadId);
        if(!location){
            return NextResponse.json({ error: "Location Not Found" }, { status: 404 });
        }

        const user_roles = await User_roles.find({ user_id: location?.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("LOCATION_HEAD")) {
            const role = await Roles.findOne({ role_name: "LOCATION_HEAD" });
            await User_roles.deleteOne({ user_id: location?.user_id, role_id: role?._id });
        }

        await Location_heads.findByIdAndUpdate(LocHeadId, { status: 0 });
        return NextResponse.json({ message: "Location removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
