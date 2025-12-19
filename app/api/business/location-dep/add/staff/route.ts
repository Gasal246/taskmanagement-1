import connectDB from "@/lib/mongo";
import Location_dep_staffs from "@/models/location_dep_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    dep_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const user_roles = await User_roles.find({ user_id: body.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("LOCATION_DEP_STAFF")) {
            const role = await Roles.findOne({ role_name: "LOCATION_DEP_STAFF" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const locationDepStaff = await Location_dep_staffs.findOne({ location_dep_id: body.dep_id, user_id: body.user_id });
        if(locationDepStaff?.status === 0) {
            await Location_dep_staffs.findByIdAndUpdate(locationDepStaff?._id, { status: 1 });
            return NextResponse.json({ message: "Location Department Staff added successfully", status: 200 }, { status: 200 });
        }
        if(locationDepStaff){
            return NextResponse.json({ error: "Location Department Staff already exists", status: 400 }, { status: 400 });
        }

        const newLocationDepStaff = new Location_dep_staffs({
            location_dep_id: body.dep_id,
            user_id: body.user_id,
            status: 1
        });
        await newLocationDepStaff.save();
        return NextResponse.json({ message: "Location Department Staff added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
