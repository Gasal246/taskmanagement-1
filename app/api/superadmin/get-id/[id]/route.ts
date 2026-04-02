import connectDB from "@/lib/mongo";
import Superadmin from "@/models/superAdminCollection";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const superAdmin = await Superadmin.findById(id, { password: 0 });
        return Response.json(superAdmin);
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = "force-dynamic";
