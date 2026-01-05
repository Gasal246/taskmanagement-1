import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { isValidObjectId } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET (
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        if (!id || !isValidObjectId(id)) {
            return NextResponse.json({ error: "Invalid user id" }, { status: 400 });
        }
        const user = await Users.findOne({ _id: id, status: 1 }, { password: 0, otp: 0 });
        return NextResponse.json(user);
    } catch (error) {
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
