import connectDB from "@/lib/mongo";
import Region_dep_heads from "@/models/region_dep_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dep_head_id = searchParams.get("head_id");

        if (!dep_head_id) return NextResponse.json({ message: "Please Provide head id", status: 400 }, { status: 400 });

        const deleted = await Region_dep_heads.findByIdAndUpdate(dep_head_id, { status: 0 }, { new: true });

        const isAnyOtherHead = await Region_dep_heads.find({ user_id: deleted?.user_id, status: 1 });

        if (isAnyOtherHead.length === 0) {
            const role = await Roles.findOne({ role_name: "REGION_DEP_HEAD" });
            
            if (role) {
                
                const userRole = await User_roles.findOne({
                    user_id: deleted?.user_id,
                    role_id: role._id,
                });

                if (userRole) {
                    
                    userRole.status = 0;
                    await userRole.save();
                }
            }
        }

        return NextResponse.json({ message: "Head Removed", status: 200 }, { status: 200 });
    } catch (err) {
        console.log("Error while removing departmentHead: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}