import connectDB from "@/lib/mongo";
import Business_departments from "@/models/business_departments.model";
import Department_heads from "@/models/department_heads.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    dep_id: string;
    user_id: string;
    business_id: string;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const department = await Business_departments.findOne({ _id: body?.dep_id, status: 1 });
        if(!department){
            console.log("Department Not Found");
            return NextResponse.json({ error: "Department Not Found" }, { status: 404 });
        }
        
        const user = await Users.findOne({ _id: body?.user_id, status: 1 });
        if(!user){
            console.log("User Not Found");
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const role = await Roles.findOne({ role_name: "DEPARTMENT_HEAD"})
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
        
        const depHead = await Department_heads.findOne({ user_id: body?.user_id, dep_id: body?.dep_id });
        if(depHead?.status === 0) {
            await Department_heads.findByIdAndUpdate(depHead?._id, { status: 1 });
            return NextResponse.json({ message: "Department Head Re-Activated", status: 200 }, { status: 200 });
        }
        
        const newDepHead = new Department_heads({
            user_id: body?.user_id,
            dep_id: body?.dep_id,
            status: 1,
        });
        await newDepHead.save();
        return NextResponse.json({ message: "Department Head Added Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
