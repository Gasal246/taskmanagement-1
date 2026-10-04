import { authorizeUserManagement } from "@/lib/server-access";
import connectDB from "@/lib/mongo";
import User_roles from "@/models/user_roles.model";
import { NextRequest, NextResponse } from "next/server";

export async function POST ( req: NextRequest ) {
    try {
        await connectDB();
        const { URoleId } = await req.json();

        const userRole = await User_roles.findById(URoleId);
        if(!userRole){
            return NextResponse.json({ error: "User Role Not Found" }, { status: 404 });
        }

        const accessDenied = await authorizeUserManagement(String(userRole.user_id), userRole.business_id);
        if (accessDenied) return accessDenied;
        await User_roles.findByIdAndUpdate(URoleId, { status: 0 });

        return NextResponse.json({ message: "User Role Removed Successfully", status: 200 }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
