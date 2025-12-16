import connectDB from "@/lib/mongo";
import Location_staffs from "@/models/location_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    location_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const user_roles = await User_roles.find({ user_id: body.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("LOCATION_STAFF")) {
            const role = await Roles.findOne({ role_name: "LOCATION_STAFF" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const loc_staff = await Location_staffs.findOne({ user_id: body.user_id, location_id: body.location_id });
        if(loc_staff?.status === 0) {
            await Location_staffs.findByIdAndUpdate(loc_staff?._id, { status: 1 });
            return NextResponse.json({ message: "Location staff reactivated successfully", status: 200 }, { status: 200 });
        }
        if(loc_staff) {
            return NextResponse.json({ error: "Location staff already exists", status: 400 }, { status: 400 });
        }

        const newLocStaff = new Location_staffs({
            location_id: body.location_id,
            user_id: body.user_id,
        });
        await newLocStaff.save();

        return NextResponse.json({ message: "Location staff added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json({ error: `Internal Server Error ${error.message}`, status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
