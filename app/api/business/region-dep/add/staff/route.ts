import connectDB from "@/lib/mongo";
import Region_dep_staffs from "@/models/region_dep_staffs.model";
import Roles from "@/models/roles.model";
import User_details from "@/models/user_details.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    region_dep_id: string;
    user_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;

        const userRoles = await User_roles.find({user_id: bodyData.user_id}).populate("role_id");
        const roles = userRoles?.map((role:any)=> role?.role_id?.role_name);
        if(!roles.includes("REGION_DEP_STAFF")){
            const role = await Roles.findOne({role_name: "REGION_DEP_STAFF"});
            const newDepStaff = new User_roles({
                user_id: bodyData.user_id,
                role_id: role?._id
            });
            await newDepStaff.save();
        }

        const data = await Region_dep_staffs.findOne({ region_dep_id: bodyData.region_dep_id, user_id: bodyData.user_id });
        if(data?.status === 0) {
            await Region_dep_staffs.findByIdAndUpdate(data?._id, { status: 1 });
        }

        if(data) {
            return NextResponse.json("Region department staff already exists", { status: 400 });
        }
        console.log("region_dep_id: ", bodyData.region_dep_id);
        
        const newData = new Region_dep_staffs({
            region_dep_id: bodyData.region_dep_id,
            user_id: bodyData.user_id,
        });
        await newData.save();
        return NextResponse.json({ message: "Region department staff added successfully", status: 200 }, { status: 200 });
    } catch (error: any) {
        console.log(error?.message);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
