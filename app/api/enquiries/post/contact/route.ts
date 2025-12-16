import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_id: string,
    contact_name: string,
    contact_phone: string,
    contact_email: string,
    contact_authorization: string,
    contact_designation: string,
    is_decision_maker: string
};

export async function POST(req:NextRequest){
    try{
        let body : IBody = await req.json();

        const newContact = new Eq_camp_contacts({
            camp_id: body.camp_id,
            contact_name: body.contact_name,
            contact_email: body.contact_email,
            contact_phone: body.contact_phone,
            contact_authorization: body.contact_authorization,
            contact_designation: body.contact_designation,
            is_decision_maker: body.is_decision_maker == "Yes" ? true : false
        });

        await newContact.save();

        return NextResponse.json({message: "Contact Added", status: 201}, {status: 201});
    }catch(err){
        console.log("Error while adding new camp contact: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}