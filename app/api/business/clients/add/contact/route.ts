import connectDB from "@/lib/mongo";
import Client_contacts from "@/models/client_contacts.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    client_id: string;
    contact_name: string;
    designation: string;
    email: string;
    phone: string;
}

export async function POST(req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const client_contact = await Client_contacts.findOne({ client_id: body.client_id, designation: body.designation, email: body.email });
        if(client_contact?.status === 0) {
            const res = await Client_contacts.findByIdAndUpdate(client_contact?._id, { status: 1, contact_name: body.contact_name, designation: body.designation, email: body.email, phone: body.phone });
            return NextResponse.json({ message: "Client Contact Re-Activated", status: 200, data: res }, { status: 200 });
        }

        if(client_contact){
            return NextResponse.json({ error: "Client contact already exists", status: 400 }, { status: 400 });
        }

        const newClientContact = new Client_contacts({
            client_id: body.client_id,
            contact_name: body.contact_name,
            designation: body.designation,
            email: body.email,
            phone: body.phone,
        });
        const res = await newClientContact.save();

        return NextResponse.json({ message: "Client Contact added successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: "Internal Server Error", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
