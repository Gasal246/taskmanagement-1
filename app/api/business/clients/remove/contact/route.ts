import connectDB from "@/lib/mongo";
import Client_contacts from "@/models/client_contacts.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const { BCContactId } = await req.json();
        const client_contact = await Client_contacts.findById(BCContactId);
        if (!client_contact) {
            return NextResponse.json({ error: "Client contact not found", status: 404 }, { status: 404 });
        }

        const res = await Client_contacts.findByIdAndUpdate(BCContactId, { status: 0 });
        return NextResponse.json({ message: "Client contact deleted successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete client contact", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
