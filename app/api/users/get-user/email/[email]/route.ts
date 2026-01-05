import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (
    req: NextRequest,
    { params }: { params: Promise<{ email: string }> }
) {
    try {
        const { email } = await params;
        const user = await Users.findOne({ email, status: 1 });
        return Response.json({ status: user ? true : false, user });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const dynamic = "force-dynamic";
