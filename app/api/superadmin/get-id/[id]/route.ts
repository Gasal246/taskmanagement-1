import connectDB from "@/lib/mongo";
import Superadmin from "@/models/superAdminCollection";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest, { params }:{ params: { id: string }}){
    try {
        const superAdmin = await Superadmin.findById(params?.id, { password: 0 });
        return Response.json(superAdmin);
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = "force-dynamic";
