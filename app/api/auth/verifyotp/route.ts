import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB()

export async function POST(req: NextRequest){
    try {
        const { email, otp } = await req.json();
        const user = await Users.findOne({ email });
        if(!user){
            throw new Error("User Not Found.. check session > user > id")
        }
        if(!user?.otp){
            throw new Error("Verification Code Not Found ")
        }
        if(user?.otp === otp){
            await Users.findByIdAndUpdate(user?._id, { otp: null });
            return NextResponse.json({ status: true, message: "OTP Verified Successfully." });
        }else{
            throw new Error("OTP Verification Failed.")
        }
    } catch (error) {
        console.log(error);
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = "force-dynamic"
