import connectDB from "@/lib/mongo";
import Business_clients from "@/models/business_clients.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    client_id: string;
    client_name: string;
    category: string;
    industry: string;
    business_type: string;
    short_name: string;
    tax_number: string;
    company_address: string;
    billing_address: string;
}

export async function POST (req: NextRequest) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const client = await Business_clients.findById(body?.client_id);
        if (!client) {
            return NextResponse.json({ error: "Client not found", status: 404 }, { status: 404 });
        }

        const updatedClient = await Business_clients.findByIdAndUpdate(body?.client_id, {
            client_name: body?.client_name,
            category: body?.category,
            industry: body?.industry,
            business_type: body?.business_type,
            short_name: body?.short_name,
            tax_number: body?.tax_number,
            company_address: body?.company_address,
            billing_address: body?.billing_address,
        });

        return NextResponse.json({ message: "Client updated successfully", status: 200, data: updatedClient }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 })
    }
}

export const dynamic = "force-dynamic";
