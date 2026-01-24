import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";
import "@/models/eq_area.model";
import "@/models/eq_camps.model";
import "@/models/users.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");
        if(!enquiry_id) return NextResponse.json({message:"Enquiry ID Missing", status:401}, {status: 401});

        const enquiry = await Eq_enquiry.findById(enquiry_id)
            .populate("country_id")
            .populate("region_id")
            .populate("province_id")
            .populate("city_id")
            .populate("area_id")
            .populate("camp_id")
            .populate("createdBy")
            .populate({ path: "enquiry_brought_by", select: "name email", strictPopulate: false })
            .populate({ path: "meeting_initiated_by", select: "name email", strictPopulate: false })
            .populate({ path: "project_closed_by", select: "name email", strictPopulate: false })
            .populate({ path: "project_managed_by", select: "name email", strictPopulate: false });

        const contacts = await Eq_camp_contacts.find({enquiry_id: enquiry_id}).limit(1);
        const head_office = await Eq_camp_headoffice.findById(enquiry?.camp_id?.headoffice_id).limit(1);
        
        let external_provider = null;
        let personal_provider = null;
        if(enquiry?.wifi_type == "Existing Contractor"){
            external_provider = await Eq_enquiry_wifi_external.findOne({enquiry_id: enquiry?._id});
        } else if(enquiry?.wifi_type == "Personal WiFi"){
            personal_provider = await Eq_enquiry_wifi_personal.findOne({enquiry_id: enquiry?._id});
        }

        const assigned = await Eq_enquiry_histories.findOne({enquiry_id}).populate({
            path: "assigned_to",
            select: "name"
        }).sort({step_number: -1}).lean();

        return NextResponse.json({enquiry, contacts, head_office, external_provider, personal_provider, assigned, status: 200}, {status: 200});
    }catch(err){
        console.log("Error while getting enquiry by Id: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}
