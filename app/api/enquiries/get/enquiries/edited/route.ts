import connectDB from "@/lib/mongo";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { NextRequest, NextResponse } from "next/server";

connectDB();

export async function GET(req:NextRequest){
    try{
        const {searchParams} = new URL(req.url);
        const enquiry_id = searchParams.get("enquiry_id");
        if(!enquiry_id) return NextResponse.json({message: "Please provide enquiry id", status: 400}, {status: 200});

        const edited_enquiry:any = await Eq_Enquiry_Edit.findOne({enquiry_id: enquiry_id}).lean();
        if(edited_enquiry?.wifi_available){
            switch(edited_enquiry?.wifi_type){
                case "Existing Contractor": {
                    const existing_contractor = await Eq_Enquiry_External_Wifi_Edit.findOne({enquiry_edit_id: edited_enquiry._id}).lean();
                    return NextResponse.json({edited_enquiry, existing_contractor, status: 200}, {status: 200});
                    break;
                }

                case "Personal WiFi": {
                    const personal_wifi = await Eq_Enquiry_Personal_Wifi_Edit.findOne({enquiry_edit_id: edited_enquiry._id}).lean();
                    return NextResponse.json({edited_enquiry, personal_wifi, status: 200}, {status: 200});
                    break;
                }
            }
        }

        return NextResponse.json({edited_enquiry, status: 200}, {status: 200});
        
    }catch(err){
        console.log("Error while getting the edited request: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}