import connectDB from "@/lib/mongo";
import Region_heads from "@/models/region_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { RHid } = await req.json();

        const regHead = await Region_heads.findById(RHid);
        if(!regHead){
            return NextResponse.json({ error: "Region Head Not Found" }, { status: 404 });
        }

        const head_regions = await Region_heads.find({ user_id: regHead?.user_id });
        if(head_regions?.length === 0) {
            const user_roles = await User_roles.find({ user_id: regHead?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("REGION_HEAD")) {
                const role = await Roles.findOne({ role_name: "REGION_HEAD" });
                await User_roles.deleteOne({ user_id: regHead?.user_id, role_id: role?._id });
            }
        }

        await Region_heads.findByIdAndUpdate(RHid, { status: 0 });
        return NextResponse.json({ message: "Region Head removed successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
