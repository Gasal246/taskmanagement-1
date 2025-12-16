import connectDB from "@/lib/mongo";
import Client_regions from "@/models/client_regions.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    client_id: string;
    region_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;
        
        const client_region = await Client_regions.findOne({ client_id: body.client_id, region_id: body.region_id });
        if(client_region?.status === 0) {
            const res = await Client_regions.findByIdAndUpdate(client_region?._id, { status: 1 });
            return NextResponse.json({ message: "Client Region Re-Activated", status: 200, data: res }, { status: 200 });
        }
        if( client_region ) {
            return NextResponse.json({ error: "Client region already exists", status: 400 }, { status: 400 });
        }

        const newClientRegion = new Client_regions({
            client_id: body.client_id,
            region_id: body.region_id,
        });
        const res = await newClientRegion.save();
        
        return NextResponse.json({ message: "Client Region added successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";
