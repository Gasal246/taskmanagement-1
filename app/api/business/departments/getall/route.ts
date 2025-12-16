import connectDB from "@/lib/mongo";
import Business_assined_plans from "@/models/business_assigned_plan.model";
import Business_departments from "@/models/business_departments.model";
import Superadmin_plans from "@/models/super_admin_plans.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const business_id = searchParams.get("business_id");
        
        if (!business_id) {
            return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
        }

        await Superadmin_plans.findOne({}).limit(1); // schema refresh
        const businessPlan = await Business_assined_plans.findOne({ business_id, status: 1 })
            .populate({
                path: "plan_id"
            });

        const departments = await Business_departments.find({ business_id });
        return NextResponse.json({ departments, businessPlan: businessPlan?.plan_id, status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
