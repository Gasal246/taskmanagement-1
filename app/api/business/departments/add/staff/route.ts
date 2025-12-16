import connectDB from "@/lib/mongo";
import Dep_staffs from "@/models/department_staffs.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    dep_id: string;
    business_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const dep_staff = await Dep_staffs.findOne({ dep_id: body?.dep_id, user_id: body?.user_id })
        if(dep_staff?.status === 0) {
            await Dep_staffs.findByIdAndUpdate(dep_staff._id, { status: 1 });
            return NextResponse.json({ message: "Staff Re-Activated", status: 200 }, { status: 200 });
        }

        const role = await Roles.findOne({ role_name: "DEPARTMENT_STAFF"})
        if(!role){
            console.log("Role Not Found");
            return NextResponse.json({ error: "Role Not Found" }, { status: 404 });
        }

        const userRole = await User_roles.findOne({ user_id: body?.user_id, role_id: role._id, business_id: body?.business_id })
        if(!userRole) {
            const newUserRole = new User_roles({
                user_id: body?.user_id,
                role_id: role._id,
                business_id: body?.business_id,
                status: 1,
            });
            await newUserRole.save();
        }
        
        const newDepStaff = new Dep_staffs({
            dep_id: body?.dep_id,
            staff_id: body?.user_id,
            status: 1,
        });
        await newDepStaff.save();
        return NextResponse.json({ message: "Staff Added Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
