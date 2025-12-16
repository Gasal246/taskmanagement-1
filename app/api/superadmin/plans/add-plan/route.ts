import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Superadmin_plans from "@/models/super_admin_plans.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    plan_name: string;
    deps_count: number;
    staff_count: number;
    region_count: number;
    [key: string]: any;
}

export async function POST (req: NextRequest) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse("Authorisation Error", { status: 401 })
        }
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;
        const newPlan = new Superadmin_plans({
            plan_name: body.plan_name,
            deps_count: body.deps_count,
            staff_count: body.staff_count,
            region_count: body.region_count,
            status: 1,
        })
        const savedPlan = await newPlan.save();
        return Response.json(savedPlan);
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
