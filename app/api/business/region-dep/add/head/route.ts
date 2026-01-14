import connectDB from "@/lib/mongo";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    reg_dep_id: string;
    user_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;

        const user = await Users.findById(bodyData.user_id);
        if(!user || user?.status === 0) {
            return NextResponse.json({ error: "User Not Found", status: 404 }, { status: 404 });
        }

        const user_roles = await User_roles.find({ user_id: bodyData.user_id }).populate("role_id");
        const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
        if(!roles?.includes("REGION_DEP_HEAD")) {
            const role = await Roles.findOne({ role_name: "REGION_DEP_HEAD" });
            const newUserRole = new User_roles({
                user_id: bodyData.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }
        const SDRole = user_roles.find(r => r?.role_id?.role_name === "REGION_DEP_HEAD" && r?.status === 0 );
        if(SDRole) {
            await User_roles.findByIdAndUpdate(SDRole._id, { status: 1 });
        }

        const data = await Region_dep_heads.findOne({ reg_dep_id: bodyData.reg_dep_id, user_id: bodyData.user_id });
        if(data?.status === 0) {
            await Region_dep_heads.findByIdAndUpdate(data?._id, { status: 1 });
            return NextResponse.json({ message: "Region department head reactivated successfully", status: 200 }, { status: 200 });
        }
        if(data) {
            return NextResponse.json("Region department head already exists", { status: 400 });
        }

        const newData = new Region_dep_heads({
            reg_dep_id: bodyData.reg_dep_id,
            user_id: bodyData.user_id,
        });

        await newData.save();
        return NextResponse.json({ message: "Region department head added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
