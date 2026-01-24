import { auth } from "@/auth";
import connectDB from "@/lib/mongo";
import Eq_area from "@/models/eq_area.model";
import Eq_camp_client_company from "@/models/eq_camp_client_company.model";
import Eq_camp_contacts, { IEq_camp_contacts } from "@/models/eq_camp_contacts.model";
import Eq_camp_headoffice from "@/models/eq_camp_headoffice.model";
import Eq_camp_landlord from "@/models/eq_camp_landlord.model";
import Eq_camp_realestate from "@/models/eq_camp_realestate.model";
import Eq_camps from "@/models/eq_camps.model";
import Eq_Countries from "@/models/eq_countries.model";
import Eq_enquiry from "@/models/eq_enquiries.model";
import Eq_enquiry_wifi_external from "@/models/eq_enquiry_wifi_external.model";
import Eq_enquiry_wifi_personal from "@/models/eq_enquiry_wifi_personal.model";
import Eq_region from "@/models/eq_region.model";
import { Decimal128, Types } from "mongoose";
import { NextRequest, NextResponse } from "next/server";

connectDB();

interface Body {
    country: string,
    region: string,
    province: string,
    city: string,
    area: string,
    camp: string,
    latitude: string,
    longitude: string,
    
    //enquiry modes
    area_input_mode: string,
    camp_input_mode: string,

    //New Area Req
    area_name_request: string,

    //Enquiry details
    contacts : [],
    priority: number,
    competition_status: string,
    competition_notes: string,
    followup_status: string,

    //Head Office Details
    head_office_address: string | null,
    head_office_contact: string | null,
    head_office_details: string | null,
    head_office_location: string | null,

    //Other camp details
    landlord: string | null,
    real_estate: string | null,
    client_company: string | null,

    //Camp details
    camp_name_request: string | null,
    camp_type: string | null,
    camp_capacity: string | null,
    camp_occupancy: number | null,


    //Dates
    alert_date: Date,
    lease_expiry_due: Date,
    next_action: string,
    next_action_due: Date,
    comments: string,
    rent_terms: string,

    //Wifi Details
    wifi_available: string,
    wifi_type: string | null,
    other_wifi_details: string | null,

    //No wifi
    expected_monthly_price: Decimal128 | null,

    //External Wifi
    wifi_plan: string | null,
    plain_points: string | null,
    speed_mbps: number | null,
    contract_start: Date | null,
    contract_expiry: Date | null,
    contractor_name: string | null,

    //Personal Wifi
    provider_plan: string | null,
    personal_wifi_start: Date | null,
    personal_wifi_expiry: Date | null,
    personal_wifi_price: Decimal128 | null,

    enquiry_brought_by?: string[],
    meeting_initiated_by?: string[],
    project_closed_by?: string[],
    project_managed_by?: string[],
    enquiry_user_notes?: string

}

export async function POST(req:NextRequest){
    try{

        const session:any = await auth();
        if(!session) return NextResponse.json({message: "Unauthorized Access", status: 401}, {status: 401});

        const body:Body = await req.json();
        const wifiAvailability = body.wifi_available === "Yes"
            ? true
            : body.wifi_available === "No"
                ? false
                : null;

        let areaId = body.area;
        let campId = body.camp;

        let uuid = "";
        const now = new Date();

        const day = String(now.getDate()).padStart(2, "0");
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const year = now.getFullYear();

        const country = await Eq_Countries.findById(body.country).select("country_name");
        const region = await Eq_region.findById(body.region).select("region_name");

        switch(country.country_name){
            case "KSA": {
                uuid = "KSA"
                switch(region?.region_name.toLowerCase()){
                    case "central region": {
                        uuid += "-CR";
                        break;
                    }
                    case "eastern region": {
                        uuid += "-ER";
                        break;
                    }
                    case "western region": {
                        uuid += "-WR";
                        break;
                    }
                    case "southern region": {
                        uuid += "-SR";
                        break;
                    }
                }
                break;
            }
            case "UAE": {
                uuid = "UAE"
                break;
            }
            case "Oman": {
                uuid = "OMN"
                break;
            }
        }

            const startOfDay = new Date(year, now.getMonth(), now.getDate(), 0, 0, 0, 0);
            const endOfDay = new Date(year, now.getMonth(), now.getDate(), 23, 59, 59, 999);

        const entryCount = await Eq_enquiry.countDocuments({
            createdAt: {$gte: startOfDay, $lte: endOfDay },
            country_id: body.country,
            region_id: body.region
        });

        uuid += `-${day}${month}${year}-${entryCount+1}`;

        if(body.camp){
            const is_existing = await Eq_enquiry.find({camp_id: body.camp});
            if(is_existing && is_existing.length > 0) return NextResponse.json({message: "Enquiry already added for camp", status: 400}, {status: 200})
        }

        if(body.area_input_mode == "new"){
            body.camp_input_mode = "new";
            const newArea = new Eq_area({
                country_id: body.country,
                region_id: body.region,
                province_id: body.province,
                city_id: body.city,
                area_name: body.area_name_request,
                is_active: false
            });
            const savedArea = await newArea.save();
            areaId = savedArea._id;
        }

        if(body.camp_input_mode == "new"){
            let landlordId = "";
            let realestateId = "";
            let client_companyId = ""; 
            let headOfficeId = "";
            if(body.landlord){
                const isLandlordExist = await Eq_camp_landlord.findOne({landlord_name: body.landlord?.toLowerCase().trim()});
                if(!isLandlordExist){
                    const newLandlord = new Eq_camp_landlord({
                        landlord_name: body.landlord?.toLowerCase().trim()
                    });
                    const savedLandlord = await newLandlord.save();
                    landlordId = savedLandlord._id;
                } else {
                    landlordId = isLandlordExist._id;
                }
            }

            if(body.real_estate){
                const isRealEstateExist = await Eq_camp_realestate.findOne({company_name: body.real_estate.toLowerCase().trim()});
                if(!isRealEstateExist){
                    const newRealEstate = new Eq_camp_realestate({
                        company_name: body.real_estate.toLowerCase().trim()
                    });
                    const savedRealEstate = await newRealEstate.save();
                    realestateId = savedRealEstate._id;
                } else {
                    realestateId = isRealEstateExist._id;
                }
            }

            if(body.client_company){
                let isClientCompanyExist = await Eq_camp_client_company.findOne({client_company_name: body.client_company.toLowerCase().trim()});
                if(!isClientCompanyExist){
                    const newClientCompany = new Eq_camp_client_company({
                        client_company_name: body.client_company.toLowerCase().trim()
                    });
                    const savedClientCompany = await newClientCompany.save();
                    client_companyId = savedClientCompany._id;
                } else {
                    client_companyId = isClientCompanyExist._id;
                }
            }

            if(body.head_office_contact || body.head_office_address || body.head_office_location){
                const newHeadOffice = new Eq_camp_headoffice({
                    phone: body.head_office_contact,
                    geo_location: body.head_office_location,
                    other_details: body.head_office_details,
                    address: body.head_office_address
                });
                const savedHeadOffice = await newHeadOffice.save();
                headOfficeId = savedHeadOffice._id;
            }

            const newCamp = new Eq_camps({
                area_id: areaId,
                country_id: body.country,
                region_id: body.region,
                province_id: body.province,
                city_id: body.city,
                landlord_id: landlordId || null,
                realestate_id: realestateId || null,
                client_company_id: client_companyId || null,
                headoffice_id: headOfficeId || null,
                camp_type: body.camp_type,
                camp_name: body.camp_name_request,
                camp_capacity: body.camp_capacity,
                camp_occupancy: body.camp_occupancy,
                is_active: false,
                latitude: body.latitude,
                longitude: body.longitude,
            })

            const savedCamp = await newCamp.save();
            campId = savedCamp._id;
        } else {
            await Eq_camps.findByIdAndUpdate(campId, {$set: {latitude: body.latitude, longitude: body.longitude, camp_capacity: body.camp_capacity, camp_occupancy: body.camp_occupancy}});
        }

        const newEnquiry = new Eq_enquiry({
            country_id: body.country,
            region_id: body.region,
            province_id: body.province,
            city_id: body.city,
            area_id: areaId,
            camp_id: campId,
            createdBy: session?.user?.id,
            is_active: body.area_input_mode == "existing" && body.camp_input_mode == "existing" ? true : false,
            status: body.followup_status,
            priority: body.priority,
            alert_date: body.alert_date,
            due_date: body.next_action_due,
            wifi_available: wifiAvailability,
            wifi_type: wifiAvailability === true ? body.wifi_type : null,
            expected_wifi_cost: wifiAvailability === false ? body.expected_monthly_price || null : null,
            lease_expiry_due: body.lease_expiry_due,
            competition_status: body.competition_status == "Yes" ? true : false,
            competition_notes: body.competition_notes || null,
            next_action: body.next_action,
            next_action_due: body.next_action_due,
            comments: body.comments || null,
            rent_terms: body.rent_terms,
            enquiry_uuid: uuid,
            wifi_setup: wifiAvailability === true && body.wifi_type == "Other Sources" ? body.other_wifi_details : null,
            enquiry_brought_by: Array.isArray(body.enquiry_brought_by) ? body.enquiry_brought_by : [],
            meeting_initiated_by: Array.isArray(body.meeting_initiated_by) ? body.meeting_initiated_by : [],
            project_closed_by: Array.isArray(body.project_closed_by) ? body.project_closed_by : [],
            project_managed_by: Array.isArray(body.project_managed_by) ? body.project_managed_by : [],
            enquiry_user_notes: body.enquiry_user_notes || null
        });

        const savedEnquiry = await newEnquiry.save();

        const newContacts: any[] = []
        body.contacts.forEach((x:any)=> {
            const newContact: any = {
                contact_name: x.name,
                contact_phone: x.phone,
                contact_email: x.email,
                contact_authorization: x.authority_level,
                contact_designation: x.designation,
                is_decision_maker: x.is_decision_maker == "Yes" ? true : false,
                camp_id: campId,
                enquiry_id: savedEnquiry._id
            };
            newContacts.push(newContact);
        });

        if(newContacts.length > 0){
            await Eq_camp_contacts.insertMany(newContacts);
        };

        if(wifiAvailability === true){
            switch(body.wifi_type){
                case "Existing Contractor": {
                    const newExistingWifi = new Eq_enquiry_wifi_external({
                        camp_id: campId,
                        enquiry_id: savedEnquiry._id,
                        contractor_name: body.contractor_name,
                        contract_start_date: body.contract_start,
                        contract_end_date: body.contract_expiry,
                        contract_speed: body.speed_mbps,
                        contract_package: body.wifi_plan,
                        plain_points: body.plain_points
                    });

                    await newExistingWifi.save();
                    break;
                }
                
                case "Personal WiFi": {
                    const newPersonalWifi = new Eq_enquiry_wifi_personal({
                        camp_id: campId,
                        enquiry_id: savedEnquiry._id,
                        personal_plan: body.provider_plan,
                        personal_start_date: body.personal_wifi_start,
                        personal_end_date: body.personal_wifi_expiry,
                        personal_monthly_price: body.personal_wifi_price
                    });
                    await newPersonalWifi.save();
                }
            }
        }

        if(savedEnquiry._id){
            return NextResponse.json({message:"Enquiry Created",enquiry_id: savedEnquiry?._id , status: 201}, {status: 201});
        }
        return NextResponse.json({message: "Failed to create new enquiry", status: 400}, {status: 400})

    }catch(err){
        console.log("Error while adding new enquiry: ", err);
        return NextResponse.json({message:"Internal server error", status: 500}, {status: 500});
    }
}
