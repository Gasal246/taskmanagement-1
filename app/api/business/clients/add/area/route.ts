import connectDB from "@/lib/mongo";
import Business_areas from "@/models/business_areas.model";
import Client_areas from "@/models/client_areas.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    client_id: string;
    area_id: string;
}

export async function POST ( req: NextRequest ) {
    try {
        const formdata = await req.formData();
        const formData: any = Object.fromEntries(formdata);
        const body = JSON.parse(formData?.body) as Body;

        const client_area = await Client_areas.findOne({ client_id: body.client_id, area_id: body.area_id });
        if(client_area?.status === 0) {
            const res = await Client_areas.findByIdAndUpdate(client_area?._id, { status: 1 });
            return NextResponse.json({ message: "Client Area Re-Activated", status: 200, data: res }, { status: 200 });
        }

        if(client_area){
            return NextResponse.json({ error: "Client area already exists", status: 400 }, { status: 400 });
        }

        const newClientArea = new Client_areas({
            client_id: body.client_id,
            area_id: body.area_id,
        });
        const res = await newClientArea.save();

        return NextResponse.json({ message: "Client Area added successfully", status: 200, data: res }, { status: 200 });
    } catch (error) {
        console.log(error);
        return NextResponse.json("Internal Server Error", { status: 500 });
    }
}

export const dynamic = "force-dynamic";

