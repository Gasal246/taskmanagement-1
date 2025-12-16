import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { Decimal128 } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface IBody {
    enquiry_id: string,

    latitude: string,
    longitude: string,

    wifi_available: string,
    expected_monhtly_price: Decimal128,
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
};

export async function PUT(req:NextRequest){
    try{
        const body: IBody = await req.json();
        const enquiryEdit = new Eq_Enquiry_Edit({
            enquiry_id: body.enquiry_id,
            next_action: body.next_action,
            next_action_date: body.next_action_due,
            priority: body.priority,
            wifi_available: body.wifi_available == "Yes" ? true : false,
            wifi_type: body.wifi_available == "Yes" ? body.wifi_type : null,
            wifi_expected_cost: body.wifi_available == "No" ? body.expected_monhtly_price : null,
            latitude: body.latitude,
            longitude: body.longitude,
            alert_date: body.alert_date,
            wifi_setup: body.other_wifi_details
        });

        const savedEqEdit = await enquiryEdit.save();

        if(body.wifi_available == "Yes"){
            switch(body.wifi_type){
                case "Existing Contractor": {
                    const externalEdit = new Eq_Enquiry_External_Wifi_Edit({
                        enquiry_id: body.enquiry_id,
                        enquiry_edit_id: savedEqEdit._id,
                        contractor_name: body.contractor_name,
                        contract_start_date: body.contract_start,
                        contract_end_date: body.contract_expiry,
                        contract_package: body.wifi_plan,
                        contract_speed: body.speed_mbps
                    });
                    await externalEdit.save();
                    break;
                }
                
                case "Personal WiFi": {
                    const personalEdit = new Eq_Enquiry_Personal_Wifi_Edit({
                        enquiry_id: body.enquiry_id,
                        enquiry_edit_id: savedEqEdit._id,
                        personal_plan: body.provider_plan,
                        personal_start_date: body.personal_wifi_start,
                        personal_end_date: body.personal_wifi_end,
                        personal_monthly_price: body.personal_wifi_price
                    });

                    await personalEdit.save();
                    break;
                }
            }

            await Eq_enquiry.findByIdAndUpdate(body.enquiry_id, {$set: {is_edit_req: true}});

            return NextResponse.json({message: "Edit Requested", status: 200}, {status: 200});
        }

    }catch(err){
        console.log("Error while requesting for updation of Enquiry: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}