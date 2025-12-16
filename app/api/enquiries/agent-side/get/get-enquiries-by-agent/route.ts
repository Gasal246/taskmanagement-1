import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_camps.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await getServerSession(authOptions);
        if(!session) return NextResponse.json({message: "Unauthorized access", status: 401}, {status: 401});

        console.log("user: ", session?.user?.id);
        

        const enquiries = await Eq_enquiry.find({createdBy: session?.user?.id}).populate("camp_id");
        console.log("eq: ", enquiries);
        
        if(enquiries.length > 0){
            return NextResponse.json({enquiries, status: 200}, {status: 200});
        }
        return NextResponse.json({message: "No Enquiries Found", enquiries, status: 203}, {status: 203});
    }catch(err){
        console.log("Error while getting enquiries by agent: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}