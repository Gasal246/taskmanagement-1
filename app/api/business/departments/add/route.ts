import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import Business_assined_plans from "@/models/business_assigned_plan.model";
import Business_departments from "@/models/business_departments.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    business_id: string;
    dep_name: string;
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const business = await Business.findOne({ _id: body.business_id, status: 1 });
        if(!business){
            console.log("Business Not Found")
            return NextResponse.json({ error: "Business Not Found" }, { status: 404 });
        }

        const businessPlan = await Business_assined_plans.findOne({ business_id: body.business_id, status: 1 })
            .populate({
                path: "plan_id",
                select: { deps_count: 1 }
            });
        if(!businessPlan){
            console.log("Business Plan Not Found")
            return NextResponse.json({ error: "Business Plan Not Found" }, { status: 404 });
        }

        const totalBusinessDeps = await Business_departments.countDocuments({ business_id: body.business_id, status: 1 });
        if(totalBusinessDeps >= businessPlan?.plan_id?.deps_count) {
            console.log("Business Plan Limit Exceeded")
            return NextResponse.json({ error: "Business Plan Limit Exceeded", status: 302 }, { status: 302 });
        }

        const newDepartment = new Business_departments({
            business_id: body.business_id,
            dep_name: body.dep_name,
            status: 1,
        });
        await newDepartment.save();

        return NextResponse.json({ message: "Department added successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
