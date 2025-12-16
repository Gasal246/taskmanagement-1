import connectDB from "@/lib/mongo";
import Area_staffs from "@/models/area_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    area_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const bodyData: any = Object.fromEntries(formData);
        const body = JSON.parse(bodyData?.body) as Body;

        const user = await Users.findById(body.user_id);
        if(!user || user?.status === 0) {
            return NextResponse.json({ error: "User Not Found", status: 404 }, { status: 404 });
        }

        const user_roles = await User_roles.find({ user_id: body.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("AREA_STAFF")) {
            const role = await Roles.findOne({ role_name: "AREA_STAFF" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const areaStaff = await Area_staffs.findOne({ area_id: body.area_id, staff_id: body.user_id });
        if(areaStaff?.status === 0) {
            await Area_staffs.findByIdAndUpdate(areaStaff?._id, { status: 1 });
            return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
        }
        if(areaStaff){
            return NextResponse.json({ error: "Area already exists", status: 400 }, { status: 400 });
        }

        const newAreaStaff = new Area_staffs({
            area_id: body.area_id,
            staff_id: body.user_id,
        });
        await newAreaStaff.save();

        return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
