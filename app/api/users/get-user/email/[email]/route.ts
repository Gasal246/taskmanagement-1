import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET (
    req: NextRequest,
    { params }: { params: Promise<{ email: string }> }
) {
    try {
        await connectDB();
        if (!(await auth())?.user?.id) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        const { email } = await params;
        const user = await Users.findOne({ email, status: 1 }).select("_id name email").lean();
        return Response.json({ status: user ? true : false, user });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const dynamic = "force-dynamic";
