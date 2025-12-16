import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    enquiry_id: string,
    contact_name: string,
    contact_phone: string,
    contact_email: string,
    contact_authorization: string,
    contact_designation: string,
    is_decision_maker: string
}

export async function POST(req:NextRequest){
    try{
        const body: IBody = await req.json();

        const camp:any = await Eq_enquiry.findById(body.enquiry_id).select("camp_id").lean();
        
        const newContact = new Eq_camp_contacts({
            camp_id: camp?.camp_id,
            enquiry_id: body.enquiry_id,
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
        console.log("Error while adding contacts: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}