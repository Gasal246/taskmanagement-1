import connectDB from "@/lib/mongo";
import Region_heads from "@/models/region_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    region_id: string; // Business Region ID
    user_id: string; // User ID
}

export async function POST (req: NextRequest) {
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
        if(!roles?.includes("REGION_HEAD")) {
            const role = await Roles.findOne({ role_name: "REGION_HEAD" });
            const newUserRole = new User_roles({
                user_id: body.user_id,
                role_id: role?._id,
            })
            await newUserRole.save();
        }

        const head = await Region_heads.findOne({ region_id: body.region_id, user_id: body.user_id });
        if(head?.status === 0) {
            await Region_heads.findByIdAndUpdate(head?._id, { status: 1 });
            return NextResponse.json({ message: "Region head added successfully", status: 200 }, { status: 200 });
        }
        
        if(head) {
            return NextResponse.json({ error: "Region head already exists", status: 400 }, { status: 400 });
        }

        const newHead = new Region_heads({
            region_id: body.region_id,
            user_id: body.user_id,
        });
        await newHead.save();

        return NextResponse.json({ message: "Region head added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

