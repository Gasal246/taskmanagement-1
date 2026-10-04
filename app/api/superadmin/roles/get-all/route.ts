import connectDB from "@/lib/mongo";
import Roles from "@/models/roles.model";
import { NextResponse } from "next/server";

export async function GET () {
    try {
        await connectDB();
        const roles = await Roles.find();
        return Response.json({ status: 200, data: roles });
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
