import connectDB from "@/lib/mongo";
import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { requireSuperadmin } from "@/lib/server-access";
import { NextRequest } from "next/server";
import Superadmin from "@/models/superAdminCollection";

export async function GET(req: NextRequest){
    try {
        await connectDB();
        const denied = await requireSuperadmin();
        if (denied) return denied;
        const { searchParams } = new URL(req.url);
        const userid = searchParams.get('id');
        if (!userid || !mongoose.isValidObjectId(userid)) return NextResponse.json({ message: "Invalid admin ID" }, { status: 400 });
        const information = await Superadmin?.findById(userid);
        return Response.json(information)
    } catch (error) {
        console.error("Admin lookup failed", error);
        return NextResponse.json({ message: "Unable to load administrator" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic"