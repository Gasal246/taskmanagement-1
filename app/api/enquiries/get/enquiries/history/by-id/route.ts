import { authorizeEnquiry } from "@/lib/enquiries/access";
import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req:NextRequest){
    try{
        await connectDB();
        const {searchParams} = new URL(req.url);
        const history_id = searchParams.get("history_id");

        if (!mongoose.isValidObjectId(history_id)) return NextResponse.json({ message: "Provide a valid history ID" }, { status: 400 });
        const history: any = await Eq_enquiry_histories.findById(history_id).lean();

        if (!history) return NextResponse.json({ message: "History not found" }, { status: 404 });
        const denied = await authorizeEnquiry(String(history.enquiry_id));
        if (denied) return denied;
        return NextResponse.json({history, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while fetching enquiry history: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}