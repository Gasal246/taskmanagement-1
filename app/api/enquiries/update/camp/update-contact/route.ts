import { authorizeEnquiry, enquiryActor, editableEnquiryForCamp } from "@/lib/enquiries/access";
import mongoose from "mongoose";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import { NextRequest, NextResponse } from "next/server";

interface IBody {
_id: string,
contact_phone: string,
contact_email: string,
contact_authorization: string,
contact_designation: string,
contact_name: string,
is_decision_maker: string
}

export async function PUT(req:NextRequest){
    try{
        await connectDB();
        const body : IBody = await req.json();
        if (!mongoose.isValidObjectId(body._id)) return NextResponse.json({ message: "Provide a valid contact ID" }, { status: 400 });
        const contact: any = await Eq_camp_contacts.findById(body._id).lean();
        if (!contact) return NextResponse.json({ message: "Contact not found" }, { status: 404 });
        if (contact.enquiry_id) {
            const denied = await authorizeEnquiry(String(contact.enquiry_id), "edit");
            if (denied) return denied;
        } else {
            const actor = await enquiryActor();
            if (!actor) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
            if (!await editableEnquiryForCamp(String(contact.camp_id), actor)) return NextResponse.json({ message: "Forbidden" }, { status: 403 });
        }

        await Eq_camp_contacts.findByIdAndUpdate(body._id, {$set: {
            contact_name: body.contact_name,
            contact_email: body.contact_email,
            contact_phone: body.contact_phone,
            contact_authorization: body.contact_authorization,
            contact_designation: body.contact_designation,
            is_decision_maker: body.is_decision_maker == "true"
        }});

        return NextResponse.json({message: "Contact Updated", status: 200}, {status: 200});
    }catch(err){
        console.log("Error while updating contact: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}