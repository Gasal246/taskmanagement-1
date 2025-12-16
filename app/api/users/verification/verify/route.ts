import connectDB from "@/lib/mongo";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST (req: NextRequest) {
    try {
        const { email, otp } = await req.json();
        const user = await Users.findOne({ email });
        if(!user){
            return Response.json({ status: false })
        }
        if(user?.otp !== otp){
            return Response.json({ status: false })
        }
        
        return Response.json({ status: true })
    } catch (error) {
        console.log(error)
        return new NextResponse("Internal Server Error", { status: 500 })
    }
}

export const dynamic = 'force-dynamic'
