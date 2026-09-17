import connectDB from "@/lib/mongo";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_Enquiry_Edit from "@/models/eq_enquiry_edit.model";
import Eq_Enquiry_External_Wifi_Edit from "@/models/eq_enquiry_external_wifi_edit.model";
import Eq_Enquiry_Personal_Wifi_Edit from "@/models/eq_enquriy_personal_wifi_edit.model";
import { Decimal128 } from "mongoose";
import { NextRequest, NextResponse } from "next/server";
import { canReadEnquiry, enquiryActor } from "@/lib/enquiries/completion-server";
import { projectSupportingFieldsSchema } from "@/lib/enquiries/project-classification";
import { CatalogueValidationError, validateDynamicClassification, validateDynamicSolutions } from "@/lib/enquiries/catalogue-server";
import { saveEnquirySolutions, saveFacilitySolutions } from "@/app/api/helpers/enquiry-solutions";
import Eq_camps from "@/models/eq_camps.model";
import Eq_enquiry_solutions from "@/models/eq_enquiry_solutions.model";
import { ZodError } from "zod";

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
        const actor = await enquiryActor();
        if (!actor) return NextResponse.json({ message: "Unauthorized", status: 401 }, { status: 401 });
        const body: IBody & any = await req.json();
        const enquiry: any = await Eq_enquiry.findById(body.enquiry_id);
        if (!enquiry) return NextResponse.json({ message: "Enquiry not found", status: 404 }, { status: 404 });
        if (!await canReadEnquiry(enquiry, actor)) return NextResponse.json({ message: "Forbidden", status: 403 }, { status: 403 });
        const existingSolutions: any = await Eq_enquiry_solutions.findOne({ enquiry_id: enquiry._id }).lean();
        const solutions = await validateDynamicSolutions({
            solutions_required: body.solutions_required || [], solution_other: body.solution_other || "",
            solution_details: body.solution_details || {},
            primary_solution: body.primary_solution || "", commercial_model: body.commercial_model || "To Be Determined",
        }, existingSolutions);
        await saveEnquirySolutions(enquiry._id, solutions);
        const camp: any = await Eq_camps.findById(enquiry.camp_id);
        if (camp && !camp.is_active) {
            const classification = await validateDynamicClassification(body, camp.toObject());
            const supporting = projectSupportingFieldsSchema.parse(body);
            Object.assign(camp, classification, supporting);
            await camp.save();
            await saveFacilitySolutions(camp._id, solutions);
        }
        const wifiAvailability = body.wifi_available === "Yes"
            ? true
            : body.wifi_available === "No"
                ? false
                : null;
        const enquiryEdit = new Eq_Enquiry_Edit({
            enquiry_id: body.enquiry_id,
            next_action: body.next_action,
            next_action_date: body.next_action_due,
            priority: body.priority,
            wifi_available: wifiAvailability,
            wifi_type: wifiAvailability === true ? body.wifi_type : null,
            wifi_expected_cost: wifiAvailability === false ? body.expected_monhtly_price : null,
            latitude: body.latitude,
            longitude: body.longitude,
            alert_date: body.alert_date,
            wifi_setup: wifiAvailability === true && body.wifi_type === "Other Sources" ? body.other_wifi_details : null
        });

        const savedEqEdit = await enquiryEdit.save();

        if(wifiAvailability === true){
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

        }
        await Eq_enquiry.findByIdAndUpdate(body.enquiry_id, {$set: {is_edit_req: true}});
        return NextResponse.json({message: "Edit Requested", status: 200}, {status: 200});

    }catch(err){
        if (err instanceof CatalogueValidationError) return NextResponse.json({ message: err.message, status: 400 }, { status: 400 });
        if (err instanceof ZodError) return NextResponse.json({ message: err.issues[0]?.message || "Invalid Facility details", status: 400 }, { status: 400 });
        console.log("Error while requesting for updation of Enquiry: ", err);
        return NextResponse.json({message: "Internal Server Error", status: 500}, {status: 500});
    }
}
