import connectDB from "@/lib/mongo";
import Business_clients from "@/models/business_clients.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    business_id: string;
    client_name: string;
    category: string;
    industry: string;
    business_type: string;
    short_name: string;
    tax_number: string;
    company_address: string;
    billing_address: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const client = await Business_clients.findOne({ client_name: body.client_name, business_id: body.business_id });
        if(client?.status === 0) {
            await Business_clients.findByIdAndUpdate(client?._id, { status: 1 });
            return NextResponse.json({ message: "Client Re-Activated", status: 200 }, { status: 200 });
        }
        if(client){
            return NextResponse.json({ error: "Client already exists", status: 400 }, { status: 400 });
        }

        const newClient = new Business_clients({
            client_name: body.client_name,
            business_id: body.business_id,
            category: body.category,
            industry: body.industry,
            business_type: body.business_type,
            short_name: body.short_name,
            tax_number: body.tax_number,
            company_address: body.company_address,
            billing_address: body.billing_address,
        });
        const newClientData = await newClient.save();

        return NextResponse.json({ message: "Client added successfully", status: 200, data: newClientData }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
