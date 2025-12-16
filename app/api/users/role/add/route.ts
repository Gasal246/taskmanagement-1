import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    user_id: string;
    role_id: string; // *** this will be role_name 
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body);

        const user = await Users.findOne({ _id: body.user_id, status: 1 });
        if(!user){
            return NextResponse.json({ error: "User Not Found" }, { status: 404 });
        }

        const role = await Roles.findOne({ role_name: body.role_id });
        if(!role){
            return NextResponse.json({ error: "Role Not Found" }, { status: 404 });
        }

        const userRole = await User_roles.findOne({ user_id: body.user_id, role_id: role._id });
        if(userRole && userRole?.status == 0) {
            await User_roles?.findByIdAndUpdate(userRole._id, { status: 1 });
            return NextResponse.json({ message: "Role added successfully", status: 200 }, { status: 200 });
        }
        if(userRole){
            return NextResponse.json({ error: "User Role Already Exists" }, { status: 400 });
        }

        const newUserRole = new User_roles({
            user_id: body.user_id,
            role_id: role._id,
        });
        await newUserRole.save();

        return NextResponse.json({ message: "Role added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";

