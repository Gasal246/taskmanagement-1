import connectDB from "@/lib/mongo";
import Business_clients from "@/models/business_clients.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET ( req: NextRequest ) {
    try {
        const searchParams = req.nextUrl.searchParams;
        const business_id = searchParams.get("business_id");
        if (!business_id) {
            return NextResponse.json({ error: "Business ID is required" }, { status: 400 });
        }
        const clients = await Business_clients.find({ business_id, status: 1 });
        return NextResponse.json({ data: clients, status: 200 });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
