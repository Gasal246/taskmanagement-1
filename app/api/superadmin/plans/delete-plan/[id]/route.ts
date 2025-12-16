import connectDB from "@/lib/mongo";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import Superadmin_plans from "@/models/super_admin_plans.model";
import Business_assined_plans from "@/models/business_assigned_plan.model";

connectDB();

export async function POST (req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session: any = await getServerSession(authOptions);
        if (!session) {
            return new NextResponse("Authorisation Error", { status: 401 })
        }

        let deletedPlan = null;
        
        const assignedBusinesses = await Business_assined_plans.find({ plan_id: params?.id }).countDocuments();
        if (assignedBusinesses && assignedBusinesses > 0) {
            deletedPlan = await Superadmin_plans.findByIdAndUpdate(params?.id, { status: 0 }, { new: true });
        } else {
            deletedPlan = await Superadmin_plans.findByIdAndDelete(params?.id);
        }

        return NextResponse.json(deletedPlan);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}