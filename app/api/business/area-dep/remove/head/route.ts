import connectDB from "@/lib/mongo";
import Area_dep_heads from "@/models/area_dep_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { AreaDepHeadId } = await req.json();
        const areaDepHead = await Area_dep_heads.findById(AreaDepHeadId);
        if(!areaDepHead){
            return NextResponse.json({ error: "Area Department Head Not Found" }, { status: 404 });
        }

        const head_departments = await Area_dep_heads.find({ user_id: areaDepHead?.user_id });
        if(head_departments?.length === 0) {
            const user_roles = await User_roles.find({ user_id: areaDepHead?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("AREA_DEP_HEAD")) {
                const role = await Roles.findOne({ role_name: "AREA_DEP_HEAD" });
                await User_roles.deleteOne({ user_id: areaDepHead?.user_id, role_id: role?._id });
            }
        }

        await Area_dep_heads.findByIdAndUpdate(AreaDepHeadId, { status: 0 });
        return NextResponse.json({ message: "Area Department Head removed successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json(`Internal Server Error: ${error?.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
