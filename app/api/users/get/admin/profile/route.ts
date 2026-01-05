import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Business from "@/models/business.model";
import Users from "@/models/users.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message:"Un-Authorized Access", status: 401}, {status: 401});

        const {searchParams} = new URL(req.url);
        const business_id = searchParams.get("business_id");

        if(!business_id) return NextResponse.json({message: "Please provide Business_id", status: 400}, {status: 400});

        const user_details = await Users.findById(session?.user?.id).select("-password -otp").lean();
        const business_details = await Business.findById(business_id);
        
        return NextResponse.json({user_details, business_details, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while fetching Admin Profile: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status:500});
    }
}