import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Business from "@/models/business.model";
import Business_assined_plans from "@/models/business_assigned_plan.model";
import Business_docs from "@/models/business_docs.model";
import Roles from "@/models/roles.model";
import Superadmin_plans from "@/models/super_admin_plans.model";
import User_roles from "@/models/user_roles.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    business_id: string;
    business_plan: any;
    business_admins: [
        {
            [key: string]: any;
            admin_name: string;
            admin_email: string;
            admin_phone: string;
        }
    ]
    business_docs: [
        {
            [key: string]: any;
            doc_name: string;
            doc_url: string;
            expires_at: string;
        }
    ]
    [key: string]: any;
};

export async function POST (req: NextRequest) {
    try {
        const formData = await req.formData();
        const { body } = Object.fromEntries(formData) as { body: string };
        const bodyData = await JSON.parse(body) as Body;

        console.log(bodyData);

        // assiging plan to business
        const business = await Business.findOne({ _id: bodyData?.business_id, status: 1 });
        if(!business){
            console.log("Business Not Found");
            return new NextResponse("Business Not Found", { status: 404 });
        }
        if(bodyData?.business_plan?._id){
            await Business_assined_plans.findOneAndDelete({ business_id: business?._id });
            const newBusinessPlan = new Business_assined_plans({
                plan_id: bodyData?.business_plan?._id,
                business_id: business?._id,
                status: 1,
            });
            await newBusinessPlan.save();
        }else{
            const newSuperAdminPlan = new Superadmin_plans({
                plan_name: bodyData?.business_plan?.plan_name,
                deps_count: bodyData?.business_plan?.deps_count,
                staff_count: bodyData?.business_plan?.staff_count,
                region_count: bodyData?.business_plan?.region_count,
                is_custom: true,
                status: 1,
            })
            const savedSuperAdminPlan = await newSuperAdminPlan.save();
            const newBusinessPlan = new Business_assined_plans({
                plan_id: savedSuperAdminPlan?._id,
                business_id: business?._id,
                status: 1,
            });
            await newBusinessPlan.save();
        }

        // adding business admin
        const businessAdminEmails = bodyData?.business_admins?.map((admin: any) => admin?.admin_email);
        const adminUsers = await Admin_assign_business.find({ business_id: business?._id }).populate({ path: "user_id", select: { email: 1 }});
        const adminUserEmails = adminUsers?.map((admin: any) => admin?.user_id?.email);

        const newAdmins = businessAdminEmails?.filter((email: string) => !adminUserEmails?.includes(email));

        const newAdminIds = await Promise.all(newAdmins?.map(async (email: string) => {
            const role = await Roles.findOne({ role_name: "BUSINESS_ADMIN" });
            const user_data = await Users.findOne({ email: email });
            if(user_data){
                const user_role = await User_roles.findOne({ user_id: user_data?._id, business_id: business?._id })
                    .populate({ path: "role_id", select: { role_name: 1 } });
                if(user_role?.role_id?.role_name === "BUSINESS_ADMIN"){
                    if(user_role?.status === 0){
                        await User_roles.findByIdAndUpdate(user_role?._id, { status: 1 });
                        return user_data?._id;
                    }
                    return user_data?._id;
                } else {
                    const newUserRole = new User_roles({
                        user_id: user_data?._id,
                        role_id: role?._id,
                        business_id: business?._id,
                    });
                    await newUserRole?.save();
                    return user_data?._id;
                }
            }
            const user = new Users({
                name: bodyData?.business_admins?.find((admin: any) => admin?.admin_email === email)?.admin_name,
                email: email,
                phone: bodyData?.business_admins?.find((admin: any) => admin?.admin_email === email)?.admin_phone,
                status: 1,
                admin_id: business?._id,
            });
            const savedUser = await user?.save();
            const newUserRole = new User_roles({
                user_id: savedUser?._id,
                role_id: role?._id,
                business_id: business?._id,
            });
            await newUserRole?.save();
            return savedUser?._id;
        }));
        
        const saveAdmins = newAdminIds.map((adminId: any) => {
            const admin = new Admin_assign_business({
                business_id: business?._id,
                user_id: adminId,
            })
            return admin;
        })
        await Promise.all(saveAdmins?.map((admin: any) => admin?.save()));

        // adding business docs
        await Promise.all(bodyData?.business_docs?.map(async (doc: any) => {
            const businessDoc = new Business_docs({
                doc_name: doc?.doc_name,
                doc_url: doc?.doc_url,
                expires_at: doc?.expires_at,
                business_id: business?._id,
            })
            await businessDoc?.save();
        }));

        return Response.json({ status: 200, message: "Business Added Successfully" });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
};

export const dynamic = "force-dynamic";

