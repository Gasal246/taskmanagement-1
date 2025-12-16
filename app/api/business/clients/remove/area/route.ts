import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Client_areas from "@/models/client_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const { BCAreaId } = await req.json();
        const area = await Client_areas.findById(BCAreaId);
        if (!area) {
            return NextResponse.json({ error: "Area not found", status: 404 }, { status: 404 });
        }

        const res = await Client_areas.findByIdAndUpdate(BCAreaId, { status: 0 });
        return NextResponse.json({ message: "Area deleted successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete area", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
