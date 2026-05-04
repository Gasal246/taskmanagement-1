import { getCampVisitedStatusFromEnquiryStatus } from "@/lib/enquiries/camp-visited-status";
import connectDB from "@/lib/mongo";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    camp_name: string,
    camp_capacity: string,
    camp_occupancy: number,
    camp_type: string,
    camp_id: string,
    enquiry_id: string,
    latitude: string,
    longitude: string
}

export async function PUT(req: NextRequest){
    try{
        const body: IBody = await req.json();
        const enquiry = await Eq_enquiry.findById(body.enquiry_id);
        const visitedStatus = getCampVisitedStatusFromEnquiryStatus(enquiry?.status) || "Just Added";
        const campToEdit = await Eq_camps.findByIdAndUpdate(body.camp_id, {$set: {
            camp_name: body.camp_name,
            camp_capacity: body.camp_capacity,
            camp_occupancy: body.camp_occupancy,
            camp_type: body.camp_type,
            is_active: true,
            visited_status: visitedStatus,
            country_id: enquiry?.country_id,
            region_id: enquiry?.region_id,
            province_id: enquiry?.province_id,
            city_id: enquiry?.city_id,
            latitude: body?.latitude,
            longitude: body?.longitude
        }});

        enquiry.is_active = true;

        await enquiry.save();
        
        return NextResponse.json({message: "camp updated", status: 200}, {status: 200});

    }catch(err){
        console.log("Error while updating camp: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
