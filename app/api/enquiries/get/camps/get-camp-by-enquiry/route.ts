import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");
        const is_new = searchParams.get("is_new");

        console.log("enquiry_id: ", enquiry_id);
        console.log("is_new?: ", is_new);
        
    
        switch (is_new) {
            case "true": {
                const camp_id: any = await Eq_enquiry.findById(enquiry_id).select("camp_id").lean();
                const camp = await Eq_camps.findById(camp_id?.camp_id).lean();

                return NextResponse.json({ camp, status: 200 }, { status: 200 });
                break;
            }
            case "false": {
                const area_id: any = await Eq_enquiry.findById(enquiry_id).select("area_id").lean();
                const camps_in_area = await Eq_camps.find({ area_id: area_id?.area_id, is_active: true }).select("camp_name");

                return NextResponse.json({ camps: camps_in_area, status: 200 }, { status: 200 });
                break;
            }
        }

        return NextResponse.json({message: "Wrong inputs", status: 400}, {status: 200});
    } catch (err) {
        console.log("Error while getting camps by enquiry: ", err);
        return NextResponse.json({ message: "Internal Server Error", status: 500 }, { status: 500 });
    }
}