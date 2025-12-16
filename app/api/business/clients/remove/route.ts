import connectDB from "@/lib/mongo";
import Business_clients from "@/models/business_clients.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function POST(req: NextRequest) {
    try {
        const { BClientId } = await req.json();
        const client = await Business_clients.findById(BClientId);
        if (!client) {
            return NextResponse.json({ error: "Client not found", status: 404 }, { status: 404 });
        }

        // todo: if no 'project_assign_clients' or 'task_assign_clients' then delete the entire client data along with the client's -> regions, areas, and contacts permenetly.

        const res = await Business_clients.findByIdAndUpdate(BClientId, { status: 0 });
        return NextResponse.json({ message: "Client deleted successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete client", status: 500 }, { status: 500 });
    }
}

export const dynamic = "force-dynamic";
