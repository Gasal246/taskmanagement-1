import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { hash } from "bcrypt-ts";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { email, password } = await req.json();
        const user = await Users.findOne({ email });
        if(!user){
            return Response.json({ status: false })
        }
        const hashedPassword = await hash(password, 10);
        const updatedUser = await Users.findByIdAndUpdate(user?._id, { password: hashedPassword, otp: null });
        return Response.json(updatedUser)
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
