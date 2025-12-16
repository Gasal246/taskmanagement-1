import connectDB from "@/lib/mongo";
import Business_locations from "@/models/business_locations.model";
import Location_heads from "@/models/location_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    location_id: string;
    user_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const user_roles = await User_roles.find({ user_id: body.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("LOCATION_HEAD")) {
            const role = await Roles.findOne({ role_name: "LOCATION_HEAD" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const loc_head = await Location_heads.findOne({ user_id: body.user_id, location_id: body.location_id });
        if( loc_head?.status == 0) {
            await Location_heads.findByIdAndUpdate(loc_head?._id, { status: 1 });
            return NextResponse.json({ message: "Location head reactivated successfully", status: 200 }, { status: 200 });
        }
        if(loc_head) {
            return NextResponse.json({ error: "Location head already exists", status: 400 }, { status: 400 });
        }

        const newLocHead = new Location_heads({
            location_id: body.location_id,
            user_id: body.user_id,
        });
        await newLocHead.save();

        return NextResponse.json({ message: "Location head added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

