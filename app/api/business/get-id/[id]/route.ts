import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Admin_assign_business from "@/models/admin_assign_business.model";
import Business from "@/models/business.model";
import Business_assined_plans from "@/models/business_assigned_plan.model";
import Business_docs from "@/models/business_docs.model";
import Superadmin_plans from "@/models/super_admin_plans.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const session = await auth();
        if(!session){
            return new NextResponse("Unauthorized", { status: 401 });
        }
        const business = await Business.findById(id);
        if(!business){
            return new NextResponse("Business Not Found", { status: 404 });
        }

        // find business plan
        await Superadmin_plans.find({}).limit(1) //refreshing super admin plans collection for registering
        const businessPlan = await Business_assined_plans.findOne({ business_id: id })
            .populate({
                path: "plan_id",
            });

        // find business admins
        const businessAdminsRaw = await Admin_assign_business.find({ business_id: id })
            .populate({
                path: "user_id",
                select: { name: 1, email: 1, phone: 1, avatar_url: 1, _id: 1 },
            });

        const businessAdmins = businessAdminsRaw.map(item => {
            return {
                _id: item._id,
                business_id: item.business_id,
                user_id: item.user_id._id,
                admin_name: item.user_id.name,
                admin_email: item.user_id.email,
                admin_phone: item.user_id.phone,
            };
        });

        // find business docs
        const businessDocs = await Business_docs.find({ business_id: id });

        const businessInfo = {
            ...(business.toObject?.() ?? business),
            admins: businessAdmins
        };

        return Response.json({
            status: 200,
            data: {
                info: businessInfo,
                plan: businessPlan,
                admins: businessAdmins,
                docs: businessDocs,
            }
        })
        
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
