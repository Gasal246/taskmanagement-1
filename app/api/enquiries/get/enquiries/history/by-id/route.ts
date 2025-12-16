import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const history_id = searchParams.get("history_id");

        const history = await Eq_enquiry_histories.findById(history_id).lean();

        return NextResponse.json({history, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while fetching enquiry history: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}