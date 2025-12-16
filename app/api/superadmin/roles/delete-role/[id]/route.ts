import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const id = params.id;
        const response = await Roles.findByIdAndDelete(id);
        return Response.json({ status: 200, data: response });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const dynamic = "force-dynamic";
