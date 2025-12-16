import connectDB from "@/lib/mongo";
import Area_heads from "@/models/area_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST ( req: NextRequest ) {
    try {
        const { AreaHId } = await req.json();
        const areaH = await Area_heads.findById(AreaHId);
        if(!areaH){
            return NextResponse.json({ error: "Area Head Not Found" }, { status: 404 });
        }

        const head_areas = await Area_heads.find({ user_id: areaH?.user_id });
        if(head_areas?.length === 0) {
            const user_roles = await User_roles.find({ user_id: areaH?.user_id }).populate("role_id");
            const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
            if(roles?.includes("AREA_HEAD")) {
                const role = await Roles.findOne({ role_name: "AREA_HEAD" });
                await User_roles.deleteOne({ user_id: areaH?.user_id, role_id: role?._id });
            }
        }
        
        await Area_heads.findByIdAndUpdate(AreaHId, { status: 0 });
        return NextResponse.json({ message: "Area Head Removed Successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error.message);
        return NextResponse.json(`Internal Server Error ${error.message}`, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
