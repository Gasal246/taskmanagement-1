import { requireSuperadmin } from "@/lib/server-access";
import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import { NextResponse } from "next/server";
export async function GET () {
    try {
        await connectDB();
        const denied = await requireSuperadmin();
        if (denied) return denied;

        const businesses = await Business.find({ status: 1 });
        return Response.json({ data: businesses, status: 200 });
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
