import connectDB from "@/lib/mongo";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_contacts from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_access from "@/models/eq_enquiry_access.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_enquiry_histories from "@/models/eq_enquiry_histories";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { message } from "antd";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function DELETE(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const camp_id:any = searchParams.get("camp_id");

        const isEnquiryAdded:any = await Eq_enquiry.findOne({camp_id: camp_id}).lean();
        if(isEnquiryAdded){
            await Eq_enquiry_wifi_external.deleteOne({enquiry_id: isEnquiryAdded._id});
            await Eq_enquiry_wifi_personal.deleteOne({enquiry_id: isEnquiryAdded._id});
            await Eq_enquiry_histories.deleteMany({enquiry_id: isEnquiryAdded._id});
            await Eq_enquiry_access.deleteMany({enquiry_id: isEnquiryAdded._id});
            await Eq_Enquiry_External_Wifi_Edit.deleteOne({enquiry_id: isEnquiryAdded._id});
            await Eq_Enquiry_Personal_Wifi_Edit.deleteOne({enquiry_id: isEnquiryAdded._id});
            await Eq_Enquiry_Edit.deleteOne({enquiry_id: isEnquiryAdded._id});
            await Eq_enquiry.findByIdAndDelete(isEnquiryAdded._id);
        }

        await Eq_camp_client_company.deleteOne({camp_id: camp_id});
        await Eq_camp_landlord.deleteOne({camp_id: camp_id});
        await Eq_camp_realestate.deleteOne({camp_id: camp_id});
        await Eq_camp_headoffice.deleteOne({camp_id: camp_id});
        await Eq_camp_contacts.deleteMany({camp_id: camp_id});
        await Eq_camps.findByIdAndDelete(camp_id);

        return NextResponse.json({message: "Camp and all it's contents removed", status: 200}, {status: 200});


    }catch(err){
        console.log("Error while deleting Camp: ", err);
        return NextResponse.json({message:"Internal Server Error", status: 500}, {status: 500});
    }
}