import connectDB from "@/lib/mongo";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE ( req: NextRequest ) {
    try {
        const { searchParams } = req.nextUrl;
        const head_id = searchParams.get("head_id");
        if(!head_id) {
            return NextResponse.json({ error: "Head ID is required" }, { status: 400 });
        }

        const regDepHead = await Region_dep_heads.findById(head_id);
        if(!regDepHead){
            return NextResponse.json({ error: "Region Department Head Not Found" }, { status: 404 });
        }

        const head_departments = await Region_dep_heads.find({ user_id: regDepHead?.user_id });
        if(head_departments?.length === 0) {
            const user_roles = await User_roles.find({ user_id: regDepHead?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("REGION_DEP_HEAD")) {
                const role = await Roles.findOne({ role_name: "REGION_DEP_HEAD" });
                await User_roles.deleteOne({ user_id: regDepHead?.user_id, role_id: role?._id });
            }
        }

        await Region_dep_heads.findByIdAndUpdate(head_id, { status: 0 });
        return NextResponse.json({ message: "Region Department Head removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
