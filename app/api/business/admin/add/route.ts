import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Roles from "@/models/roles.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    [key: string]: string;
    business_id: string;
    admin_name: string;
    admin_email: string;
    admin_phone: string;
}
    

export async function POST (req: NextRequest) {
    try {
        const session = await auth();
        if(!session){
            return new NextResponse("Unauthorized", { status: 401 });
        }
        
        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;

        const admin_user = await Users.findOne({ email: bodyData?.admin_email });

        if(admin_user){
            const business = await Admin_assign_business.findOne({ business_id: bodyData?.business_id, user_id: admin_user?._id });
            if(business){
                return new NextResponse("Admin Already Assigned", { status: 400 });
            }
            await checkOrAssignBusinessAdmin(admin_user?._id);
            const newAdmin = new Admin_assign_business({
                business_id: bodyData?.business_id,
                user_id: admin_user?._id,
            });
            await newAdmin.save();
            return new NextResponse("Admin Added Successfully", { status: 200 });
        }else{
            const newUser = new Users({
                name: bodyData?.admin_name,
                email: bodyData?.admin_email,
                phone: bodyData?.admin_phone,
            });
            const savedUser = await newUser.save();
            await checkOrAssignBusinessAdmin(savedUser?._id);
            const newAdmin = new Admin_assign_business({
                business_id: bodyData?.business_id,
                user_id: savedUser?._id,
            });
            await newAdmin.save();
            return new NextResponse("Admin Added Successfully", { status: 200 });
        }
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

async function checkOrAssignBusinessAdmin(user_id: string) {
    const user_roles = await User_roles.find({ user_id });
    const roles = user_roles?.map((role: any) => role?.role_id?.role_name);
    if(!roles?.includes("BUSINESS_ADMIN")) {
        const role = await Roles.findOne({ role_name: "BUSINESS_ADMIN" });
        const newUserRole = new User_roles({
            user_id,
            role_id: role?._id,
        });
        await newUserRole.save();
    }
}

export const dynamic = "force-dynamic";
