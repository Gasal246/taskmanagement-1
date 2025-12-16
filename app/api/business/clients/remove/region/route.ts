import connectDB from "@/lib/mongo";
import Business_regions from "@/models/business_regions.model";
import Client_regions from "@/models/client_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const { BCRegId } = await req.json();
        const region = await Client_regions.findById(BCRegId);
        if (!region) {
            return NextResponse.json({ error: "Region not found", status: 404 }, { status: 404 });
        }

        const res = await Client_regions.findByIdAndUpdate(BCRegId, { status: 0 });
        return NextResponse.json({ message: "Region deleted successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete region", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
