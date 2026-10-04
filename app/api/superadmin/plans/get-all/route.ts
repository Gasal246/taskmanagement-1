import { requireSuperadmin } from "@/lib/server-access";
import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Superadmin_plans from "@/models/super_admin_plans.model";
import { NextResponse } from "next/server";
import { headers } from 'next/headers';

export async function GET() {
    try {
        await connectDB();
        const accessDenied = await requireSuperadmin();
        if (accessDenied) return accessDenied;
        const headersList = headers();
        const session = await auth();
        
        if (!session) {
            return new NextResponse("Unauthorized", { status: 401 });
        }
        
        const plans = await Superadmin_plans.find({ status: 1 });
        return NextResponse.json(plans);
    } catch (error) {
        console.error('Error in GET /api/superadmin/plans/get-all:', error);
        return NextResponse.json(
            { error: "Internal Server Error" }, 
            { status: 500 }
        );
    }
}