import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest, { params }: { params: { email: string } }) {
    try {
        const { email } = params;
        const user = await Users.findOne({ email });
        return Response.json({ status: user ? true : false, user });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
};

export const dynamic = "force-dynamic";