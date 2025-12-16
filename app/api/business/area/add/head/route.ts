import connectDB from "@/lib/mongo";
import Area_heads from "@/models/area_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    area_id: string;
    user_id: string;
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
        if(!roles?.includes("AREA_HEAD")) {
            const role = await Roles.findOne({ role_name: "AREA_HEAD" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const areaH = await Area_heads.findOne({ area_id: body.area_id, user_id: body.user_id });
        if(areaH?.status === 0) {
            await Area_heads.findByIdAndUpdate(areaH?._id, { status: 1 });
            return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
        }
        if(areaH){
            return NextResponse.json({ error: "Area already exists", status: 400 }, { status: 400 });
        }

        const newAreaH = new Area_heads({
            area_id: body.area_id,
            user_id: body.user_id,
        });
        await newAreaH.save();

        return NextResponse.json({ message: "Area added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
