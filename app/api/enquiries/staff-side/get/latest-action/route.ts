import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message:"Unauthorized Access", status: 401}, {status: 401});
        
        const {searchParams} = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");

        const latestAction:any = await Eq_enquiry_histories.findOne({enquiry_id: enquiry_id}).populate("camp_id").sort({step_number: -1}).lean();

        if(latestAction?.assigned_to != session?.user?.id) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 401});

        return NextResponse.json({action: latestAction, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting latest action of enquiry: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}