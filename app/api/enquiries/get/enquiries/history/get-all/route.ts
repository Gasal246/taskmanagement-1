import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");
        if(!enquiry_id) return NextResponse.json({message: "Please provide enquiry id", status: 400}, {status: 400});

        const histories = await Eq_enquiry_histories.find({enquiry_id: enquiry_id}).sort({step_number: -1}).populate([
            {
                path: "assigned_to",
                select: "name email"
            },
            {
                path: "forwarded_by",
                select: "name email avatar_url"
            },
            {
                path: "changed_by",
                select: "name email avatar_url"
            }
        ]).lean();

        return NextResponse.json({histories, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while fetching enquiry histories: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
