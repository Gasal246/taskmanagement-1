import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Superadmin_plans from "@/models/super_admin_plans.model";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { headers } from 'next/headers';

connectDB();

export async function GET() {
    try {
        const headersList = headers();
        const session = await getServerSession(authOptions);
        
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