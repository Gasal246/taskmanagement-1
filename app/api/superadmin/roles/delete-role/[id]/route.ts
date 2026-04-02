import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest, context: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await context.params;
        const response = await Roles.findByIdAndDelete(id);
        return Response.json({ status: 200, data: response });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const dynamic = "force-dynamic";
