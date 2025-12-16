import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const { searchParams } = new URL(req.url);
   
        const enquiry_id = searchParams.get("enquiry_id");

        const contacts = await Eq_camp_contacts.find({enquiry_id: enquiry_id}).lean();

        return NextResponse.json({contacts, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting enquiry contact: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500})
    }
}