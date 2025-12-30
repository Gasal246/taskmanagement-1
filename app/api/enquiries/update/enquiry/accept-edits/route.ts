import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { Decimal128 } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    enquiry_id: string,
    enquiry_edit_id: string,

    latitude: string,
    longitude: string,

    wifi_available: string,
    expected_monthly_price: string,
    other_wifi_details: string,
    wifi_type: string,
        
    contractor_name: string,
    contract_start: Date,
    contract_expiry: Date,
    wifi_plan: string,
    speed_mbps: string,
    plain_points: string,
    
    provider_plan: string,
    personal_wifi_start: Date,
    personal_wifi_end: Date,
    personal_wifi_price: Decimal128,
    
    lease_expiry_due: Date,
    rent_terms: string,
    
    competition_status: string,
    competition_notes: string,
    
    priority: number,
    
    alert_date: Date,
    next_action: string,
    next_action_due: Date
}

export async function PUT(req:NextRequest){
    try{
        const body: IBody = await req.json();
        const wifiAvailability = body.wifi_available === "Yes"
            ? true
            : body.wifi_available === "No"
                ? false
                : null;

        const enquiry = await Eq_enquiry.findById(body.enquiry_id);
        enquiry.latitude = body.latitude;
        enquiry.longitude = body.longitude;

        enquiry.wifi_available = wifiAvailability;
        enquiry.wifi_type = wifiAvailability === true ? body.wifi_type : null;
        enquiry.wifi_setup = wifiAvailability === true && body.wifi_type === "Other Sources" ? body.other_wifi_details : null;

        enquiry.lease_expiry_due = body.lease_expiry_due;
        enquiry.rent_terms = body.rent_terms;

        enquiry.competition_status = body.competition_status == "Yes" ? true : false;
        enquiry.competition_notes = body.competition_notes;
        
        enquiry.priority = body.priority;

        enquiry.alert_date = body.alert_date;
        enquiry.next_action = body.next_action;
        enquiry.next_action_due = body.next_action_due;

        if(wifiAvailability === true){
            switch(body.wifi_type){
                case "Existing Contractor" : {
                     const extisting_wifi = await Eq_enquiry_wifi_external.findOne({enquiry_id: body.enquiry_id});
                     extisting_wifi.contractor_name = body.contractor_name;
                     extisting_wifi.contract_start_date = body.contract_start;
                     extisting_wifi.contract_end_date = body.contract_expiry;
                     extisting_wifi.contract_speed = body.speed_mbps;
                     extisting_wifi.contract_package = body.wifi_plan;
                     extisting_wifi.pain_points = body.plain_points;

                     await extisting_wifi.save();
                     break;
                }

                case "Personal WiFi": {
                    const personal_wifi = await Eq_enquiry_wifi_personal.findOne({enquiry_id: body.enquiry_id});
                    personal_wifi.personal_plan = body.provider_plan;
                    personal_wifi.personal_start_date = body.personal_wifi_start;
                    personal_wifi.personal_end_date = body.personal_wifi_end;
                    personal_wifi.personal_monthly_price = body.personal_wifi_price;

                    await personal_wifi.save();
                    break;
                }

                case "Other Sources": {
                    enquiry.wifi_setup = body.other_wifi_details
                    break;
                }
            }
        } else if (wifiAvailability === false) {
            enquiry.expected_wifi_cost = body.expected_monthly_price;
        } else {
            enquiry.expected_wifi_cost = null;
        }

        const existingEdit = await Eq_Enquiry_Edit.findById(body.enquiry_edit_id);
        if (existingEdit.wifi_available){
            switch(existingEdit.wifi_type){
                case "Existing Contractor": {
                    await Eq_Enquiry_External_Wifi_Edit.findOneAndDelete({enquiry_edit_id: body.enquiry_edit_id});
                    break;
                }
                case "Personal WiFi": {
                    await Eq_Enquiry_Personal_Wifi_Edit.findOneAndDelete({enquiry_edit_id: body.enquiry_edit_id});
                    break;
                }
            }
        }

        enquiry.is_edit_req = false;
        await enquiry.save();

        await existingEdit.deleteOne();
        return NextResponse.json({message: "Edits Reflected", status: 200}, {status: 200});

    }catch(err){
        console.log("Error while accepting the enquiry changes: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
