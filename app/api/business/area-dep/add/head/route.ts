import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
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
        if(!roles?.includes("AREA_DEP_HEAD")) {
            const role = await Roles.findOne({ role_name: "AREA_DEP_HEAD" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const areaDepHead = await Area_dep_heads.findOne({ dep_id: body.dep_id, user_id: body.user_id });
        if(areaDepHead?.status === 0) {
            await Area_dep_heads.findByIdAndUpdate(areaDepHead?._id, { status: 1 });
            return NextResponse.json({ message: "Area Department Head added successfully", status: 200 }, { status: 200 });
        }
        if(areaDepHead){
            return NextResponse.json({ error: "Area Department Head already exists", status: 400 }, { status: 400 });
        }

        const newAreaDepHead = new Area_dep_heads({
            area_dep_id: body.dep_id,
            user_id: body.user_id,
        });
        await newAreaDepHead.save();
        return NextResponse.json({ message: "Area Department Head added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
