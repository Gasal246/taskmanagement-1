import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const { id } = params;
        const user = await Users.findById(id, { password: 0, otp: 0 });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
