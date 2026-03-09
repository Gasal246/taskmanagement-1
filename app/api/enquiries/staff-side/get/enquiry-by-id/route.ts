import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import { NextRequest, NextResponse } from "next/server";
import "@/models/eq_countries.model";
import "@/models/eq_region.model";
import "@/models/eq_province.model";
import "@/models/eq_city.model";
import "@/models/eq_area.model";
import "@/models/eq_camps.model";
import "@/models/users.model";

connectDB();

export async function GET(req:NextRequest){
    try{
        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Unauthorized access", status: 401}, {status: 401});

        const {searchParams} = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");

        const enquiry:any = await Eq_enquiry.findById(enquiry_id)
        .populate("country_id")
        .populate("region_id")
        .populate("province_id")
        .populate("city_id")
        .populate("area_id")
        .populate("camp_id")
        .populate("createdBy")
        .lean();

        const contacts = await Eq_camp_contacts.find({enquiry_id: enquiry_id}).limit(1);
        const head_office = await Eq_camp_headoffice.findById(enquiry?.camp_id?.headoffice_id).limit(1);

        let external_provider = null;
        let personal_provider = null;
        if(enquiry?.wifi_type == "Existing Contractor"){
            external_provider = await Eq_enquiry_wifi_external.findOne({enquiry_id: enquiry?._id});
        } else if(enquiry?.wifi_type == "Personal WiFi"){
            personal_provider = await Eq_enquiry_wifi_personal.findOne({enquiry_id: enquiry?._id});
        }

        const isAssigned:any = await Eq_enquiry_histories.findOne({enquiry_id: enquiry_id}).sort({step_number: -1}).lean();

        const assignedList = Array.isArray(isAssigned?.assigned_to)
            ? isAssigned.assigned_to
            : isAssigned?.assigned_to
                ? [isAssigned.assigned_to]
                : [];
        const canForward = assignedList.some((id: any) => String(id) === String(session?.user?.id));
        const broughtByList = Array.isArray(enquiry?.enquiry_brought_by)
            ? enquiry.enquiry_brought_by
            : [];
        const isCreatedByCurrentUser = String(enquiry?.createdBy?._id ?? enquiry?.createdBy ?? "") === String(session?.user?.id);
        const canEdit = isCreatedByCurrentUser
            || canForward
            || broughtByList.some((id: any) => String(id) === String(session?.user?.id));

        return NextResponse.json({enquiry, contacts, head_office, external_provider, personal_provider, canForward, canEdit, status: 200}, {status: 200});

    }catch(err){
        console.log("Error while getting Enquiry By ID: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}
